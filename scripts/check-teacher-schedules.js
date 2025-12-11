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

async function checkTeacherSchedules() {
  console.log('=== CHECKING TEACHER SCHEDULES AND VISIBILITY ===\n')
  
  // 1. Get all assignments with full details
  const { data: assignments } = await supabase
    .from('assignment')
    .select(`
      *,
      slot (day, start_time, end_time, code),
      room (code, name),
      offering:offering_id (
        id,
        teacher:teacher_id (id, name),
        course:course_id (code, name),
        section:section_id (program, year, name)
      )
    `)
    .order('slot(day), slot(start_time)')
  
  console.log(`Total assignments in database: ${assignments?.length || 0}\n`)
  
  // 2. Check for teachers with multiple classes in same slot
  console.log('CHECKING FOR TEACHERS WITH MULTIPLE CLASSES IN SAME TIME SLOT:\n')
  
  const teacherSlotMap = {}
  
  assignments?.forEach(assignment => {
    if (assignment.slot && assignment.offering?.teacher) {
      const slotKey = `${assignment.slot.day} ${assignment.slot.start_time}-${assignment.slot.end_time}`
      const teacherId = assignment.offering.teacher.id
      const teacherName = assignment.offering.teacher.name
      
      if (!teacherSlotMap[slotKey]) {
        teacherSlotMap[slotKey] = {}
      }
      
      if (!teacherSlotMap[slotKey][teacherId]) {
        teacherSlotMap[slotKey][teacherId] = {
          teacherName,
          classes: []
        }
      }
      
      teacherSlotMap[slotKey][teacherId].classes.push({
        course: assignment.offering.course?.code,
        room: assignment.room?.code,
        section: `${assignment.offering.section?.program} Y${assignment.offering.section?.year}`,
        kind: assignment.kind
      })
    }
  })
  
  // Show slots where same teacher has multiple classes
  let conflictCount = 0
  Object.entries(teacherSlotMap).forEach(([slot, teachers]) => {
    Object.entries(teachers).forEach(([teacherId, data]) => {
      if (data.classes.length > 1) {
        conflictCount++
        console.log(`CONFLICT: ${data.teacherName} has ${data.classes.length} classes at ${slot}:`)
        data.classes.forEach(cls => {
          console.log(`  - ${cls.course} (${cls.kind}) in Room ${cls.room} for ${cls.section}`)
        })
        console.log()
      }
    })
  })
  
  if (conflictCount === 0) {
    console.log('✓ No teacher conflicts found - each teacher has at most one class per time slot\n')
  }
  
  // 3. Check visibility in timetable view
  console.log('\nCHECKING TIMETABLE VISIBILITY:\n')
  
  // Get a sample of assignments
  const sampleAssignments = assignments?.slice(0, 10) || []
  
  console.log('Sample assignments that should be visible:')
  sampleAssignments.forEach(a => {
    console.log(`- ${a.offering?.course?.code} by ${a.offering?.teacher?.name} in Room ${a.room?.code} at ${a.slot?.day} ${a.slot?.start_time}`)
  })
  
  // 4. Check for assignments without proper relations
  console.log('\n\nCHECKING FOR INCOMPLETE ASSIGNMENTS:\n')
  
  let incompleteCount = 0
  assignments?.forEach(a => {
    const issues = []
    if (!a.slot) issues.push('no slot')
    if (!a.room) issues.push('no room')
    if (!a.offering) issues.push('no offering')
    if (a.offering && !a.offering.teacher) issues.push('no teacher')
    if (a.offering && !a.offering.course) issues.push('no course')
    if (a.offering && !a.offering.section) issues.push('no section')
    
    if (issues.length > 0) {
      incompleteCount++
      if (incompleteCount <= 5) {
        console.log(`Assignment ${a.id} has issues: ${issues.join(', ')}`)
      }
    }
  })
  
  if (incompleteCount > 5) {
    console.log(`... and ${incompleteCount - 5} more incomplete assignments`)
  } else if (incompleteCount === 0) {
    console.log('✓ All assignments have complete data')
  }
  
  // 5. Check what the timetable API returns
  console.log('\n\nCHECKING TIMETABLE API RESPONSE:\n')
  
  try {
    // Test teacher view
    const teacherResponse = await fetch('http://localhost:3000/api/timetables/teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        teacherId: assignments?.[0]?.offering?.teacher?.id 
      })
    })
    
    if (teacherResponse.ok) {
      const teacherData = await teacherResponse.json()
      console.log(`Teacher timetable API returned ${teacherData.assignments?.length || 0} assignments`)
    }
    
    // Test section view
    const sectionResponse = await fetch('http://localhost:3000/api/timetables/section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sectionId: assignments?.[0]?.offering?.section?.id 
      })
    })
    
    if (sectionResponse.ok) {
      const sectionData = await sectionResponse.json()
      console.log(`Section timetable API returned ${sectionData.assignments?.length || 0} assignments`)
    }
  } catch (error) {
    console.error('Error checking API:', error)
  }
  
  // 6. Direct query test
  console.log('\n\nDIRECT QUERY TEST:\n')
  
  const { data: directTest, error } = await supabase
    .from('assignment')
    .select('*')
    .limit(5)
  
  console.log('Direct assignment query:')
  console.log(`- Returned ${directTest?.length || 0} rows`)
  if (error) {
    console.log(`- Error: ${error.message}`)
  }
  
  process.exit(0)
}

checkTeacherSchedules().catch(console.error)