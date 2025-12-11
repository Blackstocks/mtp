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

async function fixLabSlots() {
  console.log('=== FIXING LAB SLOTS ===\n')
  
  // 1. First, let's fix the incorrect lab slot times
  const { data: labSlots } = await supabase
    .from('slot')
    .select('*')
    .eq('code', 'LAB')
  
  console.log(`Found ${labSlots?.length || 0} LAB slots to fix`)
  
  // Define correct lab slot timings
  const labTimings = {
    'J': { day: 'MON', start: '14:00', end: '17:00' },
    'K': { day: 'TUE', start: '10:00', end: '13:00' },
    'L': { day: 'TUE', start: '14:00', end: '17:00' },
    'M': { day: 'THU', start: '10:00', end: '13:00' },
    'N': { day: 'THU', start: '14:00', end: '17:00' },
    'O': { day: 'FRI', start: '10:00', end: '13:00' },
    'P': { day: 'FRI', start: '14:00', end: '17:00' },
    'Q': { day: 'MON', start: '10:00', end: '13:00' },
    'R': { day: 'WED', start: '10:00', end: '13:00' },
    'X': { day: 'WED', start: '14:00', end: '17:00' }
  }
  
  // Update each lab slot with correct times
  for (const slot of labSlots || []) {
    if (slot.cluster && labTimings[slot.cluster]) {
      const timing = labTimings[slot.cluster]
      const { error } = await supabase
        .from('slot')
        .update({
          day: timing.day,
          start_time: timing.start,
          end_time: timing.end,
          is_lab: true
        })
        .eq('id', slot.id)
      
      if (error) {
        console.error(`Error updating slot ${slot.cluster}:`, error)
      } else {
        console.log(`Updated slot ${slot.cluster}: ${timing.day} ${timing.start}-${timing.end}`)
      }
    }
  }
  
  // 2. Clear existing lab slots and create proper ones
  console.log('\n2. RECREATING LAB SLOTS WITH PROPER STRUCTURE')
  
  // Delete existing LAB slots
  await supabase.from('slot').delete().eq('code', 'LAB')
  
  // Create new lab slots based on IIT KGP pattern
  const newLabSlots = []
  
  Object.entries(labTimings).forEach(([cluster, timing]) => {
    // Create 3 consecutive slots for each lab cluster (3-hour labs)
    for (let i = 0; i < 3; i++) {
      const startHour = parseInt(timing.start.split(':')[0]) + i
      const endHour = startHour + 1
      
      newLabSlots.push({
        code: cluster, // Use cluster as code for better identification
        occ: i + 1,
        day: timing.day,
        start_time: `${startHour.toString().padStart(2, '0')}:00`,
        end_time: `${endHour.toString().padStart(2, '0')}:00`,
        cluster: cluster,
        is_lab: true
      })
    }
  })
  
  const { error: insertError } = await supabase
    .from('slot')
    .insert(newLabSlots)
  
  if (insertError) {
    console.error('Error creating lab slots:', insertError)
  } else {
    console.log(`Created ${newLabSlots.length} lab slots`)
  }
  
  // 3. Create offerings for lab courses
  console.log('\n3. CREATING LAB OFFERINGS')
  
  // Get all courses with practicals
  const { data: labCourses } = await supabase
    .from('course')
    .select('*')
    .gt('P', 0)
  
  // Get all sections
  const { data: sections } = await supabase
    .from('section')
    .select('*')
    .order('year, name')
  
  // Get a default teacher for labs (you might want to update this logic)
  const { data: teachers } = await supabase
    .from('teacher')
    .select('*')
    .limit(5)
  
  console.log(`Found ${labCourses?.length || 0} courses with practicals`)
  console.log(`Found ${sections?.length || 0} sections`)
  
  // Create offerings for first year lab courses
  const firstYearLabCourse = labCourses?.find(c => c.code === 'EN19003' || c.code === 'CS19003' || c.code === 'PH19003')
  if (firstYearLabCourse && sections && teachers) {
    const firstYearSections = sections.filter(s => s.year === 1)
    
    for (const section of firstYearSections) {
      // Check if offering already exists
      const { data: existingOffering } = await supabase
        .from('offering')
        .select('*')
        .eq('course_id', firstYearLabCourse.id)
        .eq('section_id', section.id)
        .single()
      
      if (!existingOffering) {
        const { error } = await supabase
          .from('offering')
          .insert({
            course_id: firstYearLabCourse.id,
            section_id: section.id,
            teacher_id: teachers[0].id, // Assign first teacher by default
            expected_size: 30
          })
        
        if (error) {
          console.error(`Error creating offering for ${firstYearLabCourse.code} - ${section.name}:`, error)
        } else {
          console.log(`Created offering for ${firstYearLabCourse.code} - ${section.program} Year ${section.year} ${section.name}`)
        }
      }
    }
  }
  
  console.log('\nLab slots and offerings have been fixed!')
  process.exit(0)
}

fixLabSlots().catch(console.error)