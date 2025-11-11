from ortools.sat.python import cp_model
from typing import List, Dict, Optional, Tuple, Set
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

class SolverInput(BaseModel):
    teachers: List[dict]
    rooms: List[dict]
    slots: List[dict]
    offerings: List[dict]
    availability: List[dict]
    locked_assignments: List[dict] = []

class SolverOutput(BaseModel):
    assignments: List[dict]
    objective: float
    penalties: dict
    skipped: List[dict]

class TimetableSolver:
    def __init__(self, input_data: SolverInput):
        self.input = input_data
        self.model = cp_model.CpModel()
        self.variables = {}
        self.lab_cluster_vars = {}
        
        # Create lookup dictionaries
        self.teacher_map = {t['id']: t for t in input_data.teachers}
        self.room_map = {r['id']: r for r in input_data.rooms}
        self.slot_map = {s['id']: s for s in input_data.slots}
        self.offering_map = {o['id']: o for o in input_data.offerings}
        
        # Group slots by cluster
        self.clusters = {}
        for slot in input_data.slots:
            if slot['cluster']:
                if slot['cluster'] not in self.clusters:
                    self.clusters[slot['cluster']] = []
                self.clusters[slot['cluster']].append(slot['id'])
        
        # Create availability lookup
        self.availability_set = set()
        for avail in input_data.availability:
            if avail['can_teach']:
                self.availability_set.add((avail['teacher_id'], avail['slot_id']))
        
        # Group offerings by section and teacher
        self.section_offerings = {}
        self.teacher_offerings = {}
        for offering in input_data.offerings:
            section_id = offering['section']['id']
            if section_id not in self.section_offerings:
                self.section_offerings[section_id] = []
            self.section_offerings[section_id].append(offering['id'])
            
            if offering['teacher']:
                teacher_id = offering['teacher']['id']
                if teacher_id not in self.teacher_offerings:
                    self.teacher_offerings[teacher_id] = []
                self.teacher_offerings[teacher_id].append(offering['id'])
    
    def create_variables(self):
        # Decision variables X[offering_id, slot_id, room_id, kind]
        for offering in self.input.offerings:
            offering_id = offering['id']
            course = offering['course']
            
            # Create variables for each type of session
            for kind, count in [('L', course['L']), ('T', course['T']), ('P', course['P'])]:
                if count > 0:
                    if kind == 'P':
                        # For practicals, create cluster variables
                        for cluster_name, slot_ids in self.clusters.items():
                            # Only consider lab rooms for practicals
                            lab_rooms = [r for r in self.input.rooms if r['kind'] == 'LAB']
                            for room in lab_rooms:
                                var_name = f"Y_{offering_id}_{cluster_name}_{room['id']}"
                                self.lab_cluster_vars[var_name] = self.model.NewBoolVar(var_name)
                    else:
                        # For lectures and tutorials
                        for slot in self.input.slots:
                            if not slot['is_lab']:  # Only non-lab slots
                                for room in self.input.rooms:
                                    if room['kind'] == 'CLASS':  # Only classrooms
                                        var_name = f"X_{offering_id}_{slot['id']}_{room['id']}_{kind}"
                                        self.variables[var_name] = self.model.NewBoolVar(var_name)
    
    def add_hard_constraints(self):
        # 1. Coverage constraints - ensure each offering gets required L, T, P
        for offering in self.input.offerings:
            offering_id = offering['id']
            course = offering['course']
            
            # Lecture coverage
            if course['L'] > 0:
                lecture_vars = []
                for var_name, var in self.variables.items():
                    if var_name.startswith(f"X_{offering_id}_") and var_name.endswith("_L"):
                        lecture_vars.append(var)
                if lecture_vars:
                    self.model.Add(sum(lecture_vars) == course['L'])
            
            # Tutorial coverage
            if course['T'] > 0:
                tutorial_vars = []
                for var_name, var in self.variables.items():
                    if var_name.startswith(f"X_{offering_id}_") and var_name.endswith("_T"):
                        tutorial_vars.append(var)
                if tutorial_vars:
                    self.model.Add(sum(tutorial_vars) == course['T'])
            
            # Practical coverage - exactly one cluster
            if course['P'] > 0:
                cluster_vars = []
                for var_name, var in self.lab_cluster_vars.items():
                    if var_name.startswith(f"Y_{offering_id}_"):
                        cluster_vars.append(var)
                if cluster_vars:
                    self.model.Add(sum(cluster_vars) == 1)
        
        # 2. Teacher availability constraints
        for offering in self.input.offerings:
            if not offering['teacher']:
                continue
                
            offering_id = offering['id']
            teacher_id = offering['teacher']['id']
            
            for var_name, var in self.variables.items():
                if var_name.startswith(f"X_{offering_id}_"):
                    parts = var_name.split("_")
                    slot_id = parts[2]
                    if (teacher_id, slot_id) not in self.availability_set:
                        self.model.Add(var == 0)
        
        # 3. Room capacity constraints
        for offering in self.input.offerings:
            offering_id = offering['id']
            expected_size = offering.get('expected_size', 60)
            
            for var_name, var in self.variables.items():
                if var_name.startswith(f"X_{offering_id}_"):
                    parts = var_name.split("_")
                    room_id = parts[3]
                    room = self.room_map[room_id]
                    if room['capacity'] < expected_size:
                        self.model.Add(var == 0)
        
        # 4. No double-booking for teachers across different offerings
        for teacher_id, offering_ids in self.teacher_offerings.items():
            if len(offering_ids) < 2:
                continue
                
            for slot in self.input.slots:
                slot_id = slot['id']
                teacher_slot_vars = []
                
                for offering_id in offering_ids:
                    for var_name, var in self.variables.items():
                        if var_name.startswith(f"X_{offering_id}_{slot_id}_"):
                            teacher_slot_vars.append(var)
                    
                    # Also check lab clusters containing this slot
                    for cluster_name, cluster_slots in self.clusters.items():
                        if slot_id in cluster_slots:
                            for var_name, var in self.lab_cluster_vars.items():
                                if var_name.startswith(f"Y_{offering_id}_{cluster_name}_"):
                                    teacher_slot_vars.append(var)
                
                if teacher_slot_vars:
                    self.model.Add(sum(teacher_slot_vars) <= 1)
        
        # 5. No section conflicts - a section can only be in one place at a time
        for section_id, offering_ids in self.section_offerings.items():
            for slot in self.input.slots:
                slot_id = slot['id']
                section_slot_vars = []
                
                for offering_id in offering_ids:
                    for var_name, var in self.variables.items():
                        if var_name.startswith(f"X_{offering_id}_{slot_id}_"):
                            section_slot_vars.append(var)
                    
                    # Check lab clusters
                    for cluster_name, cluster_slots in self.clusters.items():
                        if slot_id in cluster_slots:
                            for var_name, var in self.lab_cluster_vars.items():
                                if var_name.startswith(f"Y_{offering_id}_{cluster_name}_"):
                                    section_slot_vars.append(var)
                
                if section_slot_vars:
                    self.model.Add(sum(section_slot_vars) <= 1)
        
        # 6. Room single occupancy per slot
        for slot in self.input.slots:
            slot_id = slot['id']
            for room in self.input.rooms:
                room_id = room['id']
                room_slot_vars = []
                
                for var_name, var in self.variables.items():
                    if f"_{slot_id}_{room_id}_" in var_name:
                        room_slot_vars.append(var)
                
                # Check lab clusters
                for cluster_name, cluster_slots in self.clusters.items():
                    if slot_id in cluster_slots:
                        for var_name, var in self.lab_cluster_vars.items():
                            if f"_{cluster_name}_{room_id}" in var_name:
                                room_slot_vars.append(var)
                
                if room_slot_vars:
                    self.model.Add(sum(room_slot_vars) <= 1)
        
        # 7. Handle locked assignments
        for locked in self.input.locked_assignments:
            offering_id = locked['offering_id']
            slot_id = locked['slot_id']
            room_id = locked['room_id']
            kind = locked['kind']
            
            var_name = f"X_{offering_id}_{slot_id}_{room_id}_{kind}"
            if var_name in self.variables:
                self.model.Add(self.variables[var_name] == 1)
    
    def add_soft_objectives(self):
        penalties = []
        
        # 1. Teacher preferences
        teacher_pref_penalties = []
        for offering in self.input.offerings:
            if not offering['teacher']:
                continue
                
            offering_id = offering['id']
            teacher = offering['teacher']
            prefs = teacher.get('prefs', {})
            
            for var_name, var in self.variables.items():
                if var_name.startswith(f"X_{offering_id}_"):
                    parts = var_name.split("_")
                    slot_id = parts[2]
                    slot = self.slot_map[slot_id]
                    
                    # Avoid 8am preference
                    if prefs.get('avoid_8am') and slot['start_time'] == '08:00':
                        teacher_pref_penalties.append(var * 5)
                    
                    # Avoid late preference
                    if prefs.get('avoid_late') and slot['start_time'] >= '17:00':
                        teacher_pref_penalties.append(var * 5)
                    
                    # Preferred days
                    prefer_days = prefs.get('prefer_days', [])
                    if prefer_days and slot['day'] not in prefer_days:
                        teacher_pref_penalties.append(var * 2)
        
        # 2. Max classes per day/week constraints
        max_per_day_penalties = []
        max_per_week_penalties = []
        
        for teacher in self.input.teachers:
            teacher_id = teacher['id']
            max_per_day = teacher.get('max_per_day', 3)
            max_per_week = teacher.get('max_per_week', 12)
            
            if teacher_id not in self.teacher_offerings:
                continue
            
            # Per day constraints
            for day in ['MON', 'TUE', 'WED', 'THU', 'FRI']:
                day_slots = [s for s in self.input.slots if s['day'] == day]
                day_vars = []
                
                for slot in day_slots:
                    for offering_id in self.teacher_offerings[teacher_id]:
                        for var_name, var in self.variables.items():
                            if var_name.startswith(f"X_{offering_id}_{slot['id']}_"):
                                day_vars.append(var)
                
                if len(day_vars) > max_per_day:
                    excess = self.model.NewIntVar(0, len(day_vars), f"excess_day_{teacher_id}_{day}")
                    self.model.Add(excess >= sum(day_vars) - max_per_day)
                    max_per_day_penalties.append(excess * 10)
            
            # Per week constraints
            week_vars = []
            for offering_id in self.teacher_offerings[teacher_id]:
                for var_name, var in self.variables.items():
                    if var_name.startswith(f"X_{offering_id}_"):
                        week_vars.append(var)
            
            if len(week_vars) > max_per_week:
                excess = self.model.NewIntVar(0, len(week_vars), f"excess_week_{teacher_id}")
                self.model.Add(excess >= sum(week_vars) - max_per_week)
                max_per_week_penalties.append(excess * 20)
        
        # 3. Minimize gaps in section schedules
        gap_penalties = []
        for section_id, offering_ids in self.section_offerings.items():
            for day in ['MON', 'TUE', 'WED', 'THU', 'FRI']:
                day_slots = sorted([s for s in self.input.slots if s['day'] == day], 
                                 key=lambda x: x['start_time'])
                
                if len(day_slots) < 2:
                    continue
                
                for i in range(len(day_slots) - 1):
                    slot1 = day_slots[i]
                    slot2 = day_slots[i + 1]
                    
                    # Check if there's a gap
                    slot1_occupied = []
                    slot2_occupied = []
                    
                    for offering_id in offering_ids:
                        for var_name, var in self.variables.items():
                            if var_name.startswith(f"X_{offering_id}_{slot1['id']}_"):
                                slot1_occupied.append(var)
                            if var_name.startswith(f"X_{offering_id}_{slot2['id']}_"):
                                slot2_occupied.append(var)
                    
                    if slot1_occupied and slot2_occupied:
                        # Penalize if slot1 is occupied but slot2 is not (gap)
                        gap_var = self.model.NewBoolVar(f"gap_{section_id}_{day}_{i}")
                        self.model.Add(sum(slot1_occupied) >= 1).OnlyEnforceIf(gap_var)
                        self.model.Add(sum(slot2_occupied) == 0).OnlyEnforceIf(gap_var)
                        gap_penalties.append(gap_var * 3)
        
        # Combine all penalties
        total_penalty = sum(teacher_pref_penalties) + sum(max_per_day_penalties) + \
                       sum(max_per_week_penalties) + sum(gap_penalties)
        
        self.model.Minimize(total_penalty)
        
        # Store penalty components for reporting
        self.penalty_components = {
            'teacher_prefs': sum(teacher_pref_penalties),
            'max_per_day': sum(max_per_day_penalties),
            'max_per_week': sum(max_per_week_penalties),
            'gaps': sum(gap_penalties),
            'spread': 0  # Could add lecture spread penalty
        }
    
    def solve(self) -> SolverOutput:
        self.create_variables()
        self.add_hard_constraints()
        self.add_soft_objectives()
        
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30.0
        status = solver.Solve(self.model)
        
        assignments = []
        skipped = []
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            # Extract regular assignments
            for var_name, var in self.variables.items():
                if solver.Value(var) == 1:
                    parts = var_name.split("_")
                    assignments.append({
                        'offering_id': parts[1],
                        'slot_id': parts[2],
                        'room_id': parts[3],
                        'kind': parts[4],
                        'is_locked': False
                    })
            
            # Extract lab assignments from cluster variables
            for var_name, var in self.lab_cluster_vars.items():
                if solver.Value(var) == 1:
                    parts = var_name.split("_")
                    offering_id = parts[1]
                    cluster_name = parts[2]
                    room_id = parts[3]
                    
                    # Add all slots in the cluster
                    for slot_id in self.clusters[cluster_name]:
                        assignments.append({
                            'offering_id': offering_id,
                            'slot_id': slot_id,
                            'room_id': room_id,
                            'kind': 'P',
                            'is_locked': False
                        })
            
            # Preserve locked assignments
            for locked in self.input.locked_assignments:
                # Remove any conflicting assignment
                assignments = [a for a in assignments if not (
                    a['offering_id'] == locked['offering_id'] and
                    a['kind'] == locked['kind'] and
                    a['slot_id'] == locked['slot_id']
                )]
                assignments.append(locked)
            
            # Check for skipped items
            for offering in self.input.offerings:
                course = offering['course']
                offering_id = offering['id']
                
                for kind, required in [('L', course['L']), ('T', course['T']), ('P', course['P'])]:
                    if required > 0:
                        scheduled = len([a for a in assignments if 
                                       a['offering_id'] == offering_id and a['kind'] == kind])
                        if scheduled < required:
                            skipped.append({
                                'offering_id': offering_id,
                                'kind': kind,
                                'reason': f"Could only schedule {scheduled}/{required} {kind} sessions"
                            })
            
            objective = solver.ObjectiveValue()
            
            # Calculate penalty breakdown
            penalties = {
                'teacher_prefs': 0,
                'max_per_day': 0,
                'max_per_week': 0,
                'gaps': 0,
                'spread': 0
            }
            
            return SolverOutput(
                assignments=assignments,
                objective=objective,
                penalties=penalties,
                skipped=skipped
            )
        else:
            return SolverOutput(
                assignments=[],
                objective=float('inf'),
                penalties={'teacher_prefs': 0, 'max_per_day': 0, 'max_per_week': 0, 'gaps': 0, 'spread': 0},
                skipped=[{
                    'offering_id': 'all',
                    'kind': 'all',
                    'reason': f'Solver status: {solver.StatusName(status)}'
                }]
            )