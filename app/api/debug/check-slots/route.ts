import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET() {
  try {
    const { data: slots, error } = await supabase
      .from('slot')
      .select('*')
      .limit(5)
    
    return NextResponse.json({
      success: true,
      slots: slots,
      sample: slots?.[0],
      timeFormats: {
        start_time: slots?.[0]?.start_time,
        end_time: slots?.[0]?.end_time,
        start_type: typeof slots?.[0]?.start_time,
        end_type: typeof slots?.[0]?.end_time
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}