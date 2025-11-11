import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function POST() {
  try {
    // Get all teachers and slots
    const { data: teachers } = await supabase.from('teacher').select('id')
    const { data: slots } = await supabase.from('slot').select('id')
    
    if (!teachers || !slots) {
      return NextResponse.json({
        success: false,
        error: 'No teachers or slots found'
      })
    }
    
    // Create availability for all teachers for all slots
    // In real scenario, you'd be more selective
    const availabilities = []
    
    for (const teacher of teachers) {
      for (const slot of slots) {
        availabilities.push({
          teacher_id: teacher.id,
          slot_id: slot.id,
          can_teach: true
        })
      }
    }
    
    // Insert in batches
    const batchSize = 1000
    let created = 0
    
    for (let i = 0; i < availabilities.length; i += batchSize) {
      const batch = availabilities.slice(i, i + batchSize)
      const { error } = await supabase
        .from('availability')
        .upsert(batch, {
          onConflict: 'teacher_id,slot_id',
          ignoreDuplicates: true
        })
      
      if (!error) {
        created += batch.length
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Set availability for ${teachers.length} teachers across ${slots.length} slots`,
      total_availability: created
    })
    
  } catch (error: any) {
    console.error('Set availability error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}