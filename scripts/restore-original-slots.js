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

async function restoreOriginalSlots() {
  console.log('=== RESTORING ORIGINAL SLOT STRUCTURE ===\n')
  
  // 1. Remove the extra slots I added
  console.log('1. REMOVING EXTRA SLOTS:')
  
  // Remove early morning slots (7:00)
  const { error: err1 } = await supabase
    .from('slot')
    .delete()
    .eq('code', 'Z')
  
  // Remove lunch slots (13:00)
  const { error: err2 } = await supabase
    .from('slot')
    .delete()
    .eq('code', 'L')
    .eq('start_time', '13:00')
  
  // Remove evening slots (18:00)
  const { error: err3 } = await supabase
    .from('slot')
    .delete()
    .eq('code', 'V')
  
  // Remove Saturday slots
  const { error: err4 } = await supabase
    .from('slot')
    .delete()
    .eq('day', 'SAT')
  
  console.log('Removed extra slots')
  
  // 2. Clear all slots and recreate original structure
  console.log('\n2. RECREATING ORIGINAL IIT KGP SLOT STRUCTURE:')
  
  // Clear all slots
  await supabase.from('slot').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
  const slots = []
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
  
  // Original theory slot timings (as per IIT KGP)
  const theoryTimings = [
    { code: 'A', start: '08:00', end: '08:55' },
    { code: 'B', start: '09:00', end: '09:55' },
    { code: 'C', start: '10:00', end: '10:55' },
    { code: 'D', start: '11:00', end: '11:55' },
    { code: 'E', start: '12:00', end: '12:55' },
    { code: 'F', start: '14:00', end: '14:55' },
    { code: 'G', start: '15:00', end: '15:55' },
    { code: 'H', start: '16:00', end: '16:55' },
    { code: 'I', start: '17:00', end: '17:55' }
  ]
  
  // Create theory slots for each day
  days.forEach((day, dayIdx) => {
    theoryTimings.forEach(timing => {
      slots.push({
        code: timing.code,
        occ: dayIdx + 1,
        day: day,
        start_time: timing.start,
        end_time: timing.end,
        cluster: null,
        is_lab: false
      })
    })
  })
  
  // Lab slots - Original structure
  // Monday afternoon: J cluster
  for (let i = 0; i < 3; i++) {
    slots.push({
      code: 'J',
      occ: i + 1,
      day: 'MON',
      start_time: `${14 + i}:00`,
      end_time: `${15 + i}:00`,
      cluster: 'J',
      is_lab: true
    })
  }
  
  // Tuesday morning: K cluster
  for (let i = 0; i < 3; i++) {
    slots.push({
      code: 'K',
      occ: i + 1,
      day: 'TUE',
      start_time: `${10 + i}:00`,
      end_time: `${11 + i}:00`,
      cluster: 'K',
      is_lab: true
    })
  }
  
  // Tuesday afternoon: L cluster
  for (let i = 0; i < 3; i++) {
    slots.push({
      code: 'L',
      occ: i + 1,
      day: 'TUE',
      start_time: `${14 + i}:00`,
      end_time: `${15 + i}:00`,
      cluster: 'L',
      is_lab: true
    })
  }
  
  // Wednesday afternoon: X cluster
  for (let i = 0; i < 3; i++) {
    slots.push({
      code: 'X',
      occ: i + 1,
      day: 'WED',
      start_time: `${14 + i}:00`,
      end_time: `${15 + i}:00`,
      cluster: 'X',
      is_lab: true
    })
  }
  
  // Thursday morning: M cluster
  for (let i = 0; i < 3; i++) {
    slots.push({
      code: 'M',
      occ: i + 1,
      day: 'THU',
      start_time: `${10 + i}:00`,
      end_time: `${11 + i}:00`,
      cluster: 'M',
      is_lab: true
    })
  }
  
  // Thursday afternoon: N cluster
  for (let i = 0; i < 3; i++) {
    slots.push({
      code: 'N',
      occ: i + 1,
      day: 'THU',
      start_time: `${14 + i}:00`,
      end_time: `${15 + i}:00`,
      cluster: 'N',
      is_lab: true
    })
  }
  
  // Friday afternoon: P cluster
  for (let i = 0; i < 3; i++) {
    slots.push({
      code: 'P',
      occ: i + 1,
      day: 'FRI',
      start_time: `${14 + i}:00`,
      end_time: `${15 + i}:00`,
      cluster: 'P',
      is_lab: true
    })
  }
  
  // Remove theory slots that conflict with lab slots
  const labTimes = new Set()
  slots.filter(s => s.is_lab).forEach(s => {
    labTimes.add(`${s.day}-${s.start_time}`)
  })
  
  const finalSlots = slots.filter(s => {
    if (s.is_lab) return true
    return !labTimes.has(`${s.day}-${s.start_time}`)
  })
  
  // Insert slots
  const { error } = await supabase
    .from('slot')
    .insert(finalSlots)
  
  if (error) {
    console.error('Error inserting slots:', error)
  } else {
    console.log(`Created ${finalSlots.length} slots`)
    const labCount = finalSlots.filter(s => s.is_lab).length
    const theoryCount = finalSlots.filter(s => !s.is_lab).length
    console.log(`- Theory slots: ${theoryCount}`)
    console.log(`- Lab slots: ${labCount}`)
  }
  
  // 3. Update teacher availability
  console.log('\n3. UPDATING TEACHER AVAILABILITY:')
  
  const { data: teachers } = await supabase
    .from('teacher')
    .select('id')
  
  const { data: allSlots } = await supabase
    .from('slot')
    .select('id')
  
  // Clear existing availability
  await supabase
    .from('availability')
    .delete()
    .neq('teacher_id', '00000000-0000-0000-0000-000000000000')
  
  // Create availability for all teachers on all slots
  const availabilities = []
  teachers?.forEach(teacher => {
    allSlots?.forEach(slot => {
      availabilities.push({
        teacher_id: teacher.id,
        slot_id: slot.id,
        can_teach: true
      })
    })
  })
  
  // Insert in batches
  const batchSize = 1000
  for (let i = 0; i < availabilities.length; i += batchSize) {
    const batch = availabilities.slice(i, i + batchSize)
    await supabase.from('availability').insert(batch)
  }
  
  console.log(`Created ${availabilities.length} availability entries`)
  
  // 4. Show analysis of the problem
  console.log('\n4. ANALYSIS OF SCHEDULING CONSTRAINTS:')
  
  // Count required slots
  const { data: offerings } = await supabase
    .from('offering')
    .select(`
      *,
      course (L, T, P)
    `)
  
  let totalSlotsNeeded = 0
  offerings?.forEach(offering => {
    if (offering.course) {
      totalSlotsNeeded += offering.course.L + offering.course.T
      if (offering.course.P > 0) totalSlotsNeeded += 1 // Lab takes 1 3-hour slot
    }
  })
  
  console.log(`Total slots needed: ${totalSlotsNeeded}`)
  console.log(`Available theory slots: ${theoryCount}`)
  console.log(`Available lab slots: ${labCount}`)
  console.log(`\nThis means we have a shortage of ${Math.max(0, totalSlotsNeeded - theoryCount - labCount)} slots`)
  console.log('\nThe solution is NOT to add more slots, but to:')
  console.log('1. Reduce the number of offerings')
  console.log('2. Use multiple sections for large courses')
  console.log('3. Optimize teacher assignments')
  console.log('4. Consider some courses as electives (not all students take them)')
  
  // 5. Regenerate timetable
  console.log('\n5. REGENERATING TIMETABLE WITH ORIGINAL SLOTS:')
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
      console.log(`- Failed assignments: ${result.stats?.failed_assignments}`)
    }
  } catch (error) {
    console.error('Error regenerating timetable:', error)
  }
  
  process.exit(0)
}

restoreOriginalSlots().catch(console.error)