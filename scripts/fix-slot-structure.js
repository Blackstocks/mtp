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

async function fixSlotStructure() {
  console.log('=== FIXING SLOT STRUCTURE ===\n')
  
  // 1. Clear all slots
  console.log('1. Clearing all slots...')
  await supabase.from('slot').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
  // 2. Create IIT KGP style slot structure
  console.log('\n2. Creating proper slot structure...')
  
  const slots = []
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
  
  // Theory slot timings
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
  
  // Lab slots - 3-hour blocks
  // Monday afternoon: J cluster (14:00-17:00)
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
  
  // Tuesday morning: K cluster (10:00-13:00)
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
  
  // Tuesday afternoon: L cluster (14:00-17:00)
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
  
  // Wednesday afternoon: X cluster (14:00-17:00)
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
  
  // Thursday morning: M cluster (10:00-13:00)
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
  
  // Thursday afternoon: N cluster (14:00-17:00)
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
  
  // Friday afternoon: P cluster (14:00-17:00)
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
  const { error: insertError } = await supabase
    .from('slot')
    .insert(finalSlots)
  
  if (insertError) {
    console.error('Error inserting slots:', insertError)
  } else {
    console.log(`Created ${finalSlots.length} slots`)
    
    // Count by type
    const labCount = finalSlots.filter(s => s.is_lab).length
    const theoryCount = finalSlots.filter(s => !s.is_lab).length
    console.log(`  - Theory slots: ${theoryCount}`)
    console.log(`  - Lab slots: ${labCount}`)
  }
  
  // 3. Update teacher availability
  console.log('\n3. Updating teacher availability...')
  
  // Get all teachers
  const { data: teachers } = await supabase
    .from('teacher')
    .select('id')
  
  // Get all new slots
  const { data: newSlots } = await supabase
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
    newSlots?.forEach(slot => {
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
  
  // 4. Clear assignments and regenerate
  console.log('\n4. Clearing assignments and regenerating timetable...')
  await supabase.from('assignment').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
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
      console.log(`- Successful: ${result.stats?.successful_assignments}`)
      console.log(`- Failed: ${result.stats?.failed_assignments}`)
    } else {
      console.error('Failed to generate timetable')
    }
  } catch (error) {
    console.error('Error calling API:', error)
  }
  
  process.exit(0)
}

fixSlotStructure().catch(console.error)