import { NextResponse } from 'next/server'
import { supabase, teachers, rooms, slots, availability } from '@/lib/db'
import { assignmentsFixed } from '@/lib/assignments-fixed'
import { offeringsFixed } from '@/lib/db-fixed'
import { solverInputSchema, solverOutputSchema } from '@/lib/schemas'

const SOLVER_URL = process.env.SOLVER_URL || 'http://localhost:8001'

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
    
    // Prepare input for solver
    const solverInput = {
      teachers: teachersList,
      rooms: roomsList,
      slots: slotsList,
      offerings: offeringsList,
      availability: availabilityList,
      locked_assignments: assignmentsList.filter(a => a.is_locked)
    }
    
    // Validate input
    const validatedInput = solverInputSchema.parse(solverInput)
    
    // Call solver
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
    
    // Clear existing unlocked assignments
    await assignmentsFixed.deleteUnlocked()
    
    // Insert new assignments
    if (validatedOutput.assignments.length > 0) {
      await assignmentsFixed.bulkUpsert(validatedOutput.assignments)
    }
    
    return NextResponse.json({
      success: true,
      assignments: validatedOutput.assignments.length,
      stats: validatedOutput.stats,
      warnings: validatedOutput.warnings
    })
    
  } catch (error: any) {
    console.error('Generate timetable error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}