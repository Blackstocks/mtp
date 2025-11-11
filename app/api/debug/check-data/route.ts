import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET() {
  try {
    // Check all tables
    const [teachers, courses, sections, offerings, slots] = await Promise.all([
      supabase.from('teacher').select('*').limit(10),
      supabase.from('course').select('*').limit(10),
      supabase.from('section').select('*').limit(10),
      supabase.from('offering').select('*').limit(10),
      supabase.from('slot').select('*').limit(10)
    ])

    const counts = await Promise.all([
      supabase.from('teacher').select('*', { count: 'exact', head: true }),
      supabase.from('course').select('*', { count: 'exact', head: true }),
      supabase.from('section').select('*', { count: 'exact', head: true }),
      supabase.from('offering').select('*', { count: 'exact', head: true }),
      supabase.from('slot').select('*', { count: 'exact', head: true })
    ])

    return NextResponse.json({
      success: true,
      counts: {
        teachers: counts[0].count,
        courses: counts[1].count,
        sections: counts[2].count,
        offerings: counts[3].count,
        slots: counts[4].count
      },
      samples: {
        teachers: teachers.data?.slice(0, 3),
        courses: courses.data?.slice(0, 3),
        sections: sections.data?.slice(0, 3),
        offerings: offerings.data,
        slots: slots.data?.slice(0, 3)
      },
      errors: {
        teachers: teachers.error,
        courses: courses.error,
        sections: sections.error,
        offerings: offerings.error,
        slots: slots.error
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}