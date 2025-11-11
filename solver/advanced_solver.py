#!/usr/bin/env python3
"""Advanced timetable solver with constraint satisfaction"""

import json
import random
from collections import defaultdict
from typing import List, Dict, Any, Set, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SlotType(Enum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    LAB = "lab"

@dataclass
class TimeSlot:
    id: str
    day: str
    start_time: str
    end_time: str
    code: str
    occ: int
    is_lab: bool
    cluster: Optional[str]
    
    @property
    def time_key(self) -> Tuple[str, str, str]:
        return (self.day, self.start_time, self.end_time)
    
    @property
    def slot_type(self) -> SlotType:
        hour = int(self.start_time.split(':')[0])
        if self.is_lab:
            return SlotType.LAB
        elif hour < 12:
            return SlotType.MORNING
        else:
            return SlotType.AFTERNOON

@dataclass
class Assignment:
    offering_id: str
    slot_id: str
    room_id: str
    kind: str
    score: float = 0.0

class ConstraintSolver:
    def __init__(self, data: Dict[str, Any]):
        self.teachers = {t['id']: t for t in data['teachers']}
        self.rooms = {r['id']: r for r in data['rooms']}
        self.slots = {s['id']: TimeSlot(**s) for s in data['slots']}
        self.offerings = data['offerings']
        self.availability = defaultdict(set)
        self.locked_assignments = data.get('locked_assignments', [])
        
        # Build availability map
        for avail in data['availability']:
            if avail.get('can_teach', True):
                self.availability[avail['teacher_id']].add(avail['slot_id'])
        
        # Initialize tracking structures
        self.teacher_schedule = defaultdict(set)
        self.room_schedule = defaultdict(set)
        self.section_schedule = defaultdict(set)
        self.assignments = []
        
        # Apply locked assignments first
        for locked in self.locked_assignments:
            self._apply_assignment(Assignment(**locked))
        
        # Group slots by various criteria for efficient lookup
        self._organize_slots()
    
    def _organize_slots(self):
        """Organize slots for efficient lookup"""
        self.slots_by_day = defaultdict(list)
        self.slots_by_time = defaultdict(list)
        self.lab_slots = []
        self.theory_slots = []
        self.slot_clusters = defaultdict(list)
        
        for slot_id, slot in self.slots.items():
            self.slots_by_day[slot.day].append(slot_id)
            self.slots_by_time[slot.time_key].append(slot_id)
            
            if slot.is_lab:
                self.lab_slots.append(slot_id)
            else:
                self.theory_slots.append(slot_id)
            
            if slot.cluster:
                self.slot_clusters[slot.cluster].append(slot_id)
    
    def solve(self) -> Dict[str, Any]:
        """Main solving algorithm"""
        # Sort offerings by priority
        sorted_offerings = self._prioritize_offerings()
        
        # Statistics tracking
        total_required = 0
        successful_assignments = 0
        failed_assignments = []
        
        for offering in sorted_offerings:
            if not offering.get('teacher_id'):
                continue
            
            course = offering.get('course', {})
            if not course:
                continue
            
            # Get requirements
            requirements = {
                'L': course.get('L', 0),
                'T': course.get('T', 0),
                'P': course.get('P', 0)
            }
            
            # Assign each type
            for kind, count in requirements.items():
                total_required += count
                for i in range(count):
                    assignment = self._find_best_assignment(offering, kind)
                    if assignment:
                        self._apply_assignment(assignment)
                        successful_assignments += 1
                    else:
                        failed_assignments.append({
                            'offering_id': offering['id'],
                            'kind': kind,
                            'reason': 'No suitable slot/room found'
                        })
        
        # Try to improve the schedule
        self._optimize_schedule()
        
        return {
            'success': True,
            'assignments': [self._assignment_to_dict(a) for a in self.assignments],
            'stats': {
                'total_offerings': len(self.offerings),
                'total_slots_required': total_required,
                'successful_assignments': successful_assignments,
                'failed_assignments': len(failed_assignments),
                'utilization': successful_assignments / total_required if total_required > 0 else 0
            },
            'warnings': failed_assignments[:10]  # First 10 failures
        }
    
    def _prioritize_offerings(self) -> List[Dict]:
        """Sort offerings by priority"""
        def priority_score(offering):
            score = 0
            
            # Larger classes get higher priority
            score += offering.get('expected_size', 0) / 10
            
            # Lab courses get priority
            course = offering.get('course', {})
            if course.get('P', 0) > 0:
                score += 50
            
            # Consider teacher constraints
            teacher_id = offering.get('teacher_id')
            if teacher_id:
                teacher = self.teachers.get(teacher_id, {})
                # Teachers with fewer max hours get priority
                score += 100 - teacher.get('max_per_week', 12)
            
            return score
        
        return sorted(self.offerings, key=priority_score, reverse=True)
    
    def _find_best_assignment(self, offering: Dict, kind: str) -> Optional[Assignment]:
        """Find the best slot and room for an offering"""
        teacher_id = offering['teacher_id']
        section_id = offering.get('section_id')
        
        # Get candidate slots
        if kind == 'P':
            candidate_slots = self.lab_slots.copy()
        else:
            candidate_slots = self.theory_slots.copy()
        
        # Filter by teacher availability
        available_slots = [s for s in candidate_slots 
                          if s in self.availability[teacher_id]
                          and s not in self.teacher_schedule[teacher_id]]
        
        # Score each slot
        slot_scores = []
        for slot_id in available_slots:
            slot = self.slots[slot_id]
            
            # Check for conflicts
            if not self._check_constraints(offering, slot_id, kind):
                continue
            
            # Find suitable room
            room_id = self._find_best_room(offering, slot_id, kind)
            if not room_id:
                continue
            
            # Calculate score
            score = self._calculate_slot_score(offering, slot, room_id)
            slot_scores.append((slot_id, room_id, score))
        
        # Select best option
        if slot_scores:
            slot_scores.sort(key=lambda x: x[2], reverse=True)
            slot_id, room_id, score = slot_scores[0]
            return Assignment(offering['id'], slot_id, room_id, kind, score)
        
        return None
    
    def _check_constraints(self, offering: Dict, slot_id: str, kind: str) -> bool:
        """Check if assigning this slot violates any constraints"""
        slot = self.slots[slot_id]
        teacher_id = offering['teacher_id']
        section_id = offering.get('section_id')
        
        # Teacher conflict
        if slot_id in self.teacher_schedule[teacher_id]:
            return False
        
        # Section conflict
        if section_id and slot_id in self.section_schedule[section_id]:
            return False
        
        # Daily limit for teacher
        teacher = self.teachers.get(teacher_id, {})
        max_per_day = teacher.get('max_per_day', 3)
        
        daily_slots = [s for s in self.teacher_schedule[teacher_id] 
                      if self.slots[s].day == slot.day]
        if len(daily_slots) >= max_per_day:
            return False
        
        # Weekly limit for teacher
        max_per_week = teacher.get('max_per_week', 12)
        if len(self.teacher_schedule[teacher_id]) >= max_per_week:
            return False
        
        # Lab continuity - if it's a lab, try to get continuous slots
        if kind == 'P' and slot.cluster:
            # Check if we can get all slots in the cluster
            cluster_slots = self.slot_clusters[slot.cluster]
            for cs in cluster_slots:
                if cs in self.teacher_schedule[teacher_id] or \
                   (section_id and cs in self.section_schedule[section_id]):
                    return False
        
        # Avoid teacher preferences
        prefs = teacher.get('prefs', {})
        if prefs:
            # Avoid 8am if requested
            if prefs.get('avoid_8am') and slot.start_time == '08:00':
                return False
            
            # Check preferred days
            prefer_days = prefs.get('prefer_days', [])
            if prefer_days and slot.day not in prefer_days:
                return False
        
        return True
    
    def _find_best_room(self, offering: Dict, slot_id: str, kind: str) -> Optional[str]:
        """Find the best available room for the slot"""
        expected_size = offering.get('expected_size', 60)
        needs = offering.get('needs', [])
        
        suitable_rooms = []
        for room_id, room in self.rooms.items():
            # Check availability
            if slot_id in self.room_schedule[room_id]:
                continue
            
            # Check capacity
            if room['capacity'] < expected_size:
                continue
            
            # Check room type
            if kind == 'P' and room['kind'] != 'LAB':
                continue
            elif kind in ['L', 'T'] and room['kind'] == 'LAB':
                continue  # Avoid using labs for theory
            
            suitable_rooms.append((room_id, room))
        
        if not suitable_rooms:
            return None
        
        # Sort by suitability
        def room_score(room_tuple):
            room_id, room = room_tuple
            score = 0
            
            # Prefer rooms that just fit
            capacity_diff = room['capacity'] - expected_size
            score -= capacity_diff * 0.1  # Penalty for oversized rooms
            
            # Bonus for matching tags/needs
            tags = set(room.get('tags', []))
            needs_set = set(needs)
            score += len(tags.intersection(needs_set)) * 10
            
            return score
        
        suitable_rooms.sort(key=room_score, reverse=True)
        return suitable_rooms[0][0]
    
    def _calculate_slot_score(self, offering: Dict, slot: TimeSlot, 
                            room_id: str) -> float:
        """Calculate quality score for an assignment"""
        score = 100.0  # Base score
        
        # Time preference scoring
        teacher_id = offering['teacher_id']
        teacher = self.teachers.get(teacher_id, {})
        prefs = teacher.get('prefs', {})
        
        # Penalty for early morning
        if slot.start_time == '08:00':
            score -= 20
        
        # Bonus for preferred time slots
        pref_slots = prefs.get('available_slots', [])
        slot_time = f"{slot.start_time}-{slot.end_time}"
        if slot_time in pref_slots:
            score += 30
        
        # Distribution scoring - spread classes throughout week
        teacher_days = set()
        for assigned_slot_id in self.teacher_schedule[teacher_id]:
            teacher_days.add(self.slots[assigned_slot_id].day)
        
        if slot.day not in teacher_days:
            score += 15  # Bonus for new day
        else:
            score -= 5   # Small penalty for same day
        
        # Room suitability
        room = self.rooms[room_id]
        capacity_ratio = offering.get('expected_size', 60) / room['capacity']
        if 0.7 <= capacity_ratio <= 0.9:
            score += 20  # Ideal capacity usage
        elif capacity_ratio < 0.5:
            score -= 15  # Room too big
        
        # Section distribution - avoid too many classes in one day
        section_id = offering.get('section_id')
        if section_id:
            section_day_count = sum(1 for s in self.section_schedule[section_id] 
                                  if self.slots[s].day == slot.day)
            if section_day_count > 4:
                score -= 25
        
        return score
    
    def _apply_assignment(self, assignment: Assignment):
        """Apply an assignment to the schedule"""
        self.assignments.append(assignment)
        self.teacher_schedule[self._get_teacher_id(assignment.offering_id)].add(assignment.slot_id)
        self.room_schedule[assignment.room_id].add(assignment.slot_id)
        
        offering = self._get_offering(assignment.offering_id)
        if offering and offering.get('section_id'):
            self.section_schedule[offering['section_id']].add(assignment.slot_id)
        
        # For lab slots, block the entire cluster
        slot = self.slots[assignment.slot_id]
        if slot.cluster:
            for cluster_slot_id in self.slot_clusters[slot.cluster]:
                self.teacher_schedule[self._get_teacher_id(assignment.offering_id)].add(cluster_slot_id)
                if offering and offering.get('section_id'):
                    self.section_schedule[offering['section_id']].add(cluster_slot_id)
    
    def _optimize_schedule(self):
        """Post-processing optimization"""
        # Try to swap assignments to improve score
        improvement_made = True
        iterations = 0
        max_iterations = 100
        
        while improvement_made and iterations < max_iterations:
            improvement_made = False
            iterations += 1
            
            for i, a1 in enumerate(self.assignments):
                for j, a2 in enumerate(self.assignments):
                    if i >= j:
                        continue
                    
                    # Check if swap is valid
                    if self._can_swap(a1, a2):
                        # Calculate score improvement
                        current_score = a1.score + a2.score
                        swap_score = self._calculate_swap_score(a1, a2)
                        
                        if swap_score > current_score:
                            self._swap_assignments(a1, a2)
                            improvement_made = True
        
        logger.info(f"Optimization completed after {iterations} iterations")
    
    def _can_swap(self, a1: Assignment, a2: Assignment) -> bool:
        """Check if two assignments can be swapped"""
        # Same kind only
        if a1.kind != a2.kind:
            return False
        
        # Check room capacity
        o1 = self._get_offering(a1.offering_id)
        o2 = self._get_offering(a2.offering_id)
        
        if not o1 or not o2:
            return False
        
        r1 = self.rooms[a1.room_id]
        r2 = self.rooms[a2.room_id]
        
        if o1.get('expected_size', 60) > r2['capacity']:
            return False
        if o2.get('expected_size', 60) > r1['capacity']:
            return False
        
        return True
    
    def _calculate_swap_score(self, a1: Assignment, a2: Assignment) -> float:
        """Calculate score if assignments were swapped"""
        o1 = self._get_offering(a1.offering_id)
        o2 = self._get_offering(a2.offering_id)
        
        score1 = self._calculate_slot_score(o1, self.slots[a2.slot_id], a2.room_id)
        score2 = self._calculate_slot_score(o2, self.slots[a1.slot_id], a1.room_id)
        
        return score1 + score2
    
    def _swap_assignments(self, a1: Assignment, a2: Assignment):
        """Swap two assignments"""
        # Swap slots and rooms
        a1.slot_id, a2.slot_id = a2.slot_id, a1.slot_id
        a1.room_id, a2.room_id = a2.room_id, a1.room_id
        
        # Update scores
        o1 = self._get_offering(a1.offering_id)
        o2 = self._get_offering(a2.offering_id)
        
        a1.score = self._calculate_slot_score(o1, self.slots[a1.slot_id], a1.room_id)
        a2.score = self._calculate_slot_score(o2, self.slots[a2.slot_id], a2.room_id)
    
    def _get_offering(self, offering_id: str) -> Optional[Dict]:
        """Get offering by ID"""
        for offering in self.offerings:
            if offering['id'] == offering_id:
                return offering
        return None
    
    def _get_teacher_id(self, offering_id: str) -> Optional[str]:
        """Get teacher ID for an offering"""
        offering = self._get_offering(offering_id)
        return offering.get('teacher_id') if offering else None
    
    def _assignment_to_dict(self, assignment: Assignment) -> Dict:
        """Convert assignment to dictionary"""
        return {
            'offering_id': assignment.offering_id,
            'slot_id': assignment.slot_id,
            'room_id': assignment.room_id,
            'kind': assignment.kind
        }


def generate_recommendations(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate recommendations for schedule improvement"""
    recommendations = []
    
    # Analyze teacher load
    teacher_load = defaultdict(int)
    for assignment in data.get('assignments', []):
        offering = next((o for o in data['offerings'] if o['id'] == assignment['offering_id']), None)
        if offering and offering.get('teacher_id'):
            teacher_load[offering['teacher_id']] += 1
    
    # Check for overloaded teachers
    for teacher_id, load in teacher_load.items():
        teacher = next((t for t in data['teachers'] if t['id'] == teacher_id), None)
        if teacher:
            max_load = teacher.get('max_per_week', 12)
            if load > max_load:
                recommendations.append({
                    'type': 'warning',
                    'title': 'Teacher Overloaded',
                    'description': f"{teacher['name']} has {load} slots assigned, exceeding limit of {max_load}",
                    'entity_type': 'teacher',
                    'entity_id': teacher_id
                })
    
    # Check for conflicts
    time_slots = defaultdict(list)
    for assignment in data.get('assignments', []):
        slot = next((s for s in data['slots'] if s['id'] == assignment['slot_id']), None)
        if slot:
            key = (slot['day'], slot['start_time'])
            time_slots[key].append(assignment)
    
    # More recommendations...
    
    return recommendations[:10]  # Return top 10 recommendations