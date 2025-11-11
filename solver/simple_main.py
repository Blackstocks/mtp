#!/usr/bin/env python3
"""Simple FastAPI server for timetable solving"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import uvicorn

from simple_solver import SimpleSolver

app = FastAPI(title="Simple Timetable Solver")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SolverInput(BaseModel):
    teachers: List[Dict[str, Any]]
    rooms: List[Dict[str, Any]]
    slots: List[Dict[str, Any]]
    offerings: List[Dict[str, Any]]
    availability: List[Dict[str, Any]]
    locked_assignments: List[Dict[str, Any]] = []

class SolverOutput(BaseModel):
    success: bool
    assignments: List[Dict[str, Any]]
    stats: Dict[str, Any]

@app.get("/")
async def root():
    return {"message": "Simple Timetable Solver API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "solver": "simple"}

@app.post("/solve", response_model=SolverOutput)
async def solve_timetable(input_data: SolverInput):
    try:
        # Convert Pydantic model to dict
        data = input_data.dict()
        
        # Create solver instance
        solver = SimpleSolver(data)
        
        # Solve
        result = solver.solve()
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solver error: {str(e)}")

@app.post("/reoptimize", response_model=SolverOutput)
async def reoptimize_timetable(input_data: SolverInput):
    # For now, just solve from scratch
    return await solve_timetable(input_data)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)