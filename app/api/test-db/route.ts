import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET() {
  try {
    // Test database connection
    const { data: courses, error } = await supabase
      .from('course')
      .select('*')
      .limit(5)
    
    return NextResponse.json({
      success: true,
      coursesCount: courses?.length || 0,
      courses: courses || [],
      error: error?.message || null
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}