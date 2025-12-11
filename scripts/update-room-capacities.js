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

async function updateRoomCapacities() {
  console.log('=== UPDATING ROOM CAPACITIES ===\n')
  
  // Get all offerings to see expected sizes
  const { data: offerings } = await supabase
    .from('offering')
    .select(`
      expected_size,
      course (code, name, P),
      section (program, year, name)
    `)
  
  console.log('1. CHECKING OFFERING SIZES:')
  const labOfferings = offerings?.filter(o => o.course?.P > 0) || []
  const avgLabSize = labOfferings.reduce((sum, o) => sum + (o.expected_size || 30), 0) / (labOfferings.length || 1)
  console.log(`  Lab offerings: ${labOfferings.length}`)
  console.log(`  Average expected size: ${avgLabSize.toFixed(0)}`)
  
  // Get current rooms
  console.log('\n2. CURRENT ROOM CAPACITIES:')
  const { data: rooms } = await supabase
    .from('room')
    .select('*')
    .order('kind, code')
  
  rooms?.forEach(room => {
    console.log(`  ${room.code}: ${room.kind} - capacity ${room.capacity}`)
  })
  
  // Update lab room capacities to match expected sizes
  console.log('\n3. UPDATING LAB ROOM CAPACITIES...')
  const labRooms = rooms?.filter(r => r.kind === 'LAB') || []
  
  for (const room of labRooms) {
    // Set all lab rooms to capacity 60 to handle first year classes
    const { error } = await supabase
      .from('room')
      .update({ capacity: 60 })
      .eq('id', room.id)
    
    if (error) {
      console.error(`Error updating ${room.code}:`, error)
    } else {
      console.log(`  Updated ${room.code} to capacity 60`)
    }
  }
  
  // Add more lab rooms if needed
  console.log('\n4. ADDING MORE LAB ROOMS...')
  const newLabRooms = [
    { code: 'WORKSHOP-1', kind: 'LAB', capacity: 60 },
    { code: 'WORKSHOP-2', kind: 'LAB', capacity: 60 },
    { code: 'CAD-LAB', kind: 'LAB', capacity: 40 },
    { code: 'MECH-LAB', kind: 'LAB', capacity: 40 }
  ]
  
  for (const newRoom of newLabRooms) {
    // Check if room already exists
    const { data: existing } = await supabase
      .from('room')
      .select('id')
      .eq('code', newRoom.code)
      .single()
    
    if (!existing) {
      const { error } = await supabase
        .from('room')
        .insert(newRoom)
      
      if (error) {
        console.error(`Error creating ${newRoom.code}:`, error)
      } else {
        console.log(`  Created ${newRoom.code} with capacity ${newRoom.capacity}`)
      }
    }
  }
  
  // 5. Regenerate timetable
  console.log('\n5. REGENERATING TIMETABLE...')
  try {
    const response = await fetch('http://localhost:3000/api/solver/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log(`\nTimetable generated!`)
      console.log(`- Total assignments: ${result.assignments}`)
      console.log(`- Utilization: ${result.stats?.utilization?.toFixed(1)}%`)
      
      // Check lab assignment success
      const labWarnings = result.warnings?.filter(w => w.kind === 'P') || []
      console.log(`\nLab scheduling results:`)
      console.log(`- Failed lab assignments: ${labWarnings.length}`)
      
      if (labWarnings.length > 0) {
        console.log('\nFailed lab courses:')
        // Get unique course codes
        const failedCourses = new Set()
        for (const warning of labWarnings) {
          const { data: offering } = await supabase
            .from('offering')
            .select('course (code)')
            .eq('id', warning.offeringId)
            .single()
          
          if (offering?.course?.code) {
            failedCourses.add(offering.course.code)
          }
        }
        
        failedCourses.forEach(code => {
          console.log(`  - ${code}`)
        })
      }
    } else {
      console.error('Failed to generate timetable')
    }
  } catch (error) {
    console.error('Error calling API:', error)
  }
  
  process.exit(0)
}

updateRoomCapacities().catch(console.error)