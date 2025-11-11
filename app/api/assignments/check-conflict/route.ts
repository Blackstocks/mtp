import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { offeringsFixed } from '@/lib/db-fixed'
import { assignmentsFixed } from '@/lib/assignments-fixed'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { offering_id, slot_id, room_id, kind } = body
    
    // Get the offering details
    const offerings = await offeringsFixed.list()
    const offering = offerings.find(o => o.id === offering_id)
    
    if (!offering) {
      return NextResponse.json({
        success: false,
        conflicts: ['Offering not found']
      })
    }
    
    // Get current assignments
    const assignments = await assignmentsFixed.list()
    
    // Check for conflicts
    const conflicts: string[] = []
    
    // 1. Teacher conflict - same teacher teaching at the same time
    if (offering.teacher_id) {
      const teacherConflict = assignments.find(a => 
        a.slot_id === slot_id &&
        a.offering?.teacher_id === offering.teacher_id &&
        !(a.offering_id === offering_id && a.kind === kind) // Exclude current assignment
      )
      
      if (teacherConflict) {
        conflicts.push(`Teacher ${offering.teacher?.name} already has ${teacherConflict.offering?.course?.code} at this time`)
      }
    }
    
    // 2. Room conflict - same room occupied at the same time
    if (room_id) {
      const roomConflict = assignments.find(a =>
        a.slot_id === slot_id &&
        a.room_id === room_id &&
        !(a.offering_id === offering_id && a.kind === kind) // Exclude current assignment
      )
      
      if (roomConflict) {
        const { data: room } = await supabase
          .from('room')
          .select('code')
          .eq('id', room_id)
          .single()
          
        conflicts.push(`Room ${room?.code} is already occupied by ${roomConflict.offering?.course?.code}`)
      }
    }
    
    // 3. Section conflict - same section has another class at the same time
    const sectionConflict = assignments.find(a =>
      a.slot_id === slot_id &&
      a.offering?.section_id === offering.section_id &&
      !(a.offering_id === offering_id && a.kind === kind) // Exclude current assignment
    )
    
    if (sectionConflict) {
      conflicts.push(`Section ${offering.section?.name} already has ${sectionConflict.offering?.course?.code} at this time`)
    }
    
    // 4. Check slot type compatibility
    const { data: slot } = await supabase
      .from('slot')
      .select('is_lab')
      .eq('id', slot_id)
      .single()
      
    if (slot) {
      if (kind === 'P' && !slot.is_lab) {
        conflicts.push('Practical classes must be scheduled in lab slots')
      } else if (kind !== 'P' && slot.is_lab) {
        conflicts.push('Theory/Tutorial classes cannot be scheduled in lab slots')
      }
    }
    
    return NextResponse.json({
      success: conflicts.length === 0,
      conflicts
    })
    
  } catch (error: any) {
    console.error('Conflict check error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}