import { NextResponse } from 'next/server'
import { offeringsFixed } from '@/lib/db-fixed'

export async function GET() {
  try {
    const offerings = await offeringsFixed.list()
    
    return NextResponse.json({
      success: true,
      offerings,
      count: offerings.length
    })
  } catch (error: any) {
    console.error('List offerings error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}