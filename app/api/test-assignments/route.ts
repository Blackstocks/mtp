import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET() {
  try {
    // Test 1: Direct query
    const { data: test1, error: error1 } = await supabase
      .from('assignment')
      .select('*')
      .limit(1)
    
    // Test 2: With offering relation (old style)
    let test2Error = null
    try {
      const { data, error } = await supabase
        .from('assignment')
        .select(`
          *,
          offering:offering_id(*)
        `)
        .limit(1)
      test2Error = error
    } catch (e: any) {
      test2Error = e.message
    }
    
    // Test 3: With offering relation (new style)
    const { data: test3, error: error3 } = await supabase
      .from('assignment')
      .select(`
        *,
        offering(*)
      `)
      .limit(1)
    
    return NextResponse.json({
      success: true,
      tests: {
        direct: { success: !error1, error: error1, data: test1 },
        oldStyle: { success: !test2Error, error: test2Error },
        newStyle: { success: !error3, error: error3, data: test3 }
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}