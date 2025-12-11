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

async function fixAllIssues() {
  console.log('=== FIXING ALL TIMETABLE ISSUES ===\n')
  
  // 1. Delete all slots with :33 seconds (these are wrong)
  console.log('1. Removing invalid slots with :33 seconds...')
  const { data: invalidSlots } = await supabase
    .from('slot')
    .select('id')
    .like('start_time', '%:33')
  
  if (invalidSlots && invalidSlots.length > 0) {
    const { error } = await supabase
      .from('slot')
      .delete()
      .in('id', invalidSlots.map(s => s.id))
    
    if (error) {
      console.error('Error deleting invalid slots:', error)
    } else {
      console.log(`Deleted ${invalidSlots.length} invalid slots`)
    }
  }
  
  // 2. Clear all slots and recreate properly
  console.log('\n2. Recreating all slots properly...')
  
  // Delete all existing slots
  await supabase.from('slot').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
  // Create proper slots
  const slots = []
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
  
  // Morning slots (8:00-12:00) - Regular lecture slots
  const morningSlots = [
    { code: 'A', start: '08:00', end: '09:00' },
    { code: 'B', start: '09:00', end: '10:00' },
    { code: 'C', start: '10:00', end: '11:00' },
    { code: 'D', start: '11:00', end: '12:00' }
  ]
  
  // Afternoon slots (14:00-17:00) - Mixed lecture and lab
  const afternoonSlots = [
    { code: 'E', start: '14:00', end: '15:00' },
    { code: 'F', start: '15:00', end: '16:00' },
    { code: 'G', start: '16:00', end: '17:00' }
  ]
  
  // Create regular slots for each day
  days.forEach((day, dayIdx) => {
    // Morning slots
    morningSlots.forEach((slot, slotIdx) => {
      slots.push({
        code: slot.code,
        occ: dayIdx + 1,
        day: day,
        start_time: slot.start,
        end_time: slot.end,
        cluster: null,
        is_lab: false
      })
    })
    
    // Afternoon slots - only for non-lab days
    afternoonSlots.forEach((slot, slotIdx) => {
      slots.push({
        code: slot.code,
        occ: dayIdx + 1,
        day: day,
        start_time: slot.start,
        end_time: slot.end,
        cluster: null,
        is_lab: false
      })
    })
  })
  
  // Create lab slots (3-hour blocks in afternoons)
  const labSchedule = {
    'MON': { cluster: 'J', start: '14:00' },
    'TUE': { cluster: 'L', start: '14:00' },
    'WED': { cluster: 'X', start: '14:00' },
    'THU': { cluster: 'N', start: '14:00' },
    'FRI': { cluster: 'P', start: '14:00' }
  }
  
  Object.entries(labSchedule).forEach(([day, config]) => {
    // Create 3 consecutive 1-hour slots for the lab
    for (let i = 0; i < 3; i++) {
      const hour = parseInt(config.start.split(':')[0]) + i
      slots.push({
        code: config.cluster,
        occ: i + 1,
        day: day,
        start_time: `${hour.toString().padStart(2, '0')}:00`,
        end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
        cluster: config.cluster,
        is_lab: true
      })
    }
  })
  
  // Insert all slots
  const { error: insertError } = await supabase
    .from('slot')
    .insert(slots)
  
  if (insertError) {
    console.error('Error creating slots:', insertError)
  } else {
    console.log(`Created ${slots.length} slots (including lab slots)`)
  }
  
  // 3. Fix teacher availability for lab slots
  console.log('\n3. Setting teacher availability for lab slots...')
  
  // Get all teachers
  const { data: teachers } = await supabase
    .from('teacher')
    .select('id, name')
  
  // Get all slots
  const { data: allSlots } = await supabase
    .from('slot')
    .select('id, code, day, start_time, is_lab')
  
  // Clear existing availability
  await supabase
    .from('availability')
    .delete()
    .neq('teacher_id', '00000000-0000-0000-0000-000000000000')
  
  // Create availability entries
  const availabilities = []
  
  teachers?.forEach(teacher => {
    allSlots?.forEach(slot => {
      // Make all teachers available for all slots by default
      // In a real system, this would be based on teacher preferences
      availabilities.push({
        teacher_id: teacher.id,
        slot_id: slot.id,
        can_teach: true
      })
    })
  })
  
  // Insert in batches to avoid timeout
  const batchSize = 1000
  for (let i = 0; i < availabilities.length; i += batchSize) {
    const batch = availabilities.slice(i, i + batchSize)
    const { error } = await supabase
      .from('availability')
      .insert(batch)
    
    if (error) {
      console.error(`Error inserting availability batch ${i / batchSize + 1}:`, error)
    }
  }
  
  console.log(`Created ${availabilities.length} availability entries`)
  
  // 4. Regenerate timetable
  console.log('\n4. Regenerating timetable...')
  try {
    const response = await fetch('http://localhost:3000/api/solver/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log(`\nTimetable generated successfully!`)
      console.log(`- Assignments created: ${result.assignments}`)
      console.log(`- Utilization: ${result.stats?.utilization?.toFixed(1)}%`)
      console.log(`- Failed assignments: ${result.stats?.failed_assignments || 0}`)
    } else {
      console.error('Failed to generate timetable:', await response.text())
    }
  } catch (error) {
    console.error('Error calling API:', error)
  }
  
  process.exit(0)
}

fixAllIssues().catch(console.error)