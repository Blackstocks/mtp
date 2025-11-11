import { NextResponse } from 'next/server'
import { assignmentsFixed } from '@/lib/assignments-fixed'

export async function GET() {
  try {
    const assignments = await assignmentsFixed.list()
    
    return NextResponse.json({
      success: true,
      assignments,
      count: assignments.length
    })
  } catch (error: any) {
    console.error('List assignments error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}