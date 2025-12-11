import { NextResponse } from 'next/server'
import { supabase, teachers, rooms, slots } from '@/lib/db'
import { assignmentsFixed } from '@/lib/assignments-fixed'
import { offeringsFixed } from '@/lib/db-fixed'
import { TimetableGenerator } from '@/lib/timetable-generator'

export async function POST() {
  try {
    console.log('Starting local timetable generation...')
    
    // Fetch all required data
    const [teachersList, roomsList, slotsList, offeringsList, availabilityList, assignmentsList] = await Promise.all([
      teachers.list(),
      rooms.list(),
      slots.list(),
      offeringsFixed.list(),
      supabase.from('availability').select('*').then(r => r.data || []),
      assignmentsFixed.list()
    ])
    
    console.log('Fetched data:', {
      teachers: teachersList.length,
      rooms: roomsList.length,
      slots: slotsList.length,
      offerings: offeringsList.length,
      availability: availabilityList.length,
      existingAssignments: assignmentsList.length
    })
    
    // Create generator instance
    const generator = new TimetableGenerator({
      teachers: teachersList,
      rooms: roomsList,
      slots: slotsList,
      offerings: offeringsList,
      availability: availabilityList,
      lockedAssignments: assignmentsList.filter(a => a.is_locked)
    })
    
    // Generate timetable
    const result = generator.generate()
    
    console.log('Generation complete:', {
      totalAssignments: result.assignments.length,
      stats: result.stats,
      warnings: result.warnings.length
    })
    
    // Clear existing unlocked assignments
    await assignmentsFixed.deleteUnlocked()
    
    // Insert new assignments in batches
    if (result.assignments.length > 0) {
      const batchSize = 50
      for (let i = 0; i < result.assignments.length; i += batchSize) {
        const batch = result.assignments.slice(i, i + batchSize)
        await assignmentsFixed.bulkUpsert(batch)
      }
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
    
  } catch (error: any) {
    console.error('Generate timetable error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}