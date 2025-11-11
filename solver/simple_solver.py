#!/usr/bin/env python3
"""Simple timetable solver without OR-Tools"""

import json
import random
from collections import defaultdict
from typing import List, Dict, Any, Set, Tuple

class SimpleSolver:
    def __init__(self, data: Dict[str, Any]):
        self.teachers = {t['id']: t for t in data['teachers']}
        self.rooms = {r['id']: r for r in data['rooms']}
        self.slots = {s['id']: s for s in data['slots']}
        self.offerings = data['offerings']
        self.availability = defaultdict(set)
        
        # Build availability map
        for avail in data['availability']:
            if avail['can_teach']:
                self.availability[avail['teacher_id']].add(avail['slot_id'])
        
        # Group slots by day and time for conflict checking
        self.slots_by_time = defaultdict(list)
        for slot_id, slot in self.slots.items():
            key = (slot['day'], slot['start_time'], slot['end_time'])
            self.slots_by_time[key].append(slot_id)
    
    def solve(self) -> Dict[str, Any]:
        assignments = []
        
        # Track used slots per teacher and room
        teacher_slots = defaultdict(set)
        room_slots = defaultdict(set)
        
        # Sort offerings by size (larger classes first)
        sorted_offerings = sorted(self.offerings, 
                                key=lambda o: o.get('expected_size', 0), 
                                reverse=True)
        
        for offering in sorted_offerings:
            if not offering.get('teacher_id'):
                continue
                
            teacher_id = offering['teacher_id']
            course = offering.get('course', {})
            
            # Determine how many slots we need
            l_count = course.get('L', 0) if course else 0
            t_count = course.get('T', 0) if course else 0
            p_count = course.get('P', 0) if course else 0
            
            # Assign lecture slots
            for i in range(l_count):
                slot = self._find_slot(offering, teacher_id, 'L', 
                                     teacher_slots[teacher_id], room_slots)
                if slot:
                    slot_id, room_id = slot
                    assignments.append({
                        'offering_id': offering['id'],
                        'slot_id': slot_id,
                        'room_id': room_id,
                        'kind': 'L'
                    })
                    teacher_slots[teacher_id].add(slot_id)
                    room_slots[room_id].add(slot_id)
            
            # Assign tutorial slots
            for i in range(t_count):
                slot = self._find_slot(offering, teacher_id, 'T',
                                     teacher_slots[teacher_id], room_slots)
                if slot:
                    slot_id, room_id = slot
                    assignments.append({
                        'offering_id': offering['id'],
                        'slot_id': slot_id,
                        'room_id': room_id,
                        'kind': 'T'
                    })
                    teacher_slots[teacher_id].add(slot_id)
                    room_slots[room_id].add(slot_id)
            
            # Assign practical/lab slots
            for i in range(p_count):
                slot = self._find_slot(offering, teacher_id, 'P',
                                     teacher_slots[teacher_id], room_slots,
                                     prefer_lab=True)
                if slot:
                    slot_id, room_id = slot
                    assignments.append({
                        'offering_id': offering['id'],
                        'slot_id': slot_id,
                        'room_id': room_id,
                        'kind': 'P'
                    })
                    teacher_slots[teacher_id].add(slot_id)
                    room_slots[room_id].add(slot_id)
        
        return {
            'success': True,
            'assignments': assignments,
            'stats': {
                'total_offerings': len(self.offerings),
                'assigned_offerings': len(set(a['offering_id'] for a in assignments)),
                'total_assignments': len(assignments)
            }
        }
    
    def _find_slot(self, offering: Dict, teacher_id: str, kind: str,
                   used_teacher_slots: Set[str], used_room_slots: Dict[str, Set[str]],
                   prefer_lab: bool = False) -> Tuple[str, str]:
        """Find an available slot and room for the offering"""
        
        # Get teacher's available slots
        available_slots = self.availability[teacher_id] - used_teacher_slots
        
        # Shuffle for randomness
        slot_list = list(available_slots)
        random.shuffle(slot_list)
        
        for slot_id in slot_list:
            slot = self.slots[slot_id]
            
            # Skip lab slots for lectures/tutorials
            if not prefer_lab and slot.get('is_lab'):
                continue
            
            # Prefer lab slots for practicals
            if prefer_lab and not slot.get('is_lab'):
                continue
            
            # Find available room
            room = self._find_room(offering, slot_id, used_room_slots, prefer_lab)
            if room:
                return (slot_id, room)
        
        # If no slot found with preferences, try without
        if prefer_lab:
            return self._find_slot(offering, teacher_id, kind, 
                                 used_teacher_slots, used_room_slots, 
                                 prefer_lab=False)
        
        return None
    
    def _find_room(self, offering: Dict, slot_id: str, 
                   used_room_slots: Dict[str, Set[str]], 
                   prefer_lab: bool = False) -> str:
        """Find an available room for the slot"""
        
        expected_size = offering.get('expected_size', 60)
        
        # Get suitable rooms
        suitable_rooms = []
        for room_id, room in self.rooms.items():
            # Check capacity
            if room['capacity'] < expected_size:
                continue
            
            # Check if room is free at this slot
            if slot_id in used_room_slots.get(room_id, set()):
                continue
            
            # Check room type preference
            if prefer_lab and room['kind'] != 'LAB':
                continue
            
            suitable_rooms.append((room_id, room['capacity']))
        
        # Sort by capacity (prefer smaller rooms that fit)
        suitable_rooms.sort(key=lambda x: x[1])
        
        if suitable_rooms:
            return suitable_rooms[0][0]
        
        # If no lab found but lab was preferred, try regular rooms
        if prefer_lab:
            return self._find_room(offering, slot_id, used_room_slots, 
                                 prefer_lab=False)
        
        return None


if __name__ == '__main__':
    # Test the solver
    import sys
    
    if len(sys.argv) > 1:
        with open(sys.argv[1]) as f:
            data = json.load(f)
        
        solver = SimpleSolver(data)
        result = solver.solve()
        print(json.dumps(result, indent=2))