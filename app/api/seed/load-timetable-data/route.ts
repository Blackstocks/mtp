import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

// Parse the timetable data to extract unique information
const timetableData = {
  // First Year courses
  firstYear: {
    courses: [
      { code: "MA11004", name: "Mathematics", teachers: ['SKP', 'SG', 'KM', 'AD', 'MB', 'HPS', 'SB', 'RN'] },
      { code: "PH11003", name: "Physics", teachers: ['TD', 'MMB', 'SD', 'PP'] },
      { code: "EE11003", name: "Electrical Technology", teachers: ['DD', 'AKD', 'SK'] },
      { code: "CS10003", name: "Programming and Data Structures", teachers: ['AC', 'SM', 'SK', 'AH', 'AD'] },
      { code: "CS19003", name: "Programming Lab", teachers: ['SD', 'AC', 'SB', 'JM', 'DRC', 'SA', 'AD', 'PPC', 'SS', 'SKG', 'SG', 'PB', 'SM', 'DR', 'PD', 'SPP'] },
      { code: "PH19003", name: "Physics Laboratory", teachers: ['PRC', 'DC', 'AR', 'AKD', 'SK', 'SDD', 'SKS', 'PSB'] },
      { code: "CE13003", name: "Engineering Drawing", teachers: ['AC', 'MK', 'SS', 'HHS', 'JC', 'KD', 'MC', 'AB', 'TTD'] }
    ],
    rooms: ['NR111', 'NR112', 'NR211', 'NR212', 'S302', 'S301', 'PC Labs']
  },
  
  // Second Year courses
  secondYear: {
    courses: [
      { code: "MA20202", name: "Transform Calculus", teachers: ['NKG', 'DG', 'PC'] },
      { code: "AE20202", name: "Introduction to Flight Vehicle Controls", teachers: ['SH'] },
      { code: "AE21201", name: "Introduction to Aerodynamics", teachers: ['SMD'] },
      { code: "AE21202", name: "Low Speed Aerodynamics", teachers: ['SG'] },
      { code: "AE21203", name: "Dynamics for Aerospace Engineers", teachers: ['MS'] },
      { code: "AE21204", name: "Introduction to Aerospace Structures", teachers: ['PJ'] },
      { code: "AE21205", name: "Thermodynamics & Aerospace Prop. System", teachers: ['RJ'] },
      { code: "AE29202", name: "Aerodynamics Laboratory - I", teachers: ['SMD', 'MK'] },
      { code: "AE29204", name: "Structures Laboratory - I", teachers: ['MRS', 'PJ'] }
    ],
    rooms: ['NR121', 'NR214', 'NR213', 'NR221', 'NR222', 'Aerodynamics Laboratory', 'Structures Laboratory', '2nd Year Class Room']
  },
  
  // Third Year courses
  thirdYear: {
    courses: [
      { code: "AE31002", name: "Aerospace Structural Dynamics", teachers: ['DKM'] },
      { code: "AE31004", name: "Aircraft Stability and Control", teachers: ['MS'] },
      { code: "AE31007", name: "Mechanics of Flight", teachers: ['SB'] },
      { code: "AE31008", name: "Theory of Jet Propulsion", teachers: ['RJ'] },
      { code: "AE31009", name: "Aerospace Structural Analysis", teachers: ['MM'] },
      { code: "AE31010", name: "Viscous Flow Theory", teachers: ['SS'] },
      { code: "AE31103", name: "High Speed Aerodynamics", teachers: ['KPS'] },
      { code: "AE39001", name: "Aerodynamics Lab-II", teachers: ['SS'] },
      { code: "AE39002", name: "System Laboratory", teachers: ['NKP'] },
      { code: "AE39003", name: "Structures Lab–II", teachers: ['AG'] },
      { code: "AE39004", name: "Propulsion Laboratory", teachers: ['CSM'] },
      { code: "AE39201", name: "Innovation Lab I", teachers: ['ADG', 'SK'] }
    ],
    rooms: ['NC331', 'NC431', 'NC241', 'NC142', '3rd Year Class Room', 'Systems Laboratory', 'Propulsion Laboratory']
  },
  
  // Fourth Year & PG courses
  fourthYear: {
    courses: [
      { code: "AE40006", name: "Composite Structures", teachers: ['MRS', 'PJ'] },
      { code: "AE40007", name: "Introduction to Helicopter Engineering", teachers: ['NKP'] },
      { code: "AE40008", name: "Aeroelasticity", teachers: ['DKM'] },
      { code: "AE40009", name: "Rocket Propulsion", teachers: ['SK'] },
      { code: "AE40018", name: "Introduction to Turbulence", teachers: ['SG'] },
      { code: "AE40019", name: "Automatic Control of Aircraft", teachers: ['SH'] },
      { code: "AE40023", name: "Introduction to Avionics", teachers: ['SB'] },
      { code: "AE40026", name: "Space Dynamics", teachers: ['MS'] },
      { code: "AE40030", name: "Advanced Gas Turbine Theory", teachers: ['CSM'] },
      { code: "AE40031", name: "Computational Fluid Dynamics", teachers: ['AP'] },
      { code: "AE40033", name: "Finite Element Methods", teachers: ['MRS'] },
      { code: "AE40037", name: "Physics of Fluid Flow Experiments", teachers: ['SMD'] },
      { code: "AE49003", name: "Aircraft Design & Optimisation", teachers: ['NKP', 'AG'] },
      { code: "AE49012", name: "Flight Testing Laboratory", teachers: ['SS'] },
      { code: "AE51005", name: "Unsteady Aerodynamics", teachers: ['AR'] },
      { code: "AE51010", name: "Experimental Stress Analysis", teachers: ['SCP'] },
      { code: "AE51017", name: "Advanced Gas Dynamics", teachers: ['KPS'] },
      { code: "AE60001", name: "Aerodynamics", teachers: ['AR', 'MK'] },
      { code: "AE60003", name: "Aerospace Structures", teachers: ['PJ'] },
      { code: "AE60005", name: "Aircraft Propulsion", teachers: ['ADG'] },
      { code: "AE60006", name: "Industrial Aerodynamics", teachers: ['SMD'] },
      { code: "AE60007", name: "Flight Mechanics", teachers: ['NKP', 'SB'] },
      { code: "AE60028", name: "Advanced Propulsion Systems", teachers: ['AG'] },
      { code: "AE60036", name: "Fracture Mechanics", teachers: ['SCP'] },
      { code: "AE60206", name: "Avionics", teachers: ['SB'] },
      { code: "AE60208", name: "Combustion of Solid Fuels and Propellants", teachers: ['SK'] },
      { code: "AE61001", name: "Computational Fluid Dynamics", teachers: ['AP'] },
      { code: "AE61003", name: "Finite Element Methods", teachers: ['MRS'] },
      { code: "AE61004", name: "Design of Compressors and Turbines", teachers: ['CSM'] },
      { code: "AE61019", name: "Smart Structures", teachers: ['MM'] },
      { code: "AE61026", name: "Hypersonic Aerodynamics", teachers: ['KPS'] },
      { code: "AE61032", name: "Introduction to Turbulence", teachers: ['SG'] },
      { code: "AE61038", name: "Aeroelasticity", teachers: ['DKM'] },
      { code: "AE69006", name: "Aerospace Laboratory II", teachers: ['RJ', 'SS'] },
      { code: "AE69208", name: "Innovation Laboratory II", teachers: ['SK', 'AG'] }
    ],
    rooms: ['1st Floor Seminar Room', 'AECLA1']
  }
}

// Room types mapping
const roomTypes = {
  'NR': 'CLASS',
  'NC': 'CLASS',
  'S3': 'CLASS',
  'PC Labs': 'LAB',
  'Laboratory': 'LAB',
  'Systems Laboratory': 'LAB',
  'Propulsion Laboratory': 'LAB',
  'Aerodynamics Laboratory': 'LAB',
  'Structures Laboratory': 'LAB',
  'Class Room': 'CLASS',
  'Seminar Room': 'CLASS',
  'AECLA1': 'LAB'
}

// Teacher code to full name mapping (extended)
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
  'BS': 'Bhrigu Nath Singh',
  // Additional teachers from first year
  'SKP': 'S.K. Patra',
  'KM': 'K. Mukhopadhyay',
  'AD': 'A. Das',
  'MB': 'M. Banerjee',
  'HPS': 'H.P. Sudarshan',
  'RN': 'R. Nayak',
  'TD': 'T. Das',
  'MMB': 'M.M. Barman',
  'SD': 'S. Dey',
  'PP': 'P. Pal',
  'DD': 'D. Das',
  'AKD': 'A.K. Das',
  'AC': 'A. Chakraborty',
  'SM': 'S. Mukhopadhyay',
  'AH': 'A. Hazra',
  'JM': 'J. Mukhopadhyay',
  'DRC': 'D.R. Chowdhury',
  'SA': 'S. Adhikari',
  'PPC': 'P.P. Chakrabarti',
  'SKG': 'S.K. Ghoshal',
  'PB': 'P. Biswas',
  'DR': 'D. Roy',
  'PD': 'P. Das',
  'SPP': 'S.P. Pal',
  'PRC': 'P.R. Chowdhury',
  'DC': 'D. Chattopadhyay',
  'SDD': 'S.D. Das',
  'SKS': 'S.K. Sanyal',
  'PSB': 'P.S. Bhattacharya',
  'HHS': 'H.H. Singh',
  'JC': 'J. Chakraborty',
  'KD': 'K. Das',
  'MC': 'M. Chanda',
  'AB': 'A. Bhattacharya',
  'TTD': 'T.T. Dutta',
  'NKG': 'N.K. Ghosh',
  'DG': 'D. Goswami',
  'PC': 'P. Chaudhuri'
}

// IIT KGP time slots
const timeSlots = [
  // Morning slots
  { code: 'A', occ: 1, day: 'MON', start_time: '08:00', end_time: '08:55', cluster: null, is_lab: false },
  { code: 'B', occ: 1, day: 'MON', start_time: '09:00', end_time: '09:55', cluster: null, is_lab: false },
  { code: 'C', occ: 1, day: 'MON', start_time: '10:00', end_time: '10:55', cluster: null, is_lab: false },
  { code: 'D', occ: 1, day: 'MON', start_time: '11:00', end_time: '11:55', cluster: null, is_lab: false },
  { code: 'E', occ: 1, day: 'MON', start_time: '12:00', end_time: '12:55', cluster: null, is_lab: false },
  // Afternoon slots
  { code: 'F', occ: 1, day: 'MON', start_time: '14:00', end_time: '14:55', cluster: null, is_lab: false },
  { code: 'G', occ: 1, day: 'MON', start_time: '15:00', end_time: '15:55', cluster: null, is_lab: false },
  { code: 'H', occ: 1, day: 'MON', start_time: '16:00', end_time: '16:55', cluster: null, is_lab: false },
  { code: 'I', occ: 1, day: 'MON', start_time: '17:00', end_time: '17:55', cluster: null, is_lab: false },
  // Lab slots
  { code: 'J', occ: 1, day: 'MON', start_time: '14:00', end_time: '16:55', cluster: 'LAB_J', is_lab: true },
  { code: 'L', occ: 1, day: 'MON', start_time: '17:00', end_time: '19:55', cluster: 'LAB_L', is_lab: true }
]

export async function POST() {
  try {
    const results = {
      teachers: 0,
      rooms: 0,
      courses: 0,
      sections: 0,
      offerings: 0,
      slots: 0
    }
    
    // Step 1: Create all teachers
    const allTeachers = new Set<string>()
    Object.values(timetableData).forEach(yearData => {
      yearData.courses.forEach(course => {
        course.teachers.forEach(t => allTeachers.add(t))
      })
    })
    
    const teacherRecords = Array.from(allTeachers)
      .filter(code => teacherMappings[code])
      .map(code => ({
        code: code,
        name: teacherMappings[code],
        max_per_day: 3,
        max_per_week: 12,
        prefs: {}
      }))
    
    if (teacherRecords.length > 0) {
      const { data: teachers } = await supabase
        .from('teacher')
        .upsert(teacherRecords, { onConflict: 'code' })
        .select()
      results.teachers = teachers?.length || 0
    }
    
    // Step 2: Create all rooms
    const allRooms = new Set<string>()
    Object.values(timetableData).forEach(yearData => {
      yearData.rooms.forEach(room => allRooms.add(room))
    })
    
    const roomRecords = Array.from(allRooms).map(room => {
      let kind = 'CLASS'
      let capacity = 60
      
      // Determine room type
      for (const [pattern, type] of Object.entries(roomTypes)) {
        if (room.includes(pattern)) {
          kind = type
          if (type === 'LAB') capacity = 30
          break
        }
      }
      
      return {
        code: room,
        capacity: capacity,
        kind: kind as 'CLASS' | 'LAB',
        tags: []
      }
    })
    
    if (roomRecords.length > 0) {
      const { data: rooms } = await supabase
        .from('room')
        .upsert(roomRecords, { onConflict: 'code' })
        .select()
      results.rooms = rooms?.length || 0
    }
    
    // Step 3: Create sections
    const sections = [
      { program: 'FIRST', year: 1, name: 'FIRST-1' },
      { program: 'AE', year: 2, name: 'AE-2A' },
      { program: 'AE', year: 3, name: 'AE-3A' },
      { program: 'AE', year: 4, name: 'AE-4A' },
      { program: 'AE-PG', year: 1, name: 'AE-PG-1' }
    ]
    
    const { data: createdSections } = await supabase
      .from('section')
      .upsert(sections, { onConflict: 'name' })
      .select()
    results.sections = createdSections?.length || 0
    
    // Step 4: Create all courses
    const allCourses = []
    Object.values(timetableData).forEach(yearData => {
      yearData.courses.forEach(course => {
        // Determine L-T-P based on course code
        let L = 3, T = 0, P = 0
        
        if (course.code.includes('19') || course.code.includes('29') || 
            course.code.includes('39') || course.code.includes('49') ||
            course.code.includes('69') || course.name.includes('Lab')) {
          // Lab courses
          L = 0
          P = 3
        } else if (course.code === 'CE13003') {
          // Engineering Drawing
          L = 1
          P = 3
        } else if (course.name.includes('Tutorial')) {
          // Tutorial courses
          L = 2
          T = 1
        }
        
        allCourses.push({
          code: course.code,
          name: course.name,
          L: L,
          T: T,
          P: P
        })
      })
    })
    
    if (allCourses.length > 0) {
      const { data: courses } = await supabase
        .from('course')
        .upsert(allCourses, { onConflict: 'code' })
        .select()
      results.courses = courses?.length || 0
    }
    
    // Step 5: Create time slots
    const allSlots = []
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
    
    timeSlots.forEach(slot => {
      days.forEach(day => {
        // Create occurrences
        for (let occ = 1; occ <= 3; occ++) {
          allSlots.push({
            ...slot,
            day: day,
            occ: occ
          })
        }
      })
    })
    
    const { data: slots } = await supabase
      .from('slot')
      .upsert(allSlots, { onConflict: 'code,occ,day' })
      .select()
    results.slots = slots?.length || 0
    
    // Step 6: Get IDs for offerings
    const [teacherIds, courseIds, sectionIds] = await Promise.all([
      supabase.from('teacher').select('id, code'),
      supabase.from('course').select('id, code'),
      supabase.from('section').select('id, name, year, program')
    ])
    
    const teacherMap: Record<string, string> = {}
    teacherIds.data?.forEach(t => { teacherMap[t.code] = t.id })
    
    const courseMap: Record<string, string> = {}
    courseIds.data?.forEach(c => { courseMap[c.code] = c.id })
    
    const sectionMap: Record<string, string> = {}
    sectionIds.data?.forEach(s => { sectionMap[s.name] = s.id })
    
    // Step 7: Create offerings based on timetable
    const offerings = []
    
    // First year offerings
    timetableData.firstYear.courses.forEach(course => {
      const primaryTeacher = course.teachers[0]
      if (courseMap[course.code] && teacherMap[primaryTeacher] && sectionMap['FIRST-1']) {
        offerings.push({
          course_id: courseMap[course.code],
          section_id: sectionMap['FIRST-1'],
          teacher_id: teacherMap[primaryTeacher],
          expected_size: 60,
          needs: course.code.includes('19') ? ['PC', 'Lab Equipment'] : ['Projector']
        })
      }
    })
    
    // Second year offerings
    timetableData.secondYear.courses.forEach(course => {
      const primaryTeacher = course.teachers[0]
      if (courseMap[course.code] && teacherMap[primaryTeacher] && sectionMap['AE-2A']) {
        offerings.push({
          course_id: courseMap[course.code],
          section_id: sectionMap['AE-2A'],
          teacher_id: teacherMap[primaryTeacher],
          expected_size: 60,
          needs: course.code.includes('29') ? ['Lab Equipment'] : ['Projector']
        })
      }
    })
    
    // Third year offerings
    timetableData.thirdYear.courses.forEach(course => {
      const primaryTeacher = course.teachers[0]
      if (courseMap[course.code] && teacherMap[primaryTeacher] && sectionMap['AE-3A']) {
        offerings.push({
          course_id: courseMap[course.code],
          section_id: sectionMap['AE-3A'],
          teacher_id: teacherMap[primaryTeacher],
          expected_size: 60,
          needs: course.code.includes('39') ? ['Lab Equipment'] : ['Projector']
        })
      }
    })
    
    // Fourth year and PG offerings
    timetableData.fourthYear.courses.forEach(course => {
      const primaryTeacher = course.teachers[0]
      const isPostgrad = course.code.startsWith('AE6')
      const sectionName = isPostgrad ? 'AE-PG-1' : 'AE-4A'
      
      if (courseMap[course.code] && teacherMap[primaryTeacher] && sectionMap[sectionName]) {
        offerings.push({
          course_id: courseMap[course.code],
          section_id: sectionMap[sectionName],
          teacher_id: teacherMap[primaryTeacher],
          expected_size: isPostgrad ? 30 : 60,
          needs: course.code.includes('69') ? ['Lab Equipment'] : ['Projector']
        })
      }
    })
    
    if (offerings.length > 0) {
      const { data: createdOfferings } = await supabase
        .from('offering')
        .insert(offerings)
        .select()
      results.offerings = createdOfferings?.length || 0
    }
    
    return NextResponse.json({
      success: true,
      message: 'Successfully loaded timetable data',
      results: results,
      summary: {
        totalTeachers: allTeachers.size,
        totalRooms: allRooms.size,
        totalCourses: allCourses.length,
        totalOfferings: offerings.length
      }
    })
    
  } catch (error: any) {
    console.error('Load timetable error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}