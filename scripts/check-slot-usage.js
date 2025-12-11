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

async function checkSlotUsage() {
  console.log('=== CHECKING SLOT USAGE ===\n')
  
  // 1. Get all assignments with details
  const { data: assignments } = await supabase
    .from('assignment')
    .select(`
      *,
      slot (day, start_time, end_time, code),
      room (code)
    `)
    .order('slot(day), slot(start_time)')
  
  // 2. Group assignments by slot
  const slotUsage = {}
  
  assignments?.forEach(assignment => {
    if (assignment.slot) {
      const slotKey = `${assignment.slot.day} ${assignment.slot.start_time}-${assignment.slot.end_time}`
      
      if (!slotUsage[slotKey]) {
        slotUsage[slotKey] = {
          slotInfo: assignment.slot,
          assignments: []
        }
      }
      
      slotUsage[slotKey].assignments.push(assignment)
    }
  })
  
  // 3. Analyze slot usage
  console.log('SLOT USAGE ANALYSIS:\n')
  
  let totalSlots = 0
  let slotsWithMultipleClasses = 0
  let maxClassesInSlot = 0
  let underutilizedSlots = 0
  
  // Get room count
  const { count: roomCount } = await supabase
    .from('room')
    .select('*', { count: 'exact', head: true })
    .eq('kind', 'CLASS')
  
  console.log(`Total classrooms available: ${roomCount}\n`)
  
  Object.entries(slotUsage).forEach(([slotKey, data]) => {
    const assignmentCount = data.assignments.length
    totalSlots++
    
    if (assignmentCount > 1) {
      slotsWithMultipleClasses++
    }
    
    if (assignmentCount > maxClassesInSlot) {
      maxClassesInSlot = assignmentCount
    }
    
    // Check if slot is underutilized (less than half of available rooms used)
    if (assignmentCount < roomCount / 2) {
      underutilizedSlots++
    }
    
    // Show slots with multiple assignments
    if (assignmentCount > 1) {
      console.log(`${slotKey}: ${assignmentCount} classes`)
      data.assignments.forEach(a => {
        console.log(`  - Room ${a.room?.code || 'TBA'}`)
      })
    }
  })
  
  console.log('\nSUMMARY:')
  console.log(`- Total time slots used: ${totalSlots}`)
  console.log(`- Slots with multiple classes: ${slotsWithMultipleClasses}`)
  console.log(`- Maximum classes in one slot: ${maxClassesInSlot}`)
  console.log(`- Underutilized slots: ${underutilizedSlots}`)
  console.log(`- Average classes per slot: ${(assignments?.length / totalSlots).toFixed(2)}`)
  
  // 4. Check teacher distribution in same time slot
  console.log('\n\nTEACHER DISTRIBUTION IN SAME TIME SLOTS:')
  
  const sampleSlots = Object.entries(slotUsage).slice(0, 5)
  
  for (const [slotKey, data] of sampleSlots) {
    if (data.assignments.length > 0) {
      // Get teacher info for each assignment
      const assignmentsWithTeacher = await Promise.all(
        data.assignments.map(async (a) => {
          const { data: offering } = await supabase
            .from('offering')
            .select('teacher (name), course (code)')
            .eq('id', a.offering_id)
            .single()
          
          return {
            ...a,
            teacher: offering?.teacher?.name,
            course: offering?.course?.code
          }
        })
      )
      
      console.log(`\n${slotKey}:`)
      assignmentsWithTeacher.forEach(a => {
        console.log(`  - ${a.course} by ${a.teacher} in Room ${a.room?.code}`)
      })
    }
  }
  
  // 5. Find empty slots
  console.log('\n\nEMPTY SLOTS:')
  const { data: allSlots } = await supabase
    .from('slot')
    .select('*')
    .eq('is_lab', false)
    .order('day, start_time')
  
  const usedSlotIds = new Set(assignments?.map(a => a.slot_id))
  const emptySlots = allSlots?.filter(s => !usedSlotIds.has(s.id)) || []
  
  console.log(`Found ${emptySlots.length} completely empty slots:`)
  emptySlots.slice(0, 5).forEach(slot => {
    console.log(`  - ${slot.day} ${slot.start_time}-${slot.end_time}`)
  })
  
  if (emptySlots.length > 5) {
    console.log(`  ... and ${emptySlots.length - 5} more`)
  }
  
  process.exit(0)
}

checkSlotUsage().catch(console.error)