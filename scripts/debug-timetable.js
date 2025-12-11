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

async function debugTimetable() {
  console.log('=== DEBUGGING TIMETABLE DISPLAY ISSUE ===\n')
  
  // 1. Check if there are any assignments
  const { count: assignmentCount } = await supabase
    .from('assignment')
    .select('*', { count: 'exact', head: true })
  
  console.log(`Total assignments in database: ${assignmentCount}\n`)
  
  // 2. Test the assignmentsFixed.list() logic
  console.log('TESTING ASSIGNMENT QUERY LOGIC:\n')
  
  // Get assignments
  const { data: assignmentsData } = await supabase
    .from('assignment')
    .select('*')
    .limit(5)
  
  console.log(`Raw assignments found: ${assignmentsData?.length || 0}`)
  
  if (assignmentsData && assignmentsData.length > 0) {
    console.log('\nFirst assignment:')
    console.log(JSON.stringify(assignmentsData[0], null, 2))
    
    // Get unique IDs
    const offeringIds = [...new Set(assignmentsData.map(a => a.offering_id))]
    
    // Check if offerings exist
    const { data: offerings } = await supabase
      .from('offering')
      .select('*')
      .in('id', offeringIds)
    
    console.log(`\nOfferings found for assignments: ${offerings?.length || 0}`)
    
    if (offerings && offerings.length > 0) {
      // Get related data for first offering
      const offering = offerings[0]
      
      const { data: course } = await supabase
        .from('course')
        .select('*')
        .eq('id', offering.course_id)
        .single()
      
      const { data: teacher } = await supabase
        .from('teacher')
        .select('*')
        .eq('id', offering.teacher_id)
        .single()
      
      const { data: section } = await supabase
        .from('section')
        .select('*')
        .eq('id', offering.section_id)
        .single()
      
      console.log('\nOffering details:')
      console.log(`- Course: ${course?.code} - ${course?.name}`)
      console.log(`- Teacher: ${teacher?.name}`)
      console.log(`- Section: ${section?.program} Y${section?.year}`)
    }
  }
  
  // 3. Test what the API returns
  console.log('\n\nTESTING API ENDPOINTS:\n')
  
  try {
    // Get sections for testing
    const { data: sections } = await supabase
      .from('section')
      .select('*')
      .limit(1)
    
    if (sections && sections.length > 0) {
      console.log(`Testing with section: ${sections[0].name}`)
      
      const response = await fetch('http://localhost:3000/api/timetables/section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: sections[0].id })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`Section timetable returned ${data.assignments?.length || 0} assignments`)
        
        if (data.assignments && data.assignments.length > 0) {
          console.log('\nFirst assignment from API:')
          const first = data.assignments[0]
          console.log(`- Course: ${first.offering?.course?.code}`)
          console.log(`- Teacher: ${first.offering?.teacher?.name}`)
          console.log(`- Slot: ${first.slot?.day} ${first.slot?.start_time}`)
        }
      }
    }
  } catch (error) {
    console.error('API test error:', error)
  }
  
  // 4. Check for multiple teachers in same slot
  console.log('\n\nCHECKING FOR MULTIPLE TEACHERS IN SAME SLOT:\n')
  
  const { data: allAssignments } = await supabase
    .from('assignment')
    .select(`
      *,
      offering (
        teacher_id,
        teacher (name),
        course (code)
      ),
      slot (day, start_time, end_time)
    `)
  
  // Group by slot
  const slotMap = {}
  allAssignments?.forEach(assignment => {
    if (assignment.slot) {
      const slotKey = `${assignment.slot.day} ${assignment.slot.start_time}-${assignment.slot.end_time}`
      if (!slotMap[slotKey]) {
        slotMap[slotKey] = []
      }
      slotMap[slotKey].push(assignment)
    }
  })
  
  // Find slots with multiple classes
  let slotsWithMultiple = 0
  Object.entries(slotMap).forEach(([slot, assignments]) => {
    if (assignments.length > 1) {
      slotsWithMultiple++
      if (slotsWithMultiple <= 3) {
        console.log(`\n${slot}: ${assignments.length} classes`)
        // Group by teacher
        const teacherGroups = {}
        assignments.forEach(a => {
          const teacherId = a.offering?.teacher_id || 'no-teacher'
          if (!teacherGroups[teacherId]) {
            teacherGroups[teacherId] = []
          }
          teacherGroups[teacherId].push(a)
        })
        
        Object.entries(teacherGroups).forEach(([teacherId, teacherAssignments]) => {
          if (teacherAssignments.length > 1) {
            console.log(`  WARNING: Teacher ${teacherAssignments[0].offering?.teacher?.name} has ${teacherAssignments.length} classes:`)
            teacherAssignments.forEach(a => {
              console.log(`    - ${a.offering?.course?.code} (${a.kind}) in room ${a.room_id}`)
            })
          } else {
            const a = teacherAssignments[0]
            console.log(`  ✓ ${a.offering?.teacher?.name}: ${a.offering?.course?.code} (${a.kind})`)
          }
        })
      }
    }
  })
  
  if (slotsWithMultiple > 3) {
    console.log(`\n... and ${slotsWithMultiple - 3} more slots with multiple classes`)
  }
  
  console.log(`\nTotal slots with multiple classes: ${slotsWithMultiple}`)
  
  process.exit(0)
}

debugTimetable().catch(console.error)