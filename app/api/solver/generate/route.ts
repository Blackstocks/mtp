import { NextResponse } from 'next/server'
import { supabase, teachers, rooms, slots, availability } from '@/lib/db'
import { assignmentsFixed } from '@/lib/assignments-fixed'
import { offeringsFixed } from '@/lib/db-fixed'
import { solverInputSchema, solverOutputSchema } from '@/lib/schemas'
import { TimetableGenerator } from '@/lib/timetable-generator'

const SOLVER_URL = process.env.SOLVER_URL || 'http://localhost:8001'
const USE_LOCAL_GENERATOR = true // Set to false to use external solver

export async function POST() {
  try {
    // Fetch all required data
    const [teachersList, roomsList, slotsList, offeringsList, availabilityList, assignmentsList] = await Promise.all([
      teachers.list(),
      rooms.list(),
      slots.list(),
      offeringsFixed.list(),
      supabase.from('availability').select('*').then(r => r.data || []),
      assignmentsFixed.list()
    ])
    
    if (USE_LOCAL_GENERATOR) {
      // Use local optimized generator
      console.log('Using local timetable generator...')
      
      const generator = new TimetableGenerator({
        teachers: teachersList,
        rooms: roomsList,
        slots: slotsList,
        offerings: offeringsList,
        availability: availabilityList,
        lockedAssignments: assignmentsList.filter(a => a.is_locked)
      })
      
      const result = generator.generate()
      
      // Clear existing unlocked assignments
      await assignmentsFixed.deleteUnlocked()
      
      // Insert new assignments
      if (result.assignments.length > 0) {
        await assignmentsFixed.bulkUpsert(result.assignments)
      }
      
      return NextResponse.json({
        success: true,
        assignments: result.assignments.length,
        stats: {
          total_offerings: result.stats.totalOfferings,
          total_slots_required: result.stats.totalSlotsRequired,
          successful_assignments: result.stats.successfulAssignments,
          failed_assignments: result.stats.failedAssignments,
          utilization: result.stats.utilizationRate
        },
        warnings: result.warnings,
        skipped: result.warnings
      })
      
    } else {
      // Use external solver
      const solverInput = {
        teachers: teachersList,
        rooms: roomsList,
        slots: slotsList,
        offerings: offeringsList,
        availability: availabilityList,
        locked_assignments: assignmentsList.filter(a => a.is_locked)
      }
      
      const validatedInput = solverInputSchema.parse(solverInput)
      
      const response = await fetch(`${SOLVER_URL}/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedInput)
      })
      
      if (!response.ok) {
        throw new Error(`Solver returned ${response.status}: ${await response.text()}`)
      }
      
      const result = await response.json()
      const validatedOutput = solverOutputSchema.parse(result)
      
      await assignmentsFixed.deleteUnlocked()
      
      if (validatedOutput.assignments.length > 0) {
        await assignmentsFixed.bulkUpsert(validatedOutput.assignments)
      }
      
      return NextResponse.json({
        success: true,
        assignments: validatedOutput.assignments.length,
        stats: validatedOutput.stats,
        warnings: validatedOutput.warnings
      })
    }
    
  } catch (error: any) {
    console.error('Generate timetable error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}