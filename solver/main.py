from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging
from model import TimetableSolver, SolverInput, SolverOutput

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Timetable Solver API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RecommendationRequest(BaseModel):
    offering_id: str
    kind: str
    teachers: List[dict]
    rooms: List[dict]
    slots: List[dict]
    offerings: List[dict]
    availability: List[dict]
    current_assignments: List[dict] = []

class RecommendationResponse(BaseModel):
    slot_id: str
    room_id: str
    penalty_delta: float
    reasons: List[str]
    swaps: Optional[List[dict]] = None

@app.get("/health")
async def health_check():
    return {"status": "healthy", "solver": "or-tools"}

@app.post("/solve", response_model=SolverOutput)
async def solve_timetable(input_data: SolverInput):
    try:
        logger.info(f"Solving timetable with {len(input_data.offerings)} offerings")
        solver = TimetableSolver(input_data)
        result = solver.solve()
        logger.info(f"Solver completed with {len(result.assignments)} assignments")
        return result
    except Exception as e:
        logger.error(f"Solver error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reoptimize", response_model=SolverOutput)
async def reoptimize_timetable(input_data: SolverInput):
    try:
        logger.info(f"Re-optimizing with {len(input_data.locked_assignments)} locked assignments")
        solver = TimetableSolver(input_data)
        result = solver.solve()
        logger.info(f"Re-optimization completed with {len(result.assignments)} assignments")
        return result
    except Exception as e:
        logger.error(f"Re-optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommendations", response_model=List[RecommendationResponse])
async def get_recommendations(request: RecommendationRequest):
    try:
        recommendations = []
        offering = next(o for o in request.offerings if o['id'] == request.offering_id)
        teacher = offering.get('teacher')
        
        # Find valid slots based on teacher availability
        valid_slots = []
        if teacher:
            teacher_id = teacher['id']
            available_slot_ids = set(
                a['slot_id'] for a in request.availability 
                if a['teacher_id'] == teacher_id and a['can_teach']
            )
            valid_slots = [s for s in request.slots if s['id'] in available_slot_ids]
        else:
            valid_slots = request.slots
        
        # Filter by slot type
        if request.kind == 'P':
            valid_slots = [s for s in valid_slots if s['is_lab']]
        else:
            valid_slots = [s for s in valid_slots if not s['is_lab']]
        
        # Find valid rooms
        valid_rooms = []
        expected_size = offering.get('expected_size', 60)
        
        if request.kind == 'P':
            valid_rooms = [r for r in request.rooms 
                         if r['kind'] == 'LAB' and r['capacity'] >= expected_size]
        else:
            valid_rooms = [r for r in request.rooms 
                         if r['kind'] == 'CLASS' and r['capacity'] >= expected_size]
        
        # Check each combination
        for slot in valid_slots[:10]:  # Limit to top 10
            for room in valid_rooms[:5]:  # Limit to top 5
                # Check for conflicts
                conflicts = []
                penalty = 0
                
                # Check teacher conflicts
                if teacher:
                    teacher_conflict = any(
                        a['slot_id'] == slot['id'] and 
                        a['offering_id'] != request.offering_id
                        for a in request.current_assignments
                        if any(o['id'] == a['offering_id'] and 
                              o.get('teacher', {}).get('id') == teacher['id']
                              for o in request.offerings)
                    )
                    if teacher_conflict:
                        conflicts.append("Teacher has another class at this time")
                        continue
                
                # Check room conflicts
                room_conflict = any(
                    a['slot_id'] == slot['id'] and 
                    a['room_id'] == room['id']
                    for a in request.current_assignments
                )
                if room_conflict:
                    conflicts.append("Room is occupied at this time")
                    continue
                
                # Check section conflicts
                section_id = offering['section']['id']
                section_conflict = any(
                    a['slot_id'] == slot['id'] and
                    any(o['id'] == a['offering_id'] and 
                        o['section']['id'] == section_id
                        for o in request.offerings)
                    for a in request.current_assignments
                )
                if section_conflict:
                    conflicts.append("Section has another class at this time")
                    continue
                
                # Calculate penalties
                reasons = []
                
                # Teacher preferences
                if teacher and teacher.get('prefs'):
                    prefs = teacher['prefs']
                    if prefs.get('avoid_8am') and slot['start_time'] == '08:00':
                        penalty += 5
                        reasons.append("Teacher prefers to avoid 8am")
                    
                    if prefs.get('avoid_late') and slot['start_time'] >= '17:00':
                        penalty += 5
                        reasons.append("Teacher prefers to avoid late hours")
                    
                    prefer_days = prefs.get('prefer_days', [])
                    if prefer_days and slot['day'] not in prefer_days:
                        penalty += 2
                        reasons.append(f"Teacher prefers {', '.join(prefer_days)}")
                
                if not reasons:
                    reasons.append("Good fit - no preference violations")
                
                recommendations.append(RecommendationResponse(
                    slot_id=slot['id'],
                    room_id=room['id'],
                    penalty_delta=penalty,
                    reasons=reasons
                ))
        
        # Sort by penalty (lower is better)
        recommendations.sort(key=lambda x: x.penalty_delta)
        
        return recommendations[:10]  # Return top 10
        
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)