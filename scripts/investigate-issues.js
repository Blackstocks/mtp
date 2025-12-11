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

async function investigateIssues() {
  console.log('=== INVESTIGATING TIMETABLE ISSUES ===\n')
  
  // 1. Check duplicate slots
  console.log('1. CHECKING FOR DUPLICATE TIME SLOTS:')
  const { data: slots } = await supabase
    .from('slot')
    .select('*')
    .order('day, start_time')
  
  // Group slots by day and time to find duplicates
  const slotMap = new Map()
  slots?.forEach(slot => {
    const key = `${slot.day}-${slot.start_time}`
    if (!slotMap.has(key)) {
      slotMap.set(key, [])
    }
    slotMap.get(key).push(slot)
  })
  
  // Find duplicates
  console.log('Duplicate time slots:')
  let duplicatesFound = false
  slotMap.forEach((slotsAtTime, key) => {
    if (slotsAtTime.length > 1) {
      duplicatesFound = true
      console.log(`  ${key}: ${slotsAtTime.length} slots`)
      slotsAtTime.forEach(s => {
        console.log(`    - Code: ${s.code}, Lab: ${s.is_lab}, Cluster: ${s.cluster || 'none'}`)
      })
    }
  })
  
  if (!duplicatesFound) {
    console.log('  No duplicate time slots found')
  }
  
  // 2. Check lab room availability
  console.log('\n2. LAB ROOM AVAILABILITY:')
  const { data: labRooms } = await supabase
    .from('room')
    .select('*')
    .eq('kind', 'LAB')
  
  console.log(`Total lab rooms: ${labRooms?.length || 0}`)
  labRooms?.forEach(room => {
    console.log(`  - ${room.code}: capacity ${room.capacity}`)
  })
  
  // 3. Check teacher availability for labs
  console.log('\n3. TEACHER AVAILABILITY FOR LAB SLOTS:')
  const { data: availability } = await supabase
    .from('availability')
    .select('teacher_id, slot_id')
  
  // Get lab slots
  const labSlots = slots?.filter(s => s.is_lab) || []
  const labSlotIds = new Set(labSlots.map(s => s.id))
  
  // Count how many teachers are available for each lab slot
  const teachersByLabSlot = new Map()
  availability?.forEach(av => {
    if (labSlotIds.has(av.slot_id)) {
      if (!teachersByLabSlot.has(av.slot_id)) {
        teachersByLabSlot.set(av.slot_id, new Set())
      }
      teachersByLabSlot.get(av.slot_id).add(av.teacher_id)
    }
  })
  
  console.log('Teachers available per lab slot cluster:')
  const clusterAvailability = new Map()
  labSlots.forEach(slot => {
    const teacherCount = teachersByLabSlot.get(slot.id)?.size || 0
    const cluster = slot.cluster || slot.code
    if (!clusterAvailability.has(cluster)) {
      clusterAvailability.set(cluster, teacherCount)
    }
  })
  
  clusterAvailability.forEach((count, cluster) => {
    console.log(`  Cluster ${cluster}: ${count} teachers available`)
  })
  
  // 4. Check failed offerings
  console.log('\n4. ANALYZING FAILED LAB OFFERINGS:')
  
  // Get the offerings that failed
  const failedCodes = ['AE61019', 'AE69006', 'AE69208', 'CE13003', 'PH19003', 'CS19003']
  
  for (const code of failedCodes.slice(0, 3)) {
    const { data: course } = await supabase
      .from('course')
      .select('*')
      .eq('code', code)
      .single()
    
    if (course) {
      const { data: offerings } = await supabase
        .from('offering')
        .select(`
          *,
          teacher (id, name, max_per_day, max_per_week),
          section (program, year, name)
        `)
        .eq('course_id', course.id)
      
      if (offerings && offerings.length > 0) {
        console.log(`\n  ${code}: ${course.name}`)
        offerings.forEach(offering => {
          console.log(`    - Section: ${offering.section?.program} Year ${offering.section?.year}`)
          console.log(`      Teacher: ${offering.teacher?.name} (max ${offering.teacher?.max_per_day}h/day, ${offering.teacher?.max_per_week}h/week)`)
          
          // Check if teacher has availability in any lab slot
          const teacherAvailableLabSlots = Array.from(teachersByLabSlot.entries())
            .filter(([slotId, teachers]) => teachers.has(offering.teacher_id))
            .length
          console.log(`      Available lab slots for this teacher: ${teacherAvailableLabSlots}`)
        })
      }
    }
  }
  
  // 5. Check slot conflicts in 14:00-17:00 range
  console.log('\n5. AFTERNOON SLOT ANALYSIS (14:00-17:00):')
  const afternoonSlots = slots?.filter(s => {
    const hour = parseInt(s.start_time.split(':')[0])
    return hour >= 14 && hour < 17
  }) || []
  
  // Group by day
  const afternoonByDay = new Map()
  afternoonSlots.forEach(slot => {
    if (!afternoonByDay.has(slot.day)) {
      afternoonByDay.set(slot.day, [])
    }
    afternoonByDay.get(slot.day).push(slot)
  })
  
  afternoonByDay.forEach((daySlots, day) => {
    console.log(`\n  ${day} afternoon slots:`)
    daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time))
    daySlots.forEach(slot => {
      console.log(`    ${slot.start_time}-${slot.end_time}: ${slot.code} (Lab: ${slot.is_lab}, Cluster: ${slot.cluster || 'none'})`)
    })
  })
  
  process.exit(0)
}

investigateIssues().catch(console.error)