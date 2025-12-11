import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('Apply recommendation endpoint called')
    
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const { recommendation, assignment } = body
    
    if (!recommendation || !assignment) {
      console.log('Missing data:', { recommendation: !!recommendation, assignment: !!assignment })
      return NextResponse.json(
        { success: false, error: 'Missing recommendation or assignment data' },
        { status: 400 }
      )
    }
    
    // For now, just return success to test the endpoint
    return NextResponse.json({
      success: true,
      message: 'Test endpoint working',
      data: { recommendation, assignment }
    })
    
  } catch (error: any) {
    console.error('Error in apply recommendation test:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}