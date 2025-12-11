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

async function addMoreSlots() {
  console.log('=== ADDING MORE TIME SLOTS ===\n')
  
  // 1. Check current slot distribution
  console.log('1. CURRENT SLOT ANALYSIS:')
  const { data: currentSlots } = await supabase
    .from('slot')
    .select('*')
    .order('day, start_time')
  
  // Count slots by type
  const regularSlots = currentSlots?.filter(s => !s.is_lab) || []
  const labSlots = currentSlots?.filter(s => s.is_lab) || []
  
  console.log(`Current regular slots: ${regularSlots.length}`)
  console.log(`Current lab slots: ${labSlots.length}`)
  
  // Count by day
  const slotsByDay = {}
  regularSlots.forEach(slot => {
    slotsByDay[slot.day] = (slotsByDay[slot.day] || 0) + 1
  })
  
  console.log('\nRegular slots by day:')
  Object.entries(slotsByDay).forEach(([day, count]) => {
    console.log(`  ${day}: ${count}`)
  })
  
  // 2. Add more regular slots
  console.log('\n2. ADDING ADDITIONAL TIME SLOTS:')
  
  const newSlots = []
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
  
  // Add early morning slot (7:00-7:55)
  days.forEach(day => {
    // Skip days that have morning labs
    if ((day === 'TUE' || day === 'THU') && labSlots.some(s => s.day === day && s.start_time === '10:00')) {
      return
    }
    
    newSlots.push({
      code: 'Z',
      occ: days.indexOf(day) + 1,
      day: day,
      start_time: '07:00',
      end_time: '07:55',
      cluster: null,
      is_lab: false
    })
  })
  
  // Add lunch hour slots (13:00-13:55) for days without afternoon labs
  days.forEach(day => {
    // Skip days that have afternoon labs
    if (labSlots.some(s => s.day === day && s.start_time === '14:00')) {
      return
    }
    
    newSlots.push({
      code: 'L',
      occ: days.indexOf(day) + 1,
      day: day,
      start_time: '13:00',
      end_time: '13:55',
      cluster: null,
      is_lab: false
    })
  })
  
  // Add evening slots (18:00-18:55)
  days.forEach(day => {
    newSlots.push({
      code: 'V',
      occ: days.indexOf(day) + 1,
      day: day,
      start_time: '18:00',
      end_time: '18:55',
      cluster: null,
      is_lab: false
    })
  })
  
  // Add Saturday morning slots for PG courses
  const saturdaySlots = [
    { code: 'SA', start: '08:00', end: '08:55' },
    { code: 'SB', start: '09:00', end: '09:55' },
    { code: 'SC', start: '10:00', end: '10:55' },
    { code: 'SD', start: '11:00', end: '11:55' }
  ]
  
  saturdaySlots.forEach((slot, idx) => {
    newSlots.push({
      code: slot.code,
      occ: 1,
      day: 'SAT',
      start_time: slot.start,
      end_time: slot.end,
      cluster: null,
      is_lab: false
    })
  })
  
  // Insert new slots
  if (newSlots.length > 0) {
    const { error } = await supabase
      .from('slot')
      .insert(newSlots)
    
    if (error) {
      console.error('Error adding slots:', error)
    } else {
      console.log(`Added ${newSlots.length} new slots`)
      console.log('New slots added:')
      newSlots.forEach(s => {
        console.log(`  - ${s.day} ${s.start_time}-${s.end_time}`)
      })
    }
  }
  
  // 3. Update teacher availability for new slots
  console.log('\n3. UPDATING TEACHER AVAILABILITY:')
  
  const { data: allTeachers } = await supabase
    .from('teacher')
    .select('id')
  
  const { data: newSlotRecords } = await supabase
    .from('slot')
    .select('id')
    .or('code.eq.Z,code.eq.L,code.eq.V,code.like.S%')
  
  if (allTeachers && newSlotRecords) {
    const newAvailabilities = []
    
    allTeachers.forEach(teacher => {
      newSlotRecords.forEach(slot => {
        newAvailabilities.push({
          teacher_id: teacher.id,
          slot_id: slot.id,
          can_teach: true
        })
      })
    })
    
    // Insert in batches
    const batchSize = 500
    for (let i = 0; i < newAvailabilities.length; i += batchSize) {
      const batch = newAvailabilities.slice(i, i + batchSize)
      await supabase.from('availability').insert(batch)
    }
    
    console.log(`Added ${newAvailabilities.length} availability entries`)
  }
  
  // 4. Regenerate timetable
  console.log('\n4. REGENERATING TIMETABLE WITH MORE SLOTS:')
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
      console.log(`- Successful assignments: ${result.stats?.successful_assignments}`)
      console.log(`- Failed assignments: ${result.stats?.failed_assignments}`)
      
      // Show improvement
      console.log(`\nImprovement:`)
      console.log(`- Previously failed: 40`)
      console.log(`- Now failed: ${result.stats?.failed_assignments}`)
      console.log(`- Resolved: ${40 - result.stats?.failed_assignments} issues`)
    }
  } catch (error) {
    console.error('Error regenerating timetable:', error)
  }
  
  process.exit(0)
}

addMoreSlots().catch(console.error)