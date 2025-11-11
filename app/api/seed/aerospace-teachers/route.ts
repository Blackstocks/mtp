import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

// Teacher name mappings
const teacherMappings: Record<string, string> = {
  'SG': 'Somnath Ghosh',
  'MK': 'Mrinal Kaushik',
  'SH': 'Sikha Hota',
  'SMD': 'Sunil Manohar Dash',
  'MS': 'Manoranjan Sinha',
  'RJ': 'Ratan Joarder',
  'KPS': 'Kalyan Prasad Sinhamahapatra',
  'MM': 'Mira Mitra',
  'SB': 'Susmita Bhattacharyya',
  'SS': 'Sandeep Saha',
  'ADG': 'Amardip Ghosh',
  'SK': 'Srinibas Karmakar',
  'AG': 'Anup Ghosh',
  'CSM': 'Chetankumar Sureshbhai Mistry',
  'AP': 'Akshay Prakash',
  'MRS': 'Mohammed Rabius Sunny',
  'NKP': 'Naba Kumar Peyada',
  'DKM': 'Dipak Kumar Maiti',
  'AR': 'Arnab Roy',
  'PJ': 'Prasun Jana',
  'SCP': 'Suresh Chandra Pradhan',
  'BS': 'Bhrigu Nath Singh'
}

// Course-teacher assignments
const courseAssignments = [
  { code: "ME10003", name: "Mechanics (L+T)", L: 3, T: 1, P: 0, teachers: ['SG'] },
  { code: "CE13003", name: "Engg. Drawing & Computer Graphics", L: 1, T: 0, P: 3, teachers: ['MK'] },
  { code: "EN19003", name: "First Year Lab (ENGINEERING LABORATORY)", L: 0, T: 0, P: 3, teachers: ['SH'] },
  { code: "AE21201", name: "Introduction to Aerodynamics", L: 3, T: 1, P: 0, teachers: ['SMD'] },
  { code: "AE21203", name: "Dynamics for Aerospace Engineers", L: 3, T: 1, P: 0, teachers: ['MS'] },
  { code: "AE21205", name: "Thermodynamics & Aerospace Prop. System", L: 3, T: 1, P: 0, teachers: ['RJ'] },
  { code: "AE31103", name: "High Speed Aerodynamics", L: 3, T: 1, P: 0, teachers: ['KPS'] },
  { code: "AE31009", name: "Aerospace Structural Analysis", L: 3, T: 1, P: 0, teachers: ['MM'] },
  { code: "AE31007", name: "Mechanics of Flight", L: 3, T: 1, P: 0, teachers: ['SB'] },
  { code: "AE39001", name: "Aerodynamics Lab-II", L: 0, T: 0, P: 3, teachers: ['SS'] },
  { code: "AE39201", name: "Innovation Lab I", L: 0, T: 0, P: 3, teachers: ['ADG', 'SK'] },
  { code: "AE39003", name: "Structures Lab –II", L: 0, T: 0, P: 3, teachers: ['AG'] },
  { code: "AE31010", name: "Viscous Flow Theory", L: 3, T: 0, P: 0, teachers: ['SS'] },
  { code: "AE40030", name: "Advanced Gas Turbine Theory", L: 3, T: 0, P: 0, teachers: ['CSM'] },
  { code: "AE40031", name: "Computational Fluid Dynamics", L: 3, T: 0, P: 0, teachers: ['AP'] },
  { code: "AE40033", name: "Finite Element Methods", L: 3, T: 0, P: 0, teachers: ['MRS'] },
  { code: "AE40007", name: "Introduction to Helicopter Engineering", L: 3, T: 0, P: 0, teachers: ['NKP'] },
  { code: "AE40009", name: "Rocket Propulsion", L: 3, T: 0, P: 0, teachers: ['SK'] },
  { code: "AE40019", name: "Automatic Control of Aircraft", L: 3, T: 0, P: 0, teachers: ['SH'] },
  { code: "AE40037", name: "Physics of Fluid Flow Experiments", L: 3, T: 0, P: 0, teachers: ['SMD'] },
  { code: "AE51017", name: "Advanced Gas Dynamics", L: 3, T: 0, P: 0, teachers: ['KPS'] },
  { code: "AE62202", name: "Advanced Composite Lab", L: 1, T: 0, P: 3, teachers: ['AG'] },
  { code: "AE40008", name: "Aeroelasticity", L: 3, T: 0, P: 0, teachers: ['DKM'] },
  { code: "AE40006", name: "Composite Structures", L: 3, T: 0, P: 0, teachers: ['MRS', 'PJ'] },
  { code: "AE51010", name: "Experimental Stress Analysis", L: 3, T: 0, P: 0, teachers: ['SCP'] },
  { code: "AE51005", name: "Unsteady Aerodynamics", L: 3, T: 0, P: 0, teachers: ['AR'] },
  { code: "AE60001", name: "Aerodynamics", L: 3, T: 1, P: 0, teachers: ['AR', 'MK'] },
  { code: "AE60003", name: "Aerospace Structures", L: 3, T: 1, P: 0, teachers: ['PJ'] },
  { code: "AE60005", name: "Aircraft Propulsion", L: 3, T: 1, P: 0, teachers: ['ADG'] },
  { code: "AE60007", name: "Flight Mechanics", L: 3, T: 1, P: 0, teachers: ['NKP', 'SB'] },
  { code: "AE69045", name: "Seminar-I", L: 0, T: 0, P: 3, teachers: ['CSM'] },
  { code: "AE69003", name: "AEROSPACE LAB-I", L: 0, T: 0, P: 3, teachers: ['NKP', 'MM'] }
]

export async function POST() {
  try {
    // First, create all teachers
    const uniqueTeachers = new Set<string>()
    courseAssignments.forEach(course => {
      course.teachers.forEach(teacherCode => {
        if (teacherMappings[teacherCode]) {
          uniqueTeachers.add(teacherCode)
        }
      })
    })

    // Create teacher records
    const teacherRecords = Array.from(uniqueTeachers).map(code => ({
      code: code,
      name: teacherMappings[code],
      max_per_day: 3,
      max_per_week: 12,
      prefs: {} // Empty preferences object
    }))

    // Insert teachers
    const { data: teachers, error: teacherError } = await supabase
      .from('teacher')
      .upsert(teacherRecords, {
        onConflict: 'code',
        ignoreDuplicates: false
      })
      .select()

    if (teacherError) {
      throw new Error(`Failed to create teachers: ${teacherError.message}`)
    }

    // Create a mapping of teacher code to ID
    const teacherIdMap: Record<string, string> = {}
    const { data: allTeachers } = await supabase
      .from('teacher')
      .select('id, code')
    
    allTeachers?.forEach(t => {
      teacherIdMap[t.code] = t.id
    })

    // Now create/update courses
    const courseRecords = courseAssignments.map(course => ({
      code: course.code,
      name: course.name,
      L: course.L,
      T: course.T,
      P: course.P
    }))

    const { data: courses, error: courseError } = await supabase
      .from('course')
      .upsert(courseRecords, {
        onConflict: 'code',
        ignoreDuplicates: false
      })
      .select()

    if (courseError) {
      throw new Error(`Failed to create courses: ${courseError.message}`)
    }

    // Get sections (or create default ones if needed)
    let { data: sections } = await supabase
      .from('section')
      .select('id, program, year, name')
      .order('year, name')

    // If no sections exist, create some default aerospace sections
    if (!sections || sections.length === 0) {
      const defaultSections = [
        { program: 'AE', year: 2, name: 'AE-2A' },
        { program: 'AE', year: 3, name: 'AE-3A' },
        { program: 'AE', year: 4, name: 'AE-4A' },
        { program: 'AE', year: 1, name: 'AE-1A' }, // For first year courses
        { program: 'AE-PG', year: 1, name: 'AE-PG-1' }, // For PG courses
      ]

      const { data: newSections } = await supabase
        .from('section')
        .upsert(defaultSections, {
          onConflict: 'name'
        })
        .select()
      
      sections = newSections || []
    }

    // Create course ID mapping
    const courseIdMap: Record<string, string> = {}
    const { data: allCourses } = await supabase
      .from('course')
      .select('id, code')
    
    allCourses?.forEach(c => {
      courseIdMap[c.code] = c.id
    })

    // Create offerings (course-teacher-section assignments)
    const offerings = []
    const missingSections = []
    
    for (const assignment of courseAssignments) {
      const courseId = courseIdMap[assignment.code]
      if (!courseId) {
        console.log(`Course not found: ${assignment.code}`)
        continue
      }

      // Determine appropriate section based on course code
      let sectionId: string | undefined
      const courseCode = assignment.code
      
      if (courseCode.startsWith('AE2')) {
        sectionId = sections.find(s => s.year === 2 && s.program === 'AE')?.id
      } else if (courseCode.startsWith('AE3')) {
        sectionId = sections.find(s => s.year === 3 && s.program === 'AE')?.id
      } else if (courseCode.startsWith('AE4')) {
        sectionId = sections.find(s => s.year === 4 && s.program === 'AE')?.id
      } else if (courseCode.startsWith('AE5') || courseCode.startsWith('AE6')) {
        sectionId = sections.find(s => s.program === 'AE-PG')?.id
      } else {
        // First year courses (ME, CE, EN, etc.)
        sectionId = sections.find(s => s.year === 1 && s.program === 'AE')?.id
      }

      if (!sectionId) {
        missingSections.push(courseCode)
        continue
      }

      // For courses with multiple teachers, create separate offerings
      if (assignment.teachers.length > 1) {
        // For co-taught courses, use the first teacher as primary
        const primaryTeacherId = teacherIdMap[assignment.teachers[0]]
        if (primaryTeacherId) {
          offerings.push({
            course_id: courseId,
            section_id: sectionId,
            teacher_id: primaryTeacherId,
            expected_size: 60,
            needs: assignment.P > 0 ? ['PC', 'Projector', 'Lab Equipment'] : ['Projector', 'Whiteboard']
          })
        }
      } else {
        const teacherId = teacherIdMap[assignment.teachers[0]]
        if (teacherId) {
          offerings.push({
            course_id: courseId,
            section_id: sectionId,
            teacher_id: teacherId,
            expected_size: 60,
            needs: assignment.P > 0 ? ['PC', 'Projector', 'Lab Equipment'] : ['Projector', 'Whiteboard']
          })
        }
      }
    }

    console.log(`Creating ${offerings.length} offerings...`)
    
    const { data: createdOfferings, error: offeringError } = await supabase
      .from('offering')
      .insert(offerings)
      .select()

    if (offeringError) {
      console.error('Offering error:', offeringError)
      throw new Error(`Failed to create offerings: ${offeringError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully loaded aerospace teachers and course assignments',
      stats: {
        teachers: teacherRecords.length,
        courses: courseRecords.length,
        offerings: createdOfferings?.length || 0,
        sections: sections.length,
        debug: {
          sampleOfferings: offerings.slice(0, 3),
          totalOfferingsCreated: offerings.length,
          missingSections: missingSections,
          availableSections: sections.map(s => ({ 
            id: s.id, 
            program: s.program, 
            year: s.year, 
            name: s.name 
          }))
        }
      }
    })

  } catch (error: any) {
    console.error('Load teachers error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}