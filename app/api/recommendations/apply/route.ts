import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    
    const { recommendation, assignment } = body
    
    if (!recommendation || !assignment) {
      return NextResponse.json(
        { success: false, error: 'Missing recommendation or assignment data' },
        { status: 400 }
      )
    }
    
    // Start a transaction by updating the assignment
    const { data: updatedAssignment, error: updateError } = await supabase
      .from('assignment')
      .update({
        slot_id: recommendation.slot_id,
        room_id: recommendation.room_id
      })
      .eq('offering_id', assignment.offering_id)
      .eq('kind', assignment.kind)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating assignment:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update assignment' },
        { status: 500 }
      )
    }
    
    // If there are swaps needed, handle them here
    if (recommendation.swaps && recommendation.swaps.length > 0) {
      for (const swap of recommendation.swaps) {
        const { error: swapError } = await supabase
          .from('assignment')
          .update({
            slot_id: swap.new_slot_id,
            room_id: swap.new_room_id
          })
          .eq('offering_id', swap.offering_id)
          .eq('kind', swap.kind)
        
        if (swapError) {
          console.error('Error applying swap:', swapError)
          // Consider rolling back previous updates
          return NextResponse.json(
            { success: false, error: 'Failed to apply swaps' },
            { status: 500 }
          )
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      assignment: updatedAssignment
    })
    
  } catch (error) {
    console.error('Error in apply recommendation:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}