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

async function finalCheck() {
  console.log('=== FINAL TIMETABLE CHECK ===\n')
  
  // 1. Check slot distribution
  console.log('1. SLOT DISTRIBUTION:')
  const { data: slots } = await supabase
    .from('slot')
    .select('*')
    .order('day, start_time')
  
  const slotsByDay = new Map()
  slots?.forEach(slot => {
    if (!slotsByDay.has(slot.day)) {
      slotsByDay.set(slot.day, { regular: 0, lab: 0 })
    }
    if (slot.is_lab) {
      slotsByDay.get(slot.day).lab++
    } else {
      slotsByDay.get(slot.day).regular++
    }
  })
  
  slotsByDay.forEach((counts, day) => {
    console.log(`  ${day}: ${counts.regular} regular slots, ${counts.lab} lab slots`)
  })
  
  // 2. Check assignments
  console.log('\n2. ASSIGNMENT SUMMARY:')
  const { data: assignments } = await supabase
    .from('assignment')
    .select('kind')
  
  const counts = { L: 0, T: 0, P: 0 }
  assignments?.forEach(a => {
    counts[a.kind]++
  })
  
  console.log(`  Total: ${assignments?.length || 0}`)
  console.log(`  - Lectures (L): ${counts.L}`)
  console.log(`  - Tutorials (T): ${counts.T}`)
  console.log(`  - Practicals (P): ${counts.P}`)
  
  // 3. Check lab slot usage
  console.log('\n3. LAB SLOT USAGE:')
  const labSlots = slots?.filter(s => s.is_lab) || []
  const { data: labAssignments } = await supabase
    .from('assignment')
    .select('slot_id')
    .eq('kind', 'P')
  
  const usedLabSlotIds = new Set(labAssignments?.map(a => a.slot_id) || [])
  const usedLabSlots = labSlots.filter(s => usedLabSlotIds.has(s.id))
  
  console.log(`  Total lab slots: ${labSlots.length}`)
  console.log(`  Used lab slots: ${usedLabSlots.length}`)
  console.log(`  Utilization: ${((usedLabSlots.length / labSlots.length) * 100).toFixed(1)}%`)
  
  // 4. Check duplicate slots
  console.log('\n4. CHECKING FOR DUPLICATE SLOTS:')
  const slotMap = new Map()
  slots?.forEach(slot => {
    const key = `${slot.day}-${slot.start_time}`
    if (!slotMap.has(key)) {
      slotMap.set(key, 0)
    }
    slotMap.set(key, slotMap.get(key) + 1)
  })
  
  let duplicates = 0
  slotMap.forEach((count, key) => {
    if (count > 1) {
      console.log(`  ${key}: ${count} slots (DUPLICATE!)`)
      duplicates++
    }
  })
  
  if (duplicates === 0) {
    console.log('  No duplicate slots found ✓')
  }
  
  // 5. Check which lab courses got scheduled
  console.log('\n5. LAB COURSE SCHEDULING STATUS:')
  const labCourses = [
    'EN19003', 'CS19003', 'PH19003', 'CE13003',
    'AE29202', 'AE29204', 'AE39001', 'AE39002',
    'AE39003', 'AE39004', 'AE39201', 'AE40019',
    'AE49003', 'AE49012', 'AE61019', 'AE69006', 'AE69208'
  ]
  
  for (const code of labCourses) {
    // Get course
    const { data: course } = await supabase
      .from('course')
      .select('id, name')
      .eq('code', code)
      .single()
    
    if (course) {
      // Check if any offering of this course has lab assignments
      const { data: offerings } = await supabase
        .from('offering')
        .select('id')
        .eq('course_id', course.id)
      
      const offeringIds = offerings?.map(o => o.id) || []
      
      const { count } = await supabase
        .from('assignment')
        .select('*', { count: 'exact', head: true })
        .in('offering_id', offeringIds)
        .eq('kind', 'P')
      
      console.log(`  ${code}: ${count > 0 ? '✓ Scheduled' : '✗ NOT scheduled'}`)
    }
  }
  
  process.exit(0)
}

finalCheck().catch(console.error)