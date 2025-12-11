import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyAssignments() {
  console.log('=== VERIFYING ASSIGNMENTS ===\n')
  
  // Get all assignments with full details
  const { data: assignments, error } = await supabase
    .from('assignment')
    .select('*')
  
  console.log(`Total assignments: ${assignments?.length || 0}`)
  
  // Count by kind
  const counts = { L: 0, T: 0, P: 0 }
  assignments?.forEach(a => {
    counts[a.kind]++
  })
  
  console.log(`- Lectures (L): ${counts.L}`)
  console.log(`- Tutorials (T): ${counts.T}`)
  console.log(`- Practicals (P): ${counts.P}`)
  
  // Get lab assignments with details
  console.log('\nLab assignments details:')
  const labAssignments = assignments?.filter(a => a.kind === 'P') || []
  
  if (labAssignments.length > 0) {
    // Get offering and slot details for each lab assignment
    for (const assignment of labAssignments.slice(0, 5)) {
      const { data: offering } = await supabase
        .from('offering')
        .select(`
          *,
          course (code, name),
          section (program, year, name)
        `)
        .eq('id', assignment.offering_id)
        .single()
      
      const { data: slot } = await supabase
        .from('slot')
        .select('*')
        .eq('id', assignment.slot_id)
        .single()
      
      const { data: room } = await supabase
        .from('room')
        .select('*')
        .eq('id', assignment.room_id)
        .single()
      
      console.log(`  - ${offering?.course?.code} for ${offering?.section?.program} Year ${offering?.section?.year}`)
      console.log(`    Slot: ${slot?.code || slot?.cluster} on ${slot?.day} ${slot?.start_time}-${slot?.end_time}`)
      console.log(`    Room: ${room?.code} (${room?.kind})`)
    }
    
    if (labAssignments.length > 5) {
      console.log(`  ... and ${labAssignments.length - 5} more lab assignments`)
    }
  } else {
    console.log('  No lab assignments found!')
    
    // Check if lab slots are properly marked
    const { data: labSlots } = await supabase
      .from('slot')
      .select('*')
      .eq('is_lab', true)
    
    console.log(`\nLab slots in database: ${labSlots?.length || 0}`)
    
    // Check if there are lab rooms
    const { data: labRooms } = await supabase
      .from('room')
      .select('*')
      .eq('kind', 'LAB')
    
    console.log(`Lab rooms in database: ${labRooms?.length || 0}`)
    if (labRooms?.length === 0) {
      console.log('\nWARNING: No lab rooms found! This is why labs cannot be scheduled.')
      console.log('Creating some lab rooms...')
      
      // Create lab rooms
      const labRoomData = [
        { code: 'COMP-LAB1', kind: 'LAB', capacity: 30 },
        { code: 'COMP-LAB2', kind: 'LAB', capacity: 30 },
        { code: 'PHYSICS-LAB', kind: 'LAB', capacity: 40 },
        { code: 'ENGG-LAB', kind: 'LAB', capacity: 40 },
        { code: 'AERO-LAB1', kind: 'LAB', capacity: 30 },
        { code: 'AERO-LAB2', kind: 'LAB', capacity: 30 },
        { code: 'STRUCT-LAB', kind: 'LAB', capacity: 25 },
        { code: 'PROPULSION-LAB', kind: 'LAB', capacity: 25 }
      ]
      
      const { error: createError } = await supabase
        .from('room')
        .insert(labRoomData)
      
      if (createError) {
        console.error('Error creating lab rooms:', createError)
      } else {
        console.log(`Created ${labRoomData.length} lab rooms`)
      }
    }
  }
  
  process.exit(0)
}

verifyAssignments().catch(console.error)