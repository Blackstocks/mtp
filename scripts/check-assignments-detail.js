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

async function checkAssignmentsDetail() {
  console.log('=== DETAILED ASSIGNMENT CHECK ===\n')
  
  // 1. Get raw assignments
  const { data: rawAssignments, error: rawError } = await supabase
    .from('assignment')
    .select('*')
    .limit(10)
  
  console.log('RAW ASSIGNMENTS:')
  console.log(`Count: ${rawAssignments?.length || 0}`)
  if (rawAssignments && rawAssignments.length > 0) {
    console.log('\nFirst assignment:')
    console.log(JSON.stringify(rawAssignments[0], null, 2))
  }
  
  // 2. Check offerings
  console.log('\n\nCHECKING OFFERINGS:')
  const { data: offerings, count: offeringCount } = await supabase
    .from('offering')
    .select('*', { count: 'exact', head: false })
    .limit(5)
  
  console.log(`Total offerings: ${offeringCount}`)
  if (offerings && offerings.length > 0) {
    console.log('\nFirst offering:')
    console.log(JSON.stringify(offerings[0], null, 2))
  }
  
  // 3. Check if offering_ids in assignments exist
  if (rawAssignments && rawAssignments.length > 0) {
    console.log('\n\nCHECKING OFFERING IDS IN ASSIGNMENTS:')
    const offeringIds = [...new Set(rawAssignments.map(a => a.offering_id))]
    
    for (const offeringId of offeringIds.slice(0, 3)) {
      const { data: offering } = await supabase
        .from('offering')
        .select(`
          *,
          teacher:teacher_id (name),
          course:course_id (code, name),
          section:section_id (program, year)
        `)
        .eq('id', offeringId)
        .single()
      
      if (offering) {
        console.log(`\nOffering ${offeringId}:`)
        console.log(`- Course: ${offering.course?.code || 'NOT FOUND'}`)
        console.log(`- Teacher: ${offering.teacher?.name || 'NOT FOUND'}`)
        console.log(`- Section: ${offering.section?.program || 'NOT FOUND'} Y${offering.section?.year || '?'}`)
      } else {
        console.log(`\nOffering ${offeringId}: NOT FOUND IN DATABASE`)
      }
    }
  }
  
  // 4. Try a different join approach
  console.log('\n\nTRYING MANUAL JOIN:')
  
  if (rawAssignments && rawAssignments.length > 0) {
    const firstAssignment = rawAssignments[0]
    
    // Get slot
    const { data: slot } = await supabase
      .from('slot')
      .select('*')
      .eq('id', firstAssignment.slot_id)
      .single()
    
    // Get room
    const { data: room } = await supabase
      .from('room')
      .select('*')
      .eq('id', firstAssignment.room_id)
      .single()
    
    // Get offering with relations
    const { data: offering } = await supabase
      .from('offering')
      .select(`
        *,
        teacher (name),
        course (code, name),
        section (program, year, name)
      `)
      .eq('id', firstAssignment.offering_id)
      .single()
    
    console.log('Assignment details:')
    console.log(`- Slot: ${slot?.day} ${slot?.start_time}-${slot?.end_time}`)
    console.log(`- Room: ${room?.code}`)
    console.log(`- Offering:`)
    console.log(`  - Course: ${offering?.course?.code}`)
    console.log(`  - Teacher: ${offering?.teacher?.name}`)
    console.log(`  - Section: ${offering?.section?.name}`)
  }
  
  // 5. Check timetable page query
  console.log('\n\nCHECKING TIMETABLE PAGE QUERY:')
  
  // This mimics what the timetable page does
  const { data: timetableData } = await supabase
    .from('assignment')
    .select(`
      *,
      offering!offering_id (
        *,
        teacher!teacher_id (*),
        course!course_id (*),
        section!section_id (*)
      ),
      slot!slot_id (*),
      room!room_id (*)
    `)
    .limit(5)
  
  console.log(`Timetable query returned: ${timetableData?.length || 0} assignments`)
  
  if (timetableData && timetableData.length > 0) {
    console.log('\nFirst assignment from timetable query:')
    const first = timetableData[0]
    console.log(`- Course: ${first.offering?.course?.code || 'MISSING'}`)
    console.log(`- Teacher: ${first.offering?.teacher?.name || 'MISSING'}`)
    console.log(`- Room: ${first.room?.code || 'MISSING'}`)
    console.log(`- Slot: ${first.slot?.day || 'MISSING'} ${first.slot?.start_time || 'MISSING'}`)
  }
  
  process.exit(0)
}

checkAssignmentsDetail().catch(console.error)