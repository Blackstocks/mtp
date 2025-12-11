import { Teacher, Room, Slot, Offering, Assignment, AssignmentWithRelations } from '@/types/db'
import { supabase } from './db'

interface SlotGroup {
  slots: Slot[]
  totalDuration: number
  day: string
  startTime: string
  endTime: string
}

interface GeneratorInput {
  teachers: Teacher[]
  rooms: Room[]
  slots: Slot[]
  offerings: any[] // Offerings with relations
  availability: any[]
  lockedAssignments: Assignment[]
}

interface GeneratorOutput {
  assignments: Assignment[]
  stats: {
    totalOfferings: number
    totalSlotsRequired: number
    successfulAssignments: number
    failedAssignments: number
    utilizationRate: number
  }
  warnings: Array<{
    offeringId: string
    kind: string
    reason: string
  }>
}

export class TimetableGenerator {
  private teachers: Map<string, Teacher>
  private rooms: Map<string, Room>
  private slots: Map<string, Slot>
  private slotGroups: SlotGroup[]
  private offerings: any[]
  private availability: Map<string, Set<string>>
  private assignments: Assignment[] = []
  private warnings: any[] = []
  
  constructor(input: GeneratorInput) {
    this.teachers = new Map(input.teachers.map(t => [t.id, t]))
    this.rooms = new Map(input.rooms.map(r => [r.id, r]))
    this.slots = new Map(input.slots.map(s => [s.id, s]))
    this.offerings = input.offerings
    
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
    
    // Group slots for flexible assignment
    this.slotGroups = this.createSlotGroups()
    
    // Add locked assignments
    this.assignments = [...input.lockedAssignments]
  }
  
  private createSlotGroups(): SlotGroup[] {
    const groups: SlotGroup[] = []
    const slotArray = Array.from(this.slots.values())
    
    // Sort slots by day and start time
    slotArray.sort((a, b) => {
      if (!a.day || !b.day) return 0
      if (a.day !== b.day) return a.day.localeCompare(b.day)
      return a.start_time.localeCompare(b.start_time)
    })
    
    // Add all individual slots as groups
    slotArray.forEach(slot => {
      const duration = this.getSlotDuration(slot)
      groups.push({
        slots: [slot],
        totalDuration: duration,
        day: slot.day || '',
        startTime: slot.start_time,
        endTime: slot.end_time
      })
    })
    
    // For lab slots, create groups based on clusters
    const labClusters = new Map<string, Slot[]>()
    slotArray.forEach(slot => {
      if (slot.is_lab && slot.cluster) {
        if (!labClusters.has(slot.cluster)) {
          labClusters.set(slot.cluster, [])
        }
        labClusters.get(slot.cluster)!.push(slot)
      }
    })
    
    // Create lab groups from clusters
    labClusters.forEach((slots, cluster) => {
      // Sort slots by start time
      slots.sort((a, b) => a.start_time.localeCompare(b.start_time))
      
      // For each starting slot, try to create groups of required duration
      for (let i = 0; i < slots.length; i++) {
        // Create 2-hour lab groups
        if (i + 1 < slots.length && slots[i + 1].start_time === slots[i].end_time) {
          groups.push({
            slots: [slots[i], slots[i + 1]],
            totalDuration: 2,
            day: slots[i].day || '',
            startTime: slots[i].start_time,
            endTime: slots[i + 1].end_time
          })
        }
        
        // Create 3-hour lab groups
        if (i + 2 < slots.length && 
            slots[i + 1].start_time === slots[i].end_time &&
            slots[i + 2].start_time === slots[i + 1].end_time) {
          groups.push({
            slots: [slots[i], slots[i + 1], slots[i + 2]],
            totalDuration: 3,
            day: slots[i].day || '',
            startTime: slots[i].start_time,
            endTime: slots[i + 2].end_time
          })
        }
      }
    })
    
    // Create flexible groups for lectures/tutorials from consecutive slots
    slotArray.forEach((slot, idx) => {
      if (this.getSlotDuration(slot) === 1 && !slot.is_lab) {
        // Look for consecutive slots on the same day
        const nextSlot = slotArray[idx + 1]
        if (nextSlot && 
            nextSlot.day === slot.day && 
            nextSlot.start_time === slot.end_time &&
            !nextSlot.is_lab) {
          groups.push({
            slots: [slot, nextSlot],
            totalDuration: 2,
            day: slot.day || '',
            startTime: slot.start_time,
            endTime: nextSlot.end_time
          })
        }
      }
    })
    
    return groups
  }
  
  private getSlotDuration(slot: Slot): number {
    const start = this.parseTime(slot.start_time)
    const end = this.parseTime(slot.end_time)
    return Math.round((end - start) / 60) // Duration in hours
  }
  
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }
  
  private isTeacherAvailable(teacherId: string, slot: Slot): boolean {
    const teacherAvailability = this.availability.get(teacherId)
    if (!teacherAvailability) return true // If no availability data, assume available
    return teacherAvailability.has(slot.id)
  }
  
  private isTeacherBusy(teacherId: string, slots: Slot[]): boolean {
    return this.assignments.some(assignment => {
      const offering = this.offerings.find(o => o.id === assignment.offering_id)
      const assignmentTeacherId = assignment.offering?.teacher_id || offering?.teacher_id
      return assignmentTeacherId === teacherId &&
        slots.some(slot => slot.id === assignment.slot_id)
    })
  }
  
  private isRoomAvailable(roomId: string, slots: Slot[]): boolean {
    return !this.assignments.some(assignment =>
      assignment.room_id === roomId &&
      slots.some(slot => slot.id === assignment.slot_id)
    )
  }
  
  private findBestRoom(capacity: number, kind: 'L' | 'T' | 'P', slots: Slot[]): Room | null {
    const suitableRooms = Array.from(this.rooms.values())
      .filter(room => {
        // Check room type
        if (kind === 'P' && room.kind !== 'LAB') return false
        if (kind !== 'P' && room.kind === 'LAB') return false
        
        // Check capacity
        if (room.capacity < capacity) return false
        
        // Check availability
        if (!this.isRoomAvailable(room.id, slots)) return false
        
        return true
      })
      .sort((a, b) => a.capacity - b.capacity) // Prefer smaller rooms that fit
    
    return suitableRooms[0] || null
  }
  
  private getTeacherLoad(teacherId: string): { daily: Map<string, number>, weekly: number } {
    const daily = new Map<string, number>()
    let weekly = 0

    this.assignments.forEach(assignment => {
      // Look up the offering to get the teacher_id
      const offering = this.offerings.find(o => o.id === assignment.offering_id)
      const assignmentTeacherId = assignment.offering?.teacher_id || offering?.teacher_id

      if (assignmentTeacherId === teacherId) {
        const slot = this.slots.get(assignment.slot_id)
        if (slot?.day) {
          const duration = this.getSlotDuration(slot)
          daily.set(slot.day, (daily.get(slot.day) || 0) + duration)
          weekly += duration
        }
      }
    })

    return { daily, weekly }
  }
  
  private canAssignToTeacher(teacherId: string, slots: Slot[]): boolean {
    const teacher = this.teachers.get(teacherId)
    if (!teacher) return false
    
    const load = this.getTeacherLoad(teacherId)
    const additionalHours = slots.reduce((sum, slot) => sum + this.getSlotDuration(slot), 0)
    
    // Check weekly limit
    if (load.weekly + additionalHours > teacher.max_per_week) return false
    
    // Check daily limit
    const day = slots[0].day
    if (day) {
      const dailyHours = (load.daily.get(day) || 0) + additionalHours
      if (dailyHours > teacher.max_per_day) return false
    }
    
    return true
  }
  
  private assignOffering(offering: any, kind: 'L' | 'T' | 'P', requiredHours: number): boolean {
    const teacherId = offering.teacher_id
    if (!teacherId) {
      this.warnings.push({
        offeringId: offering.id,
        kind,
        reason: 'No teacher assigned'
      })
      return false
    }

    const teacher = this.teachers.get(teacherId)
    const teacherPrefs = teacher?.prefs || {}

    // Get current teacher schedule to ensure distribution
    const teacherSchedule = this.getTeacherSchedule(teacherId)

    // Track rejection reasons for better error messages
    let rejectionReasons = {
      wrongDuration: 0,
      wrongSlotType: 0,
      teacherNotAvailable: 0,
      teacherBusy: 0,
      teacherWorkloadExceeded: 0,
      sectionConflict: 0,
      noRoom: 0
    }

    // Find suitable slot groups
    const suitableGroups = this.slotGroups
      .filter(group => {
        // Check duration
        if (group.totalDuration !== requiredHours) {
          rejectionReasons.wrongDuration++
          return false
        }

        // Check if slots are appropriate for the kind
        if (kind === 'P' && !group.slots.every(s => s.is_lab)) {
          rejectionReasons.wrongSlotType++
          return false
        }
        if (kind !== 'P' && group.slots.some(s => s.is_lab)) {
          rejectionReasons.wrongSlotType++
          return false
        }

        // Check teacher availability
        if (!group.slots.every(s => this.isTeacherAvailable(teacherId, s))) {
          rejectionReasons.teacherNotAvailable++
          return false
        }

        // Check if teacher is busy
        if (this.isTeacherBusy(teacherId, group.slots)) {
          rejectionReasons.teacherBusy++
          return false
        }

        // Check teacher workload
        if (!this.canAssignToTeacher(teacherId, group.slots)) {
          rejectionReasons.teacherWorkloadExceeded++
          return false
        }

        // Check for section conflicts (same section shouldn't have overlapping classes)
        if (this.hasSectionConflict(offering.section_id, group.slots)) {
          rejectionReasons.sectionConflict++
          return false
        }

        return true
      })
      .sort((a, b) => {
        // Calculate preference scores
        let scoreA = 0
        let scoreB = 0
        
        const startTimeA = this.parseTime(a.startTime)
        const startTimeB = this.parseTime(b.startTime)
        
        // Prefer to distribute classes across days
        const dayCountA = teacherSchedule.get(a.day) || 0
        const dayCountB = teacherSchedule.get(b.day) || 0
        scoreA -= dayCountA * 5  // Penalize days with more classes
        scoreB -= dayCountB * 5
        
        // For labs, prefer afternoon slots
        if (kind === 'P') {
          if (startTimeA >= 840) scoreA += 10  // After 2pm
          if (startTimeB >= 840) scoreB += 10
        }
        
        // Avoid 8am if teacher prefers
        if (teacherPrefs.avoid_8am) {
          if (startTimeA < 540) scoreA -= 10 // Before 9am
          if (startTimeB < 540) scoreB -= 10
        }
        
        // Avoid late classes if teacher prefers
        if (teacherPrefs.avoid_late) {
          if (startTimeA >= 960) scoreA -= 10 // After 4pm
          if (startTimeB >= 960) scoreB -= 10
        }
        
        // Prefer specific days if set
        if (teacherPrefs.preferred_days?.length > 0) {
          if (teacherPrefs.preferred_days.includes(a.day)) scoreA += 5
          if (teacherPrefs.preferred_days.includes(b.day)) scoreB += 5
        }
        
        // Try to avoid consecutive classes for the same teacher
        if (this.hasAdjacentClass(teacherId, a.slots[0])) scoreA -= 3
        if (this.hasAdjacentClass(teacherId, b.slots[0])) scoreB -= 3
        
        // If scores are different, use them
        if (scoreA !== scoreB) return scoreB - scoreA
        
        // Otherwise prefer to spread across days
        if (a.day !== b.day) {
          return dayCountA - dayCountB
        }
        
        // Finally, prefer earlier slots
        return startTimeA - startTimeB
      })
    
    // Try to assign to each suitable group
    for (const group of suitableGroups) {
      const room = this.findBestRoom(offering.expected_size || 30, kind, group.slots)

      if (room) {
        // Create assignments for all slots in the group
        group.slots.forEach(slot => {
          this.assignments.push({
            offering_id: offering.id,
            slot_id: slot.id,
            room_id: room.id,
            kind,
            is_locked: false
          } as Assignment)
        })

        return true
      } else {
        rejectionReasons.noRoom++
      }
    }
    
    // If no suitable slot found, provide detailed reason
    let reason = 'No suitable slot/room combination found'
    const teacherLoad = this.getTeacherLoad(teacherId)

    if (rejectionReasons.teacherWorkloadExceeded > 0) {
      reason = `Teacher max hours exceeded (current: ${teacherLoad.weekly}h/week, max: ${teacher?.max_per_week}h/week)`
    } else if (rejectionReasons.teacherBusy > 0) {
      reason = 'Teacher already scheduled in all available slots'
    } else if (rejectionReasons.sectionConflict > 0) {
      reason = 'Section has conflicting classes in all available slots'
    } else if (rejectionReasons.teacherNotAvailable > 0) {
      reason = 'Teacher not available in any suitable time slots'
    } else if (rejectionReasons.noRoom > 0) {
      reason = 'No room with sufficient capacity available'
    } else if (rejectionReasons.wrongSlotType > 0 && kind === 'P') {
      reason = 'No lab slots available for practical'
    }

    this.warnings.push({
      offeringId: offering.id,
      kind,
      reason
    })

    return false
  }
  
  private getTeacherSchedule(teacherId: string): Map<string, number> {
    const schedule = new Map<string, number>()
    
    this.assignments.forEach(assignment => {
      if (assignment.offering?.teacher_id === teacherId || 
          this.offerings.find(o => o.id === assignment.offering_id)?.teacher_id === teacherId) {
        const slot = this.slots.get(assignment.slot_id)
        if (slot?.day) {
          schedule.set(slot.day, (schedule.get(slot.day) || 0) + 1)
        }
      }
    })
    
    return schedule
  }
  
  private hasSectionConflict(sectionId: string, slots: Slot[]): boolean {
    return this.assignments.some(assignment => {
      const offering = this.offerings.find(o => o.id === assignment.offering_id)
      if (offering?.section_id === sectionId) {
        const assignedSlot = this.slots.get(assignment.slot_id)
        return slots.some(slot => 
          slot.day === assignedSlot?.day &&
          this.slotsOverlap(slot, assignedSlot)
        )
      }
      return false
    })
  }
  
  private slotsOverlap(slot1: Slot, slot2: Slot): boolean {
    const start1 = this.parseTime(slot1.start_time)
    const end1 = this.parseTime(slot1.end_time)
    const start2 = this.parseTime(slot2.start_time)
    const end2 = this.parseTime(slot2.end_time)
    
    return (start1 < end2 && end1 > start2)
  }
  
  private hasAdjacentClass(teacherId: string, slot: Slot): boolean {
    return this.assignments.some(assignment => {
      if (assignment.offering?.teacher_id === teacherId || 
          this.offerings.find(o => o.id === assignment.offering_id)?.teacher_id === teacherId) {
        const assignedSlot = this.slots.get(assignment.slot_id)
        if (assignedSlot?.day === slot.day) {
          // Check if slots are adjacent (end of one is start of another)
          return assignedSlot.end_time === slot.start_time || 
                 assignedSlot.start_time === slot.end_time
        }
      }
      return false
    })
  }
  
  public generate(): GeneratorOutput {
    let totalSlotsRequired = 0
    let successfulAssignments = 0
    let failedAssignments = 0
    
    // Sort offerings to prioritize:
    // 1. Offerings with specific teacher preferences
    // 2. Lab courses (need specific rooms)
    // 3. Large classes (need specific rooms)
    // 4. Core courses over electives
    const sortedOfferings = [...this.offerings].sort((a, b) => {
      // Prioritize courses with labs
      const aHasLab = a.course.P > 0 ? 1 : 0
      const bHasLab = b.course.P > 0 ? 1 : 0
      if (aHasLab !== bHasLab) return bHasLab - aHasLab
      
      // Prioritize by expected size
      const aSize = a.expected_size || 30
      const bSize = b.expected_size || 30
      if (aSize !== bSize) return bSize - aSize
      
      // Prioritize core courses (usually lower year)
      const aYear = a.section?.year || 4
      const bYear = b.section?.year || 4
      return aYear - bYear
    })
    
    // Process each offering
    sortedOfferings.forEach(offering => {
      const course = offering.course
      
      // First assign practicals (they have more constraints)
      if (course.P > 0) {
        totalSlotsRequired++
        if (this.assignOffering(offering, 'P', course.P)) {
          successfulAssignments++
        } else {
          failedAssignments++
        }
      }
      
      // Then assign lectures (spread across days)
      for (let i = 0; i < course.L; i++) {
        totalSlotsRequired++
        if (this.assignOffering(offering, 'L', 1)) {
          successfulAssignments++
        } else {
          failedAssignments++
        }
      }
      
      // Finally assign tutorials
      for (let i = 0; i < course.T; i++) {
        totalSlotsRequired++
        if (this.assignOffering(offering, 'T', 1)) {
          successfulAssignments++
        } else {
          failedAssignments++
        }
      }
    })
    
    // Remove offering relations from assignments before returning
    const cleanAssignments = this.assignments.map(({ offering, ...assignment }) => assignment)
    
    // Log summary for debugging
    console.log('Timetable Generation Summary:')
    console.log(`Total offerings: ${this.offerings.length}`)
    console.log(`Total slots required: ${totalSlotsRequired}`)
    console.log(`Successful assignments: ${successfulAssignments}`)
    console.log(`Failed assignments: ${failedAssignments}`)
    console.log(`Utilization rate: ${((successfulAssignments / totalSlotsRequired) * 100).toFixed(2)}%`)
    
    if (this.warnings.length > 0) {
      console.log('\nWarnings:')
      this.warnings.forEach(w => {
        const offering = this.offerings.find(o => o.id === w.offeringId)
        console.log(`- ${offering?.course?.code || 'Unknown'} (${w.kind}): ${w.reason}`)
      })
    }
    
    return {
      assignments: cleanAssignments,
      stats: {
        totalOfferings: this.offerings.length,
        totalSlotsRequired,
        successfulAssignments,
        failedAssignments,
        utilizationRate: totalSlotsRequired > 0 
          ? (successfulAssignments / totalSlotsRequired) * 100 
          : 0
      },
      warnings: this.warnings
    }
  }
}