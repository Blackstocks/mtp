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

async function analyzeAssignments() {
  console.log('=== ANALYZING THE 163 ASSIGNMENTS (USING FIXED APPROACH) ===\n')
  
  // First get assignments without joins
  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from('assignment')
    .select('*')
  
  if (assignmentsError) throw assignmentsError
  
  console.log(`Total raw assignments: ${assignmentsData?.length || 0}\n`)
  
  if (!assignmentsData || assignmentsData.length === 0) {
    console.log('No assignments found!')
    return
  }
  
  // Get unique IDs
  const offeringIds = [...new Set(assignmentsData.map(a => a.offering_id))]
  const slotIds = [...new Set(assignmentsData.map(a => a.slot_id))]
  const roomIds = [...new Set(assignmentsData.filter(a => a.room_id).map(a => a.room_id))]
  
  console.log(`Unique offerings: ${offeringIds.length}`)
  console.log(`Unique slots: ${slotIds.length}`)
  console.log(`Unique rooms: ${roomIds.length}\n`)
  
  // Fetch related data
  const [offeringsRes, slotsRes, roomsRes] = await Promise.all([
    supabase.from('offering').select('*').in('id', offeringIds),
    supabase.from('slot').select('*').in('id', slotIds),
    roomIds.length > 0 
      ? supabase.from('room').select('*').in('id', roomIds)
      : Promise.resolve({ data: [] })
  ])
  
  // For offerings, fetch their related data
  const offerings = offeringsRes.data || []
  if (offerings.length > 0) {
    const courseIds = [...new Set(offerings.map(o => o.course_id))]
    const sectionIds = [...new Set(offerings.map(o => o.section_id))]
    const teacherIds = [...new Set(offerings.filter(o => o.teacher_id).map(o => o.teacher_id))]
    
    const [coursesRes, sectionsRes, teachersRes] = await Promise.all([
      supabase.from('course').select('*').in('id', courseIds),
      supabase.from('section').select('*').in('id', sectionIds),
      teacherIds.length > 0
        ? supabase.from('teacher').select('*').in('id', teacherIds)
        : Promise.resolve({ data: [] })
    ])
    
    // Create lookup maps
    const courseMap = new Map(coursesRes.data?.map(c => [c.id, c]) || [])
    const sectionMap = new Map(sectionsRes.data?.map(s => [s.id, s]) || [])
    const teacherMap = new Map(teachersRes.data?.map(t => [t.id, t]) || [])
    
    // Enrich offerings
    offerings.forEach(offering => {
      offering.course = courseMap.get(offering.course_id)
      offering.section = sectionMap.get(offering.section_id)
      offering.teacher = offering.teacher_id ? teacherMap.get(offering.teacher_id) : null
    })
  }
  
  // Create lookup maps
  const offeringMap = new Map(offerings.map(o => [o.id, o]))
  const slotMap = new Map(slotsRes.data?.map(s => [s.id, s]) || [])
  const roomMap = new Map(roomsRes.data?.map(r => [r.id, r]) || [])
  
  // Combine everything
  const assignments = assignmentsData.map(assignment => ({
    ...assignment,
    offering: offeringMap.get(assignment.offering_id),
    slot: slotMap.get(assignment.slot_id),
    room: assignment.room_id ? roomMap.get(assignment.room_id) : null
  }))
  
  console.log(`Enriched assignments: ${assignments.length}\n`)
  
  // Now analyze
  console.log('1. ASSIGNMENTS BY TYPE:')
  const byType = { L: 0, T: 0, P: 0 }
  assignments.forEach(a => {
    byType[a.kind]++
  })
  console.log(`   - Lectures (L): ${byType.L}`)
  console.log(`   - Tutorials (T): ${byType.T}`)
  console.log(`   - Practicals (P): ${byType.P}`)
  
  console.log('\n2. ASSIGNMENTS BY PROGRAM:')
  const byProgram = {}
  assignments.forEach(a => {
    const program = a.offering?.section?.program || 'Unknown'
    byProgram[program] = (byProgram[program] || 0) + 1
  })
  Object.entries(byProgram).forEach(([prog, count]) => {
    console.log(`   - ${prog}: ${count} classes`)
  })
  
  console.log('\n3. TOP 10 COURSES BY ASSIGNMENT COUNT:')
  const byCourse = {}
  assignments.forEach(a => {
    const code = a.offering?.course?.code || 'Unknown'
    const name = a.offering?.course?.name || ''
    const key = `${code}|${name}`
    if (!byCourse[key]) {
      byCourse[key] = { count: 0, L: 0, T: 0, P: 0 }
    }
    byCourse[key].count++
    byCourse[key][a.kind]++
  })
  
  Object.entries(byCourse)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([key, data]) => {
      const [code, name] = key.split('|')
      console.log(`   - ${code}: ${data.count} classes (L:${data.L} T:${data.T} P:${data.P})`)
      if (name) console.log(`     "${name}"`)
    })
  
  console.log('\n4. TEACHER WORKLOAD:')
  const byTeacher = {}
  assignments.forEach(a => {
    const teacher = a.offering?.teacher?.name || 'Unassigned'
    byTeacher[teacher] = (byTeacher[teacher] || 0) + 1
  })
  
  Object.entries(byTeacher)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([teacher, count]) => {
      console.log(`   - ${teacher}: ${count} classes/week`)
    })
  
  console.log('\n5. DAY-WISE DISTRIBUTION:')
  const byDay = {}
  assignments.forEach(a => {
    const day = a.slot?.day || 'Unknown'
    byDay[day] = (byDay[day] || 0) + 1
  })
  const dayOrder = ['MON', 'TUE', 'WED', 'THU', 'FRI']
  dayOrder.forEach(day => {
    if (byDay[day]) {
      console.log(`   - ${day}: ${byDay[day]} classes`)
    }
  })
  
  console.log('\n6. SAMPLE ASSIGNMENTS:')
  assignments.slice(0, 5).forEach((a, idx) => {
    console.log(`\n   Assignment ${idx + 1}:`)
    console.log(`   - Course: ${a.offering?.course?.code} - ${a.offering?.course?.name}`)
    console.log(`   - Type: ${a.kind} (${a.kind === 'L' ? 'Lecture' : a.kind === 'T' ? 'Tutorial' : 'Practical'})`)
    console.log(`   - Teacher: ${a.offering?.teacher?.name || 'Not assigned'}`)
    console.log(`   - Section: ${a.offering?.section?.name} (${a.offering?.section?.program})`)
    console.log(`   - Time: ${a.slot?.day} ${a.slot?.start_time}-${a.slot?.end_time}`)
    console.log(`   - Room: ${a.room?.code || 'TBD'}`)
  })
  
  process.exit(0)
}

analyzeAssignments().catch(console.error)