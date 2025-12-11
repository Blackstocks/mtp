import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createAllOfferings() {
  console.log('=== CREATING ALL NECESSARY OFFERINGS ===\n')
  
  // Get all courses
  const { data: courses } = await supabase
    .from('course')
    .select('*')
    .order('code')
  
  // Get all sections
  const { data: sections } = await supabase
    .from('section')
    .select('*')
    .order('year, name')
  
  // Get all teachers
  const { data: teachers } = await supabase
    .from('teacher')
    .select('*')
    .order('name')
  
  console.log(`Found ${courses?.length || 0} courses`)
  console.log(`Found ${sections?.length || 0} sections`)
  console.log(`Found ${teachers?.length || 0} teachers`)
  
  if (!courses || !sections || !teachers || teachers.length === 0) {
    console.error('Missing data to create offerings')
    process.exit(1)
  }
  
  // Define course-to-year mapping based on course codes
  const courseYearMap = {
    // First year courses
    'EN19003': 1,
    'CS19003': 1,
    'PH19003': 1,
    'CE13003': 1,
    'MA1X001': 1,
    'EE19002': 1,
    // Second year courses
    'AE21009': 2,
    'AE21005': 2,
    'AE29202': 2,
    'AE29204': 2,
    // Third year courses
    'AE31003': 3,
    'AE31007': 3,
    'AE39001': 3,
    'AE39002': 3,
    'AE39003': 3,
    'AE39004': 3,
    'AE39201': 3,
    // Fourth year courses
    'AE40019': 4,
    'AE49003': 4,
    'AE49012': 4,
    // PG courses
    'AE61019': 5,
    'AE62202': 5,
    'AE69003': 5,
    'AE69006': 5,
    'AE69045': 5,
    'AE69208': 5
  }
  
  let createdCount = 0
  let skippedCount = 0
  
  // Create offerings for each course based on appropriate year
  for (const course of courses) {
    const targetYear = courseYearMap[course.code]
    if (!targetYear) {
      console.log(`Skipping ${course.code} - no year mapping defined`)
      continue
    }
    
    // Find appropriate sections for this course
    const targetSections = sections.filter(s => {
      if (targetYear <= 4) {
        // Undergraduate courses - match exact year
        return s.year === targetYear && s.program !== 'AE-PG'
      } else {
        // Postgraduate courses
        return s.program === 'AE-PG'
      }
    })
    
    if (targetSections.length === 0) {
      console.log(`No sections found for ${course.code} (Year ${targetYear})`)
      continue
    }
    
    // Assign teachers based on course type
    let assignedTeacher = teachers[0] // Default teacher
    
    // Try to distribute teachers evenly
    if (course.P > 0) {
      // Lab courses - prefer teachers with lab experience
      assignedTeacher = teachers[Math.floor(Math.random() * Math.min(3, teachers.length))]
    } else {
      // Theory courses - distribute among all teachers
      const teacherIndex = courses.indexOf(course) % teachers.length
      assignedTeacher = teachers[teacherIndex]
    }
    
    // Create offering for each appropriate section
    for (const section of targetSections) {
      // Check if offering already exists
      const { data: existingOffering } = await supabase
        .from('offering')
        .select('*')
        .eq('course_id', course.id)
        .eq('section_id', section.id)
        .single()
      
      if (existingOffering) {
        console.log(`Offering already exists for ${course.code} - ${section.name}`)
        skippedCount++
        continue
      }
      
      // Create new offering
      const { error } = await supabase
        .from('offering')
        .insert({
          course_id: course.id,
          section_id: section.id,
          teacher_id: assignedTeacher.id,
          expected_size: targetYear === 1 ? 60 : 30 // Larger size for first year
        })
      
      if (error) {
        console.error(`Error creating offering for ${course.code} - ${section.name}:`, error)
      } else {
        console.log(`Created offering: ${course.code} (${course.L}-${course.T}-${course.P}) for ${section.program} Year ${section.year} ${section.name} - Teacher: ${assignedTeacher.name}`)
        createdCount++
      }
    }
  }
  
  console.log(`\nSummary:`)
  console.log(`Created ${createdCount} new offerings`)
  console.log(`Skipped ${skippedCount} existing offerings`)
  
  // Now generate timetable
  console.log('\nRegenerating timetable...')
  const response = await fetch('http://localhost:3001/api/solver/generate', {
    method: 'POST'
  })
  
  if (response.ok) {
    const result = await response.json()
    console.log(`Timetable generated: ${result.assignments} assignments created`)
    console.log(`Utilization: ${result.stats?.utilization?.toFixed(1)}%`)
    if (result.warnings?.length > 0) {
      console.log(`Warnings: ${result.warnings.length} classes could not be scheduled`)
    }
  } else {
    console.error('Failed to generate timetable')
  }
  
  process.exit(0)
}

createAllOfferings().catch(console.error)