import { NextRequest, NextResponse } from 'next/server'
import { supabase, teachers, rooms, slots, availability } from '@/lib/db'
import { assignmentsFixed } from '@/lib/assignments-fixed'
import { offeringsFixed } from '@/lib/db-fixed'
import { recommendationSchema } from '@/lib/schemas'

const SOLVER_URL = process.env.SOLVER_URL || 'http://localhost:8001'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { offering_id, kind } = body
    
    if (!offering_id || !kind) {
      return NextResponse.json(
        { success: false, error: 'offering_id and kind are required' },
        { status: 400 }
      )
    }
    
    // Fetch all required data
    const [teachersList, roomsList, slotsList, offeringsList, availabilityList, assignmentsList] = await Promise.all([
      teachers.list(),
      rooms.list(),
      slots.list(),
      offeringsFixed.list(),
      supabase.from('availability').select('*').then(r => r.data || []),
      assignmentsFixed.list()
    ])
    
    // Prepare request for solver
    const recommendationRequest = {
      offering_id,
      kind,
      teachers: teachersList,
      rooms: roomsList,
      slots: slotsList,
      offerings: offeringsList,
      availability: availabilityList,
      current_assignments: assignmentsList
    }
    
    // Call solver for recommendations
    const response = await fetch(`${SOLVER_URL}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recommendationRequest)
    })
    
    if (!response.ok) {
      throw new Error(`Solver returned ${response.status}: ${await response.text()}`)
    }
    
    const result = await response.json()
    const recommendations = result.recommendations || []
    
    // Enhance recommendations with slot and room details
    const enhancedRecommendations = recommendations.map((rec: any) => {
      const slot = slotsList.find(s => s.id === rec.slot_id)
      const room = roomsList.find(r => r.id === rec.room_id)
      
      return {
        ...rec,
        slot,
        room,
        display: `${slot?.code}${slot?.occ} ${slot?.day} ${slot?.start_time}-${slot?.end_time} in ${room?.code}`
      }
    })
    
    return NextResponse.json({
      success: true,
      recommendations: enhancedRecommendations
    })
    
  } catch (error: any) {
    console.error('Recommendations error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}