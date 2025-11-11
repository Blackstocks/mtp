"""Generate slot recommendations for moving a specific class"""
from typing import List, Dict, Any
from collections import defaultdict


def generate_slot_recommendations(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate recommendations for where to move a specific offering"""
    offering_id = data.get('offering_id')
    kind = data.get('kind')
    
    print(f"Generating recommendations for offering_id={offering_id}, kind={kind}")
    
    if not offering_id or not kind:
        print("Missing offering_id or kind")
        return []
    
    # Find the offering
    offerings = data.get('offerings', [])
    offering = next((o for o in offerings if o['id'] == offering_id), None)
    if not offering:
        print(f"Offering not found for id={offering_id}")
        return []
    
    teacher_id = offering.get('teacher_id')
    section_id = offering.get('section_id')
    expected_size = offering.get('expected_size', 60)
    
    print(f"Offering details: teacher_id={teacher_id}, section_id={section_id}, expected_size={expected_size}")
    
    # Get current assignments
    current_assignments = data.get('current_assignments', [])
    
    # Build occupied slots maps
    teacher_slots = defaultdict(set)
    room_slots = defaultdict(set)
    section_slots = defaultdict(set)
    
    for assignment in current_assignments:
        # Skip the assignment we're trying to move
        if assignment.get('offering_id') == offering_id and assignment.get('kind') == kind:
            continue
            
        slot_id = assignment.get('slot_id')
        room_id = assignment.get('room_id')
        
        # Find the offering for this assignment
        assign_offering = next((o for o in offerings if o['id'] == assignment['offering_id']), None)
        if assign_offering:
            if assign_offering.get('teacher_id'):
                teacher_slots[assign_offering['teacher_id']].add(slot_id)
            if assign_offering.get('section_id'):
                section_slots[assign_offering['section_id']].add(slot_id)
        
        if room_id:
            room_slots[room_id].add(slot_id)
    
    # Get teacher availability
    availability = data.get('availability', [])
    teacher_available_slots = set()
    if teacher_id:
        teacher_available_slots = {
            a['slot_id'] for a in availability 
            if a['teacher_id'] == teacher_id and a.get('can_teach', True)
        }
        print(f"Teacher {teacher_id} has {len(teacher_available_slots)} available slots")
    else:
        print("No teacher_id - skipping availability check")
        # If no teacher, consider all slots available
        teacher_available_slots = None
    
    # Get all slots and rooms
    slots = data.get('slots', [])
    rooms = data.get('rooms', [])
    print(f"Total slots: {len(slots)}, Total rooms: {len(rooms)}")
    
    recommendations = []
    
    # Filter slots by type
    valid_slots = []
    if kind == 'P':
        valid_slots = [s for s in slots if s.get('is_lab', False)]
    else:
        valid_slots = [s for s in slots if not s.get('is_lab', False)]
    print(f"Valid slots for kind={kind}: {len(valid_slots)}")
    
    # Filter rooms by type and capacity
    valid_rooms = []
    if kind == 'P':
        valid_rooms = [
            r for r in rooms 
            if r.get('kind') == 'LAB' and r.get('capacity', 0) >= expected_size
        ]
    else:
        valid_rooms = [
            r for r in rooms 
            if r.get('kind') == 'CLASS' and r.get('capacity', 0) >= expected_size
        ]
    print(f"Valid rooms for kind={kind}, capacity>={expected_size}: {len(valid_rooms)}")
    
    # Try each slot-room combination
    for slot in valid_slots:
        slot_id = slot['id']
        
        # Check teacher availability
        if teacher_id and teacher_available_slots is not None and slot_id not in teacher_available_slots:
            continue
        
        # Check for conflicts
        if teacher_id and slot_id in teacher_slots[teacher_id]:
            continue
        if section_id and slot_id in section_slots[section_id]:
            continue
        
        # Try each room
        for room in valid_rooms:
            room_id = room['id']
            
            # Check if room is free
            if slot_id in room_slots[room_id]:
                continue
            
            # Calculate penalty/score
            penalty = 0
            reasons = []
            
            # Teacher preferences
            teacher = next((t for t in data.get('teachers', []) if t['id'] == teacher_id), None)
            if teacher and teacher.get('prefs'):
                prefs = teacher['prefs']
                
                # Check time preferences
                if prefs.get('avoid_8am') and slot['start_time'].startswith('08'):
                    penalty += 10
                    reasons.append("Teacher prefers to avoid 8am")
                
                if prefs.get('avoid_late') and slot['start_time'] >= '17:00':
                    penalty += 10
                    reasons.append("Teacher prefers to avoid late hours")
                
                # Check day preferences
                prefer_days = prefs.get('prefer_days', [])
                if prefer_days and slot['day'] not in prefer_days:
                    penalty += 5
                    reasons.append(f"Teacher prefers {', '.join(prefer_days)}")
            
            # Room utilization
            capacity_ratio = expected_size / room['capacity']
            if capacity_ratio < 0.5:
                penalty += 5
                reasons.append("Room is too large for this class")
            elif capacity_ratio > 0.9:
                penalty += 3
                reasons.append("Room is nearly at capacity")
            else:
                reasons.append("Good room utilization")
            
            # Check for clustering (labs should be together)
            if kind == 'P' and slot.get('cluster'):
                reasons.append(f"Part of lab cluster {slot['cluster']}")
                penalty -= 5  # Bonus for lab slots
            
            if not reasons:
                reasons.append("Good fit - no issues found")
            
            recommendations.append({
                'slot_id': slot_id,
                'room_id': room_id,
                'penalty_delta': penalty,
                'reasons': reasons,
                'slot': slot,
                'room': room
            })
    
    # Sort by penalty (lower is better)
    recommendations.sort(key=lambda x: x['penalty_delta'])
    
    print(f"Generated {len(recommendations)} total recommendations")
    
    # Return top 10
    result = recommendations[:10]
    print(f"Returning top {len(result)} recommendations")
    return result