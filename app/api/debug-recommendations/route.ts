import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET() {
  try {
    // Check offerings
    const { data: offerings } = await supabase
      .from('offering')
      .select('id, teacher_id, course_id, section_id')
    
    const stats = {
      totalOfferings: offerings?.length || 0,
      offeringsWithTeacher: offerings?.filter(o => o.teacher_id).length || 0,
      offeringsWithoutTeacher: offerings?.filter(o => !o.teacher_id).length || 0,
    }
    
    // Check availability
    const { data: availability } = await supabase
      .from('availability')
      .select('teacher_id, slot_id')
    
    stats.totalAvailability = availability?.length || 0
    
    // Check teachers
    const { data: teachers } = await supabase
      .from('teacher')
      .select('id, name')
    
    stats.totalTeachers = teachers?.length || 0
    
    // Sample some offerings without teachers
    const noTeacherOfferings = offerings?.filter(o => !o.teacher_id).slice(0, 5) || []
    
    return NextResponse.json({
      stats,
      sampleOfferingsWithoutTeacher: noTeacherOfferings,
      message: 'Offerings without teachers may not show recommendations if teacher availability is required'
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}