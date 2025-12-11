import { Teacher, Room, Slot, Offering, Assignment } from '@/types/db'
import { formatSlotDisplay } from './slot-utils'

interface RecommendationInput {
  offeringId: string
  kind: 'L' | 'T' | 'P'
  teachers: Teacher[]
  rooms: Room[]
  slots: Slot[]
  offerings: any[]
  availability: any[]
  currentAssignments: Assignment[]
}

interface Recommendation {
  slot_id: string
  room_id: string
  penalty_delta: number
  reasons: string[]
  swaps: any[]
  slot?: Slot
  room?: Room
  display?: string
}

export class RecommendationEngine {
  private teachers: Map<string, Teacher>
  private rooms: Map<string, Room>
  private slots: Map<string, Slot>
  private offerings: Map<string, any>
  private availability: Map<string, Set<string>>
  private assignments: Assignment[]
  
  constructor(input: Omit<RecommendationInput, 'offeringId' | 'kind'>) {
    this.teachers = new Map(input.teachers.map(t => [t.id, t]))
    this.rooms = new Map(input.rooms.map(r => [r.id, r]))
    this.slots = new Map(input.slots.map(s => [s.id, s]))
    this.offerings = new Map(input.offerings.map(o => [o.id, o]))
    this.assignments = input.currentAssignments
    
    // Build availability map
    this.availability = new Map()
    input.availability.forEach(av => {
      if (!this.availability.has(av.teacher_id)) {
        this.availability.set(av.teacher_id, new Set())
      }
      if (av.can_teach) {
        this.availability.get(av.teacher_id)!.add(av.slot_id)
      }
    })
  }
  
  private getSlotDuration(slot: Slot): number {
    // Handle time format with seconds (HH:MM:SS)
    const startParts = slot.start_time.split(':')
    const endParts = slot.end_time.split(':')
    
    const startH = parseInt(startParts[0])
    const startM = parseInt(startParts[1])
    const endH = parseInt(endParts[0])
    const endM = parseInt(endParts[1])
    
    const duration = (endH * 60 + endM) - (startH * 60 + startM)
    return duration
  }
  
  private isTeacherAvailable(teacherId: string, slot: Slot): boolean {
    const teacherAvailability = this.availability.get(teacherId)
    // If no availability data exists for teacher, assume they're available for all slots
    if (!teacherAvailability || teacherAvailability.size === 0) {
      return true
    }
    return teacherAvailability.has(slot.id)
  }
  
  private isTeacherBusy(teacherId: string, slot: Slot): boolean {
    return this.assignments.some(a => {
      // Check if the teacher is busy in this slot
      // Need to check both the offering relation and direct offering lookup
      const offeringTeacherId = a.offering?.teacher_id || this.offerings.get(a.offering_id)?.teacher_id
      return offeringTeacherId === teacherId && a.slot_id === slot.id
    })
  }
  
  private isRoomAvailable(roomId: string, slot: Slot): boolean {
    return !this.assignments.some(a => 
      a.room_id === roomId && 
      a.slot_id === slot.id
    )
  }
  
  private getTeacherLoad(teacherId: string): { daily: Map<string, number>, weekly: number } {
    const daily = new Map<string, number>()
    let weekly = 0
    
    this.assignments.forEach(a => {
      if (a.offering?.teacher_id === teacherId) {
        const slot = this.slots.get(a.slot_id)
        if (slot?.day) {
          const hours = this.getSlotDuration(slot) / 60
          daily.set(slot.day, (daily.get(slot.day) || 0) + hours)
          weekly += hours
        }
      }
    })
    
    return { daily, weekly }
  }
  
  private calculatePenalty(
    offering: any,
    slot: Slot,
    room: Room,
    kind: 'L' | 'T' | 'P'
  ): { penalty: number, reasons: string[] } {
    let penalty = 0
    const reasons: string[] = []
    
    const teacher = this.teachers.get(offering.teacher_id)
    if (!teacher) {
      penalty += 100
      reasons.push('Teacher not found')
      return { penalty, reasons }
    }
    
    // Check slot type matches kind
    if (kind === 'P' && !slot.is_lab) {
      penalty += 50
      reasons.push('Practical needs lab slot')
    }
    if (kind !== 'P' && slot.is_lab) {
      penalty += 50
      reasons.push('Theory/Tutorial cannot use lab slot')
    }
    
    // Check room type
    if (kind === 'P' && room.kind !== 'LAB') {
      penalty += 50
      reasons.push('Practical needs lab room')
    }
    if (kind !== 'P' && room.kind === 'LAB') {
      penalty += 30
      reasons.push('Theory/Tutorial in lab room (suboptimal)')
    }
    
    // Check room capacity
    if (room.capacity < offering.expected_size) {
      penalty += 100
      reasons.push('Room too small')
    } else if (room.capacity > offering.expected_size * 2) {
      penalty += 10
      reasons.push('Room much larger than needed')
    }
    
    // Teacher preferences
    const prefs = teacher.prefs || {}
    const slotTime = parseInt(slot.start_time.split(':')[0]) * 60 + parseInt(slot.start_time.split(':')[1])
    
    if (prefs.avoid_8am && slotTime < 540) { // Before 9am
      penalty += 20
      reasons.push('Teacher prefers to avoid early morning')
    }
    
    if (prefs.avoid_late && slotTime >= 960) { // After 4pm
      penalty += 20
      reasons.push('Teacher prefers to avoid late classes')
    }
    
    if (prefs.preferred_days?.length > 0 && slot.day && !prefs.preferred_days.includes(slot.day)) {
      penalty += 10
      reasons.push(`Teacher prefers ${prefs.preferred_days.join(', ')}`)
    }
    
    // Check teacher workload
    const load = this.getTeacherLoad(offering.teacher_id)
    if (slot.day && load.daily.get(slot.day) && load.daily.get(slot.day)! >= teacher.max_per_day) {
      penalty += 30
      reasons.push('Teacher already has maximum classes this day')
    }
    
    // Prefer better time slots
    if (slotTime >= 720 && slotTime <= 840) { // 12pm-2pm
      penalty += 5
      reasons.push('Lunch hour slot')
    }
    
    // Add descriptive reasons based on the slot
    if (penalty === 0) {
      reasons.push('Good alternative slot')
    }
    
    // Add slot time info
    const hourStr = Math.floor(slotTime / 60)
    const period = hourStr < 12 ? 'Morning' : hourStr < 16 ? 'Afternoon' : 'Evening'
    reasons.push(`${period} slot on ${slot.day || 'TBD'}`)
    
    return { penalty, reasons }
  }
  
  public getRecommendations(offeringId: string, kind: 'L' | 'T' | 'P'): Recommendation[] {
    console.log('Getting recommendations for:', { offeringId, kind })
    
    const offering = this.offerings.get(offeringId)
    if (!offering) {
      console.log('Offering not found:', offeringId)
      console.log('Available offerings:', Array.from(this.offerings.keys()))
      return []
    }
    
    console.log('Found offering:', offering)
    
    const currentAssignment = this.assignments.find(a => 
      a.offering_id === offeringId && a.kind === kind
    )
    
    console.log('Current assignment:', currentAssignment)
    
    const recommendations: Recommendation[] = []
    // Updated durations based on actual slot times (08:00:33-08:55:33 = 55 minutes)
    const requiredDuration = kind === 'P' ? 175 : 55 // ~3 hours for practical, ~1 hour otherwise
    
    console.log(`Looking for ${requiredDuration} minute slots`)
    console.log(`Total slots available: ${this.slots.size}`)
    console.log(`Teacher ID: ${offering.teacher_id}`)
    
    let validSlotCount = 0
    let skippedReasons: Record<string, number> = {
      wrongDuration: 0,
      noTeacher: 0,
      teacherNotAvailable: 0,
      teacherBusy: 0,
      currentSlot: 0,
      noSuitableRoom: 0
    }
    
    // Check all slots
    this.slots.forEach(slot => {
      // Skip if wrong duration (with some tolerance for seconds)
      const slotDuration = this.getSlotDuration(slot)
      const durationDiff = Math.abs(slotDuration - requiredDuration)
      if (durationDiff > 5) { // Allow 5 minutes tolerance
        skippedReasons.wrongDuration++
        return
      }
      
      // Skip if no teacher assigned
      if (!offering.teacher_id) {
        skippedReasons.noTeacher++
        return
      }
      
      // Skip if teacher not available
      if (!this.isTeacherAvailable(offering.teacher_id, slot)) {
        skippedReasons.teacherNotAvailable++
        return
      }
      
      // Skip if teacher is busy
      if (this.isTeacherBusy(offering.teacher_id, slot)) {
        skippedReasons.teacherBusy++
        return
      }
      
      // Skip current slot
      if (currentAssignment && slot.id === currentAssignment.slot_id) {
        skippedReasons.currentSlot++
        return
      }
      
      validSlotCount++
      
      // Try each suitable room
      let roomsChecked = 0
      this.rooms.forEach(room => {
        roomsChecked++
        
        // Quick room type check
        if (kind === 'P' && room.kind !== 'LAB') return
        // For theory/tutorial, prefer non-lab rooms but allow lab rooms if needed
        
        // Check room availability
        if (!this.isRoomAvailable(room.id, slot)) return
        
        // Check room capacity
        if (room.capacity < offering.expected_size) return
        
        // Calculate penalty
        const { penalty, reasons } = this.calculatePenalty(offering, slot, room, kind)
        
        // Calculate penalty delta (improvement over current)
        let penaltyDelta = -penalty
        if (currentAssignment) {
          const currentSlot = this.slots.get(currentAssignment.slot_id)
          const currentRoom = this.rooms.get(currentAssignment.room_id)
          if (currentSlot && currentRoom) {
            const { penalty: currentPenalty } = this.calculatePenalty(offering, currentSlot, currentRoom, kind)
            penaltyDelta = currentPenalty - penalty
          }
        }
        
        recommendations.push({
          slot_id: slot.id,
          room_id: room.id,
          penalty_delta: penaltyDelta,
          reasons,
          swaps: [],
          slot,
          room,
          display: `${formatSlotDisplay(slot)} ${slot.day || ''} ${slot.start_time}-${slot.end_time} in ${room.code}`
        })
      })
    })
    
    // Log debugging info
    console.log('Slot filtering summary:', {
      totalSlots: this.slots.size,
      skippedReasons,
      validSlotCount,
      totalRecommendations: recommendations.length
    })
    
    // Sort by penalty delta (best improvement first)
    recommendations.sort((a, b) => b.penalty_delta - a.penalty_delta)
    
    // Return top 10 recommendations
    return recommendations.slice(0, 10)
  }
}