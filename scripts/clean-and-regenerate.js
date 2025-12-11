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

async function cleanAndRegenerate() {
  console.log('=== CLEANING ORPHANED ASSIGNMENTS AND REGENERATING ===\n')
  
  // 1. Get all current offering IDs
  const { data: offerings } = await supabase
    .from('offering')
    .select('id')
  
  const validOfferingIds = new Set(offerings?.map(o => o.id) || [])
  console.log(`Found ${validOfferingIds.size} valid offerings\n`)
  
  // 2. Get all assignments
  const { data: allAssignments } = await supabase
    .from('assignment')
    .select('*')
  
  console.log(`Found ${allAssignments?.length || 0} total assignments\n`)
  
  // 3. Find orphaned assignments
  const orphanedAssignments = allAssignments?.filter(a => !validOfferingIds.has(a.offering_id)) || []
  console.log(`Found ${orphanedAssignments.length} orphaned assignments (referencing non-existent offerings)\n`)
  
  // 4. Delete orphaned assignments
  if (orphanedAssignments.length > 0) {
    console.log('Deleting orphaned assignments...')
    const { error } = await supabase
      .from('assignment')
      .delete()
      .in('offering_id', orphanedAssignments.map(a => a.offering_id))
    
    if (error) {
      console.error('Error deleting orphaned assignments:', error)
    } else {
      console.log('✓ Orphaned assignments deleted\n')
    }
  }
  
  // 5. Check current state
  console.log('CHECKING CURRENT STATE:\n')
  
  const { data: remainingAssignments } = await supabase
    .from('assignment')
    .select(`
      *,
      offering (
        teacher (name),
        course (code, name),
        section (program, year)
      ),
      slot (day, start_time),
      room (code)
    `)
    .limit(10)
  
  console.log(`Remaining valid assignments: ${remainingAssignments?.length || 0}`)
  
  if (remainingAssignments && remainingAssignments.length > 0) {
    console.log('\nSample valid assignments:')
    remainingAssignments.forEach(a => {
      console.log(`- ${a.offering?.course?.code} by ${a.offering?.teacher?.name} in ${a.room?.code} at ${a.slot?.day} ${a.slot?.start_time}`)
    })
  }
  
  // 6. Check offerings without assignments
  console.log('\n\nCHECKING OFFERINGS WITHOUT ASSIGNMENTS:\n')
  
  const { data: offeringsWithDetails } = await supabase
    .from('offering')
    .select(`
      *,
      teacher (name),
      course (code, name, L, T, P),
      section (program, year, name)
    `)
  
  const { data: assignedOfferingIds } = await supabase
    .from('assignment')
    .select('offering_id')
  
  const assignedIds = new Set(assignedOfferingIds?.map(a => a.offering_id) || [])
  const unscheduledOfferings = offeringsWithDetails?.filter(o => !assignedIds.has(o.id)) || []
  
  console.log(`Total offerings: ${offeringsWithDetails?.length || 0}`)
  console.log(`Scheduled offerings: ${assignedIds.size}`)
  console.log(`Unscheduled offerings: ${unscheduledOfferings.length}`)
  
  if (unscheduledOfferings.length > 0) {
    console.log('\nFirst 5 unscheduled offerings:')
    unscheduledOfferings.slice(0, 5).forEach(o => {
      console.log(`- ${o.course?.code} for ${o.section?.name} by ${o.teacher?.name || 'NO TEACHER'}`)
    })
  }
  
  // 7. Regenerate timetable
  console.log('\n\nREGENERATING TIMETABLE...\n')
  
  try {
    const response = await fetch('http://localhost:3000/api/solver/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('Timetable generation result:')
      console.log(`- Total assignments created: ${result.assignments}`)
      console.log(`- Success rate: ${result.stats?.utilization?.toFixed(1)}%`)
      console.log(`- Failed assignments: ${result.stats?.failed_assignments || 0}`)
      
      // 8. Verify new assignments
      console.log('\n\nVERIFYING NEW ASSIGNMENTS:\n')
      
      const { data: newAssignments } = await supabase
        .from('assignment')
        .select(`
          *,
          offering (
            teacher (name),
            course (code),
            section (name)
          ),
          slot (day, start_time),
          room (code)
        `)
        .limit(5)
      
      console.log(`New assignments sample (${newAssignments?.length || 0} shown):`)
      newAssignments?.forEach(a => {
        console.log(`- ${a.offering?.course?.code} by ${a.offering?.teacher?.name} in ${a.room?.code} at ${a.slot?.day} ${a.slot?.start_time}`)
      })
    } else {
      const error = await response.text()
      console.error('Error regenerating timetable:', error)
    }
  } catch (error) {
    console.error('Error calling API:', error)
  }
  
  process.exit(0)
}

cleanAndRegenerate().catch(console.error)