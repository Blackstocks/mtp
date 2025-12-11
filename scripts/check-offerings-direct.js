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

async function checkOfferings() {
  console.log('=== CHECKING OFFERINGS DIRECTLY ===\n')
  
  // 1. Get all offerings
  const { data: offerings, error } = await supabase
    .from('offering')
    .select('*')
  
  console.log(`Total offerings in database: ${offerings?.length || 0}`)
  if (error) console.error('Error fetching offerings:', error)
  
  // 2. Get offerings with course details using a different approach
  const { data: offeringsWithCourse, error: error2 } = await supabase
    .from('offering')
    .select('id, course_id, section_id, teacher_id')
  
  console.log(`\nChecking each offering manually:`)
  
  let labOfferingsCount = 0
  
  for (const offering of offeringsWithCourse || []) {
    // Get course details
    const { data: course } = await supabase
      .from('course')
      .select('code, name, L, T, P')
      .eq('id', offering.course_id)
      .single()
    
    // Get section details
    const { data: section } = await supabase
      .from('section')
      .select('program, year, name')
      .eq('id', offering.section_id)
      .single()
    
    // Get teacher details
    const { data: teacher } = await supabase
      .from('teacher')
      .select('name')
      .eq('id', offering.teacher_id)
      .single()
    
    if (course && course.P > 0) {
      labOfferingsCount++
      console.log(`  - Lab Offering: ${course.code} (${course.L}-${course.T}-${course.P}) for ${section?.program} Year ${section?.year} - Teacher: ${teacher?.name}`)
    }
  }
  
  console.log(`\nTotal offerings with practicals: ${labOfferingsCount}`)
  
  // 3. Check specific lab course offerings
  console.log('\n=== CHECKING SPECIFIC LAB COURSES ===')
  
  const labCourseCodes = ['EN19003', 'CS19003', 'PH19003', 'CE13003', 'AE29202', 'AE29204']
  
  for (const code of labCourseCodes) {
    // Get course
    const { data: course } = await supabase
      .from('course')
      .select('*')
      .eq('code', code)
      .single()
    
    if (course) {
      // Get offerings for this course
      const { data: courseOfferings } = await supabase
        .from('offering')
        .select('*')
        .eq('course_id', course.id)
      
      console.log(`${code}: ${courseOfferings?.length || 0} offerings`)
    }
  }
  
  process.exit(0)
}

checkOfferings().catch(console.error)