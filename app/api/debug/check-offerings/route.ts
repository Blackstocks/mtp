import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET() {
  try {
    // Check all relevant tables
    const [teachers, courses, sections, offerings] = await Promise.all([
      supabase.from('teacher').select('*').limit(5),
      supabase.from('course').select('*').limit(5),
      supabase.from('section').select('*'),
      supabase.from('offering').select('*')
    ])

    // Try to create a test offering
    let testResult = null
    if (teachers.data?.length && courses.data?.length && sections.data?.length) {
      const testOffering = {
        course_id: courses.data[0].id,
        section_id: sections.data[0].id,
        teacher_id: teachers.data[0].id,
        expected_size: 60,
        needs: ['Projector']
      }
      
      const { data: testData, error: testError } = await supabase
        .from('offering')
        .insert(testOffering)
        .select()
        
      testResult = { data: testData, error: testError, testOffering }
    }

    return NextResponse.json({
      success: true,
      counts: {
        teachers: teachers.data?.length || 0,
        courses: courses.data?.length || 0,
        sections: sections.data?.length || 0,
        offerings: offerings.data?.length || 0
      },
      samples: {
        teachers: teachers.data?.slice(0, 2),
        courses: courses.data?.slice(0, 2),
        sections: sections.data,
        offerings: offerings.data
      },
      testResult,
      debug: {
        teacherIds: teachers.data?.map(t => ({ id: t.id, code: t.code, name: t.name })),
        courseIds: courses.data?.map(c => ({ id: c.id, code: c.code, name: c.name })),
        sectionIds: sections.data?.map(s => ({ id: s.id, name: s.name, program: s.program }))
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}