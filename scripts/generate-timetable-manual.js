import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { TimetableGenerator } from '../lib/timetable-generator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function generateTimetable() {
  console.log('=== MANUAL TIMETABLE GENERATION ===\n')
  
  // Fetch all required data
  console.log('Fetching data...')
  
  // Get teachers
  const { data: teachers } = await supabase
    .from('teacher')
    .select('*')
    .order('name')
  
  // Get rooms
  const { data: rooms } = await supabase
    .from('room')
    .select('*')
    .order('code')
  
  // Get slots
  const { data: slots } = await supabase
    .from('slot')
    .select('*')
    .order('day, start_time')
  
  // Get offerings with relations
  const { data: offeringsData } = await supabase
    .from('offering')
    .select('*')
    .order('section_id')
  
  // Get courses, sections, and teachers for offerings
  const courseIds = [...new Set(offeringsData?.map(o => o.course_id) || [])]
  const sectionIds = [...new Set(offeringsData?.map(o => o.section_id) || [])]
  const teacherIds = [...new Set(offeringsData?.filter(o => o.teacher_id).map(o => o.teacher_id) || [])]
  
  const [coursesRes, sectionsRes, teachersRes] = await Promise.all([
    supabase.from('course').select('*').in('id', courseIds),
    supabase.from('section').select('*').in('id', sectionIds),
    teacherIds.length > 0 
      ? supabase.from('teacher').select('*').in('id', teacherIds)
      : Promise.resolve({ data: [] })
  ])
  
  // Create lookup maps
  const courseMap = new Map(coursesRes.data?.map(c => [c.id, c]) || [])
  const sectionMap = new Map(sectionsRes.data?.map(s => [s.id, s]) || [])
  const teacherMap = new Map(teachersRes.data?.map(t => [t.id, t]) || [])
  
  // Combine data
  const offerings = offeringsData?.map(offering => ({
    ...offering,
    course: courseMap.get(offering.course_id) || null,
    section: sectionMap.get(offering.section_id) || null,
    teacher: offering.teacher_id ? teacherMap.get(offering.teacher_id) || null : null
  })) || []
  
  // Get availability
  const { data: availability } = await supabase
    .from('availability')
    .select('*')
  
  // Get locked assignments
  const { data: lockedAssignments } = await supabase
    .from('assignment')
    .select('*')
    .eq('is_locked', true)
  
  console.log('\nData summary:')
  console.log(`- Teachers: ${teachers?.length || 0}`)
  console.log(`- Rooms: ${rooms?.length || 0}`)
  console.log(`- Slots: ${slots?.length || 0} (Lab slots: ${slots?.filter(s => s.is_lab).length || 0})`)
  console.log(`- Offerings: ${offerings.length}`)
  console.log(`- Offerings with labs: ${offerings.filter(o => o.course?.P > 0).length}`)
  console.log(`- Availability entries: ${availability?.length || 0}`)
  console.log(`- Locked assignments: ${lockedAssignments?.length || 0}`)
  
  // Show some lab offerings
  console.log('\nSample lab offerings:')
  offerings.filter(o => o.course?.P > 0).slice(0, 5).forEach(o => {
    console.log(`  - ${o.course.code} for ${o.section?.program} Year ${o.section?.year} - Teacher: ${o.teacher?.name}`)
  })
  
  // Run generator
  console.log('\nRunning timetable generator...')
  const generator = new TimetableGenerator({
    teachers: teachers || [],
    rooms: rooms || [],
    slots: slots || [],
    offerings: offerings,
    availability: availability || [],
    lockedAssignments: lockedAssignments || []
  })
  
  const result = generator.generate()
  
  console.log('\nGeneration results:')
  console.log(`- Total offerings: ${result.stats.totalOfferings}`)
  console.log(`- Total slots required: ${result.stats.totalSlotsRequired}`)
  console.log(`- Successful assignments: ${result.stats.successfulAssignments}`)
  console.log(`- Failed assignments: ${result.stats.failedAssignments}`)
  console.log(`- Utilization rate: ${result.stats.utilizationRate.toFixed(2)}%`)
  
  // Check lab assignments
  const labAssignments = result.assignments.filter(a => a.kind === 'P')
  console.log(`\nLab assignments created: ${labAssignments.length}`)
  
  if (result.warnings.length > 0) {
    console.log('\nWarnings:')
    result.warnings.slice(0, 10).forEach(w => {
      const offering = offerings.find(o => o.id === w.offeringId)
      console.log(`  - ${offering?.course?.code || 'Unknown'} (${w.kind}): ${w.reason}`)
    })
    if (result.warnings.length > 10) {
      console.log(`  ... and ${result.warnings.length - 10} more warnings`)
    }
  }
  
  // Clear existing unlocked assignments
  console.log('\nClearing existing unlocked assignments...')
  await supabase
    .from('assignment')
    .delete()
    .eq('is_locked', false)
  
  // Insert new assignments
  if (result.assignments.length > 0) {
    console.log(`Inserting ${result.assignments.length} new assignments...`)
    const { error } = await supabase
      .from('assignment')
      .insert(result.assignments)
    
    if (error) {
      console.error('Error inserting assignments:', error)
    } else {
      console.log('Assignments inserted successfully!')
    }
  }
  
  // Verify lab assignments in database
  const { data: verifyLabs, count } = await supabase
    .from('assignment')
    .select('*', { count: 'exact' })
    .eq('kind', 'P')
  
  console.log(`\nVerification: ${count} lab assignments in database`)
  
  process.exit(0)
}

generateTimetable().catch(console.error)