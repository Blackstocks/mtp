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

async function fixSchedulingIssues() {
  console.log('=== FIXING SCHEDULING ISSUES ===\n')
  
  // 1. Check EN19003 offerings without teachers
  console.log('1. CHECKING EN19003 OFFERINGS:')
  const { data: en19003Course } = await supabase
    .from('course')
    .select('*')
    .eq('code', 'EN19003')
    .single()
  
  if (en19003Course) {
    const { data: offerings } = await supabase
      .from('offering')
      .select(`
        *,
        teacher (name),
        section (program, year, name)
      `)
      .eq('course_id', en19003Course.id)
    
    console.log(`Found ${offerings?.length || 0} offerings for EN19003:`)
    offerings?.forEach(offering => {
      console.log(`  - Section: ${offering.section?.program} Year ${offering.section?.year} - Teacher: ${offering.teacher?.name || 'NONE'}`)
    })
    
    // Assign teachers to offerings without teachers
    const offeringsWithoutTeacher = offerings?.filter(o => !o.teacher_id) || []
    
    if (offeringsWithoutTeacher.length > 0) {
      console.log(`\nAssigning teachers to ${offeringsWithoutTeacher.length} offerings...`)
      
      // Get available teachers
      const { data: teachers } = await supabase
        .from('teacher')
        .select('*')
        .limit(5)
      
      if (teachers && teachers.length > 0) {
        for (const offering of offeringsWithoutTeacher) {
          const teacher = teachers[Math.floor(Math.random() * teachers.length)]
          const { error } = await supabase
            .from('offering')
            .update({ teacher_id: teacher.id })
            .eq('id', offering.id)
          
          if (!error) {
            console.log(`  Assigned ${teacher.name} to ${offering.section?.name}`)
          }
        }
      }
    }
  }
  
  // 2. Check failed courses and their offerings
  console.log('\n2. CHECKING FAILED LECTURE COURSES:')
  const failedCodes = [
    'AE60208', 'AE61001', 'AE61003', 'AE61004', 'AE61026', 
    'AE61032', 'AE61038', 'AE51005', 'AE51010', 'AE51017',
    'AE60001', 'AE40009', 'AE40008', 'AE40007'
  ]
  
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
          teacher (name, max_per_day, max_per_week),
          section (program, year, name)
        `)
        .eq('course_id', course.id)
      
      console.log(`\n${code}: ${course.name}`)
      console.log(`  L-T-P: ${course.L}-${course.T}-${course.P}`)
      console.log(`  Offerings: ${offerings?.length || 0}`)
      
      if (!offerings || offerings.length === 0) {
        console.log('  WARNING: No offerings exist for this course!')
      } else {
        offerings.forEach(o => {
          console.log(`    - ${o.section?.name} - ${o.teacher?.name} (max ${o.teacher?.max_per_day}h/day)`)
        })
      }
    }
  }
  
  // 3. Create missing offerings for courses without them
  console.log('\n3. CREATING MISSING OFFERINGS:')
  
  // Get all courses
  const { data: allCourses } = await supabase
    .from('course')
    .select('*')
    .in('code', failedCodes)
  
  // Get PG section
  const { data: pgSection } = await supabase
    .from('section')
    .select('*')
    .eq('program', 'AE-PG')
    .single()
  
  // Get some teachers
  const { data: teachers } = await supabase
    .from('teacher')
    .select('*')
    .limit(10)
  
  if (allCourses && pgSection && teachers) {
    for (const course of allCourses) {
      // Check if offering exists
      const { data: existingOffering } = await supabase
        .from('offering')
        .select('id')
        .eq('course_id', course.id)
        .single()
      
      if (!existingOffering) {
        // Create offering
        const teacher = teachers[Math.floor(Math.random() * teachers.length)]
        const { error } = await supabase
          .from('offering')
          .insert({
            course_id: course.id,
            section_id: pgSection.id,
            teacher_id: teacher.id,
            expected_size: 30
          })
        
        if (!error) {
          console.log(`  Created offering for ${course.code} with teacher ${teacher.name}`)
        } else {
          console.error(`  Error creating offering for ${course.code}:`, error)
        }
      }
    }
  }
  
  // 4. Check slot availability
  console.log('\n4. CHECKING SLOT AVAILABILITY:')
  const { data: slots } = await supabase
    .from('slot')
    .select('*')
    .eq('is_lab', false)
  
  const { data: assignments } = await supabase
    .from('assignment')
    .select('slot_id')
  
  const usedSlotIds = new Set(assignments?.map(a => a.slot_id) || [])
  const availableSlots = slots?.filter(s => !usedSlotIds.has(s.id)) || []
  
  console.log(`Total lecture slots: ${slots?.length || 0}`)
  console.log(`Used slots: ${usedSlotIds.size}`)
  console.log(`Available slots: ${availableSlots.length}`)
  
  // 5. Add more classroom capacity if needed
  console.log('\n5. CHECKING CLASSROOM CAPACITY:')
  const { data: rooms } = await supabase
    .from('room')
    .select('*')
    .eq('kind', 'CLASS')
  
  const totalClassCapacity = rooms?.reduce((sum, r) => sum + r.capacity, 0) || 0
  console.log(`Total classroom capacity: ${totalClassCapacity}`)
  console.log(`Number of classrooms: ${rooms?.length || 0}`)
  
  // 6. Regenerate timetable
  console.log('\n6. REGENERATING TIMETABLE...')
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
      
      if (result.warnings?.length > 0) {
        console.log(`\nRemaining warnings: ${result.warnings.length}`)
        const warningCounts = {}
        result.warnings.forEach(w => {
          warningCounts[w.reason] = (warningCounts[w.reason] || 0) + 1
        })
        Object.entries(warningCounts).forEach(([reason, count]) => {
          console.log(`  - ${reason}: ${count}`)
        })
      }
    }
  } catch (error) {
    console.error('Error regenerating timetable:', error)
  }
  
  process.exit(0)
}

fixSchedulingIssues().catch(console.error)