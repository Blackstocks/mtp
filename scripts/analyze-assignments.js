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
  console.log('=== ANALYZING THE 163 ASSIGNMENTS ===\n')
  
  // Get all assignments with full details
  const { data: assignments } = await supabase
    .from('assignment')
    .select(`
      *,
      offering (
        *,
        course (code, name, L, T, P),
        teacher (name),
        section (program, year, name)
      ),
      slot (day, start_time, end_time, is_lab),
      room (code, kind)
    `)
    .order('slot(day), slot(start_time)')
  
  console.log(`Total assignments in database: ${assignments?.length || 0}\n`)
  
  // 1. Breakdown by type
  console.log('1. ASSIGNMENTS BY TYPE:')
  const byType = { L: 0, T: 0, P: 0 }
  assignments?.forEach(a => {
    byType[a.kind]++
  })
  console.log(`   - Lectures (L): ${byType.L}`)
  console.log(`   - Tutorials (T): ${byType.T}`)
  console.log(`   - Practicals (P): ${byType.P}`)
  
  // 2. Breakdown by program
  console.log('\n2. ASSIGNMENTS BY PROGRAM:')
  const byProgram = {}
  assignments?.forEach(a => {
    const program = a.offering?.section?.program || 'Unknown'
    byProgram[program] = (byProgram[program] || 0) + 1
  })
  Object.entries(byProgram).forEach(([prog, count]) => {
    console.log(`   - ${prog}: ${count} classes`)
  })
  
  // 3. Breakdown by year
  console.log('\n3. ASSIGNMENTS BY YEAR:')
  const byYear = {}
  assignments?.forEach(a => {
    const year = a.offering?.section?.year || 0
    byYear[year] = (byYear[year] || 0) + 1
  })
  Object.entries(byYear).sort().forEach(([year, count]) => {
    console.log(`   - Year ${year}: ${count} classes`)
  })
  
  // 4. Most scheduled courses
  console.log('\n4. TOP 10 MOST SCHEDULED COURSES:')
  const byCourse = {}
  assignments?.forEach(a => {
    const course = a.offering?.course?.code || 'Unknown'
    if (!byCourse[course]) {
      byCourse[course] = {
        name: a.offering?.course?.name || '',
        count: 0,
        types: { L: 0, T: 0, P: 0 }
      }
    }
    byCourse[course].count++
    byCourse[course].types[a.kind]++
  })
  
  Object.entries(byCourse)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([code, data]) => {
      console.log(`   - ${code}: ${data.count} slots (L:${data.types.L} T:${data.types.T} P:${data.types.P})`)
      if (data.name) console.log(`     "${data.name}"`)
    })
  
  // 5. Teacher workload
  console.log('\n5. TEACHER WORKLOAD (Top 10):')
  const byTeacher = {}
  assignments?.forEach(a => {
    const teacher = a.offering?.teacher?.name || 'Unassigned'
    byTeacher[teacher] = (byTeacher[teacher] || 0) + 1
  })
  
  Object.entries(byTeacher)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([teacher, count]) => {
      console.log(`   - ${teacher}: ${count} classes/week`)
    })
  
  // 6. Time slot utilization
  console.log('\n6. TIME SLOT UTILIZATION:')
  const byTimeSlot = {}
  assignments?.forEach(a => {
    if (a.slot) {
      const timeKey = `${a.slot.start_time}-${a.slot.end_time}`
      byTimeSlot[timeKey] = (byTimeSlot[timeKey] || 0) + 1
    }
  })
  
  Object.entries(byTimeSlot)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([time, count]) => {
      console.log(`   - ${time}: ${count} classes across the week`)
    })
  
  // 7. Day-wise distribution
  console.log('\n7. DAY-WISE DISTRIBUTION:')
  const byDay = { MON: 0, TUE: 0, WED: 0, THU: 0, FRI: 0 }
  assignments?.forEach(a => {
    if (a.slot?.day) {
      byDay[a.slot.day] = (byDay[a.slot.day] || 0) + 1
    }
  })
  
  Object.entries(byDay).forEach(([day, count]) => {
    console.log(`   - ${day}: ${count} classes`)
  })
  
  // 8. Room utilization
  console.log('\n8. ROOM UTILIZATION (Top 10):')
  const byRoom = {}
  assignments?.forEach(a => {
    const room = a.room?.code || 'TBD'
    if (!byRoom[room]) {
      byRoom[room] = { count: 0, kind: a.room?.kind }
    }
    byRoom[room].count++
  })
  
  Object.entries(byRoom)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([room, data]) => {
      console.log(`   - Room ${room} (${data.kind || 'Unknown'}): ${data.count} classes/week`)
    })
  
  // 9. Sample assignments
  console.log('\n9. SAMPLE ASSIGNMENTS (First 5):')
  assignments?.slice(0, 5).forEach((a, idx) => {
    console.log(`\n   Assignment ${idx + 1}:`)
    console.log(`   - Course: ${a.offering?.course?.code} - ${a.offering?.course?.name}`)
    console.log(`   - Type: ${a.kind} (${a.kind === 'L' ? 'Lecture' : a.kind === 'T' ? 'Tutorial' : 'Practical'})`)
    console.log(`   - Section: ${a.offering?.section?.name} (${a.offering?.section?.program} Year ${a.offering?.section?.year})`)
    console.log(`   - Teacher: ${a.offering?.teacher?.name || 'Not assigned'}`)
    console.log(`   - Time: ${a.slot?.day} ${a.slot?.start_time}-${a.slot?.end_time}`)
    console.log(`   - Room: ${a.room?.code || 'TBD'}`)
  })
  
  process.exit(0)
}

analyzeAssignments().catch(console.error)