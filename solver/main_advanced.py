#!/usr/bin/env python3
"""FastAPI server for advanced timetable solving"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import logging
from collections import defaultdict

from advanced_solver import ConstraintSolver
from recommendations import generate_slot_recommendations

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="IIT KGP Timetable Solver",
    description="Advanced constraint-based timetable generation",
    version="2.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Teacher(BaseModel):
    id: str
    code: str
    name: str
    max_per_day: int = 3
    max_per_week: int = 12
    prefs: Dict[str, Any] = {}

class Room(BaseModel):
    id: str
    code: str
    capacity: int
    kind: str
    tags: List[str] = []

class Slot(BaseModel):
    id: str
    code: str
    occ: int
    day: str
    start_time: str
    end_time: str
    cluster: Optional[str] = None
    is_lab: bool = False

class Course(BaseModel):
    id: str
    code: str
    name: str
    L: int = 0
    T: int = 0
    P: int = 0

class Section(BaseModel):
    id: str
    program: str
    year: int
    name: str

class Offering(BaseModel):
    id: str
    course_id: str
    section_id: str
    teacher_id: Optional[str]
    expected_size: int
    needs: List[str] = []
    course: Optional[Course] = None
    section: Optional[Section] = None
    teacher: Optional[Teacher] = None

class Availability(BaseModel):
    teacher_id: str
    slot_id: str
    can_teach: bool = True

class Assignment(BaseModel):
    offering_id: str
    slot_id: str
    room_id: str
    kind: str
    is_locked: bool = False

class SolverInput(BaseModel):
    teachers: List[Teacher]
    rooms: List[Room]
    slots: List[Slot]
    offerings: List[Offering]
    availability: List[Availability]
    locked_assignments: List[Assignment] = []

class SolverOutput(BaseModel):
    success: bool
    assignments: List[Assignment]
    stats: Dict[str, Any]
    warnings: List[Dict[str, Any]] = []

class RecommendationOutput(BaseModel):
    recommendations: List[Dict[str, Any]]
    stats: Dict[str, Any]

@app.get("/")
async def root():
    return {
        "message": "IIT KGP Timetable Solver API",
        "version": "2.0",
        "status": "running",
        "features": [
            "Constraint-based solving",
            "Teacher preferences",
            "Room capacity optimization",
            "Lab slot clustering",
            "Schedule optimization",
            "Conflict detection"
        ]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "solver": "advanced",
        "version": "2.0"
    }

@app.post("/solve", response_model=SolverOutput)
async def solve_timetable(input_data: SolverInput):
    """Generate a complete timetable from scratch"""
    try:
        logger.info(f"Received solve request with {len(input_data.offerings)} offerings")
        
        # Convert Pydantic models to dicts
        data = input_data.dict()
        
        # Create solver instance
        solver = ConstraintSolver(data)
        
        # Solve
        result = solver.solve()
        
        logger.info(f"Solved with {len(result['assignments'])} assignments")
        
        return result
        
    except Exception as e:
        logger.error(f"Solver error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Solver error: {str(e)}")

@app.post("/reoptimize", response_model=SolverOutput)
async def reoptimize_timetable(input_data: SolverInput):
    """Reoptimize existing timetable with current assignments as starting point"""
    try:
        logger.info("Received reoptimize request")
        
        # For now, solve from scratch with locked assignments
        # In future, could implement incremental optimization
        return await solve_timetable(input_data)
        
    except Exception as e:
        logger.error(f"Reoptimize error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Reoptimize error: {str(e)}")

@app.post("/validate")
async def validate_schedule(input_data: SolverInput):
    """Validate a schedule for conflicts and constraint violations"""
    try:
        data = input_data.dict()
        
        conflicts = []
        warnings = []
        
        # Check teacher conflicts
        teacher_slots = defaultdict(set)
        for assignment in data.get('assignments', []):
            offering = next((o for o in data['offerings'] 
                           if o['id'] == assignment['offering_id']), None)
            if offering and offering.get('teacher_id'):
                teacher_id = offering['teacher_id']
                slot_id = assignment['slot_id']
                
                if slot_id in teacher_slots[teacher_id]:
                    conflicts.append({
                        'type': 'teacher_conflict',
                        'teacher_id': teacher_id,
                        'slot_id': slot_id
                    })
                teacher_slots[teacher_id].add(slot_id)
        
        # Check room conflicts
        room_slots = defaultdict(set)
        for assignment in data.get('assignments', []):
            room_id = assignment['room_id']
            slot_id = assignment['slot_id']
            
            if slot_id in room_slots[room_id]:
                conflicts.append({
                    'type': 'room_conflict',
                    'room_id': room_id,
                    'slot_id': slot_id
                })
            room_slots[room_id].add(slot_id)
        
        return {
            'valid': len(conflicts) == 0,
            'conflicts': conflicts,
            'warnings': warnings
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")

@app.post("/recommendations", response_model=RecommendationOutput)
async def get_recommendations(data: Dict[str, Any]):
    """Get recommendations for where to move a specific class"""
    try:
        recommendations = generate_slot_recommendations(data)
        
        return {
            'recommendations': recommendations,
            'stats': {
                'total_recommendations': len(recommendations)
            }
        }
        
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)