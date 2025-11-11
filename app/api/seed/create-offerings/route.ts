import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function POST() {
  try {
    // Get all required data
    const { data: teachers } = await supabase.from('teacher').select('*')
    const { data: courses } = await supabase.from('course').select('*')
    const { data: sections } = await supabase.from('section').select('*')
    
    console.log('Data counts:', {
      teachers: teachers?.length,
      courses: courses?.length,
      sections: sections?.length
    })
    
    if (!teachers?.length || !courses?.length || !sections?.length) {
      return NextResponse.json({
        success: false,
        error: 'Missing required data',
        counts: {
          teachers: teachers?.length || 0,
          courses: courses?.length || 0,
          sections: sections?.length || 0
        }
      })
    }
    
    // Create a mapping of course codes to appropriate sections
    const courseSectionMap: Record<string, string> = {}
    
    sections.forEach(section => {
      if (section.name === 'FIRST-1') {
        // First year courses
        ['MA11004', 'PH11003', 'EE11003', 'CS10003', 'CS19003', 'PH19003', 'CE13003'].forEach(code => {
          courseSectionMap[code] = section.id
        })
      } else if (section.name === 'AE-2A') {
        // Second year courses
        courses.filter(c => c.code.startsWith('AE2')).forEach(course => {
          courseSectionMap[course.code] = section.id
        })
        courseSectionMap['MA20202'] = section.id
      } else if (section.name === 'AE-3A') {
        // Third year courses
        courses.filter(c => c.code.startsWith('AE3')).forEach(course => {
          courseSectionMap[course.code] = section.id
        })
      } else if (section.name === 'AE-4A') {
        // Fourth year courses
        courses.filter(c => c.code.startsWith('AE4')).forEach(course => {
          courseSectionMap[course.code] = section.id
        })
      } else if (section.name === 'AE-PG-1') {
        // PG courses
        courses.filter(c => c.code.startsWith('AE5') || c.code.startsWith('AE6')).forEach(course => {
          courseSectionMap[course.code] = section.id
        })
      }
    })
    
    // Create teacher mapping
    const teacherCodeMap: Record<string, string> = {}
    teachers.forEach(t => {
      teacherCodeMap[t.code] = t.id
    })
    
    // Course-teacher assignments based on timetable
    const courseTeacherMap: Record<string, string> = {
      'MA11004': 'SG',
      'PH11003': 'TD',
      'EE11003': 'DD',
      'CS10003': 'AC',
      'CS19003': 'SD',
      'PH19003': 'PRC',
      'CE13003': 'AC',
      'MA20202': 'NKG',
      'AE20202': 'SH',
      'AE21201': 'SMD',
      'AE21202': 'SG',
      'AE21203': 'MS',
      'AE21204': 'PJ',
      'AE21205': 'RJ',
      'AE29202': 'SMD',
      'AE29204': 'MRS',
      'AE31002': 'DKM',
      'AE31004': 'MS',
      'AE31007': 'SB',
      'AE31008': 'RJ',
      'AE31009': 'MM',
      'AE31010': 'SS',
      'AE31103': 'KPS',
      'AE39001': 'SS',
      'AE39002': 'NKP',
      'AE39003': 'AG',
      'AE39004': 'CSM',
      'AE39201': 'ADG',
      'AE40006': 'MRS',
      'AE40007': 'NKP',
      'AE40008': 'DKM',
      'AE40009': 'SK',
      'AE40018': 'SG',
      'AE40019': 'SH',
      'AE40023': 'SB',
      'AE40026': 'MS',
      'AE40030': 'CSM',
      'AE40031': 'AP',
      'AE40033': 'MRS',
      'AE40037': 'SMD',
      'AE49003': 'NKP',
      'AE49012': 'SS',
      'AE51005': 'AR',
      'AE51010': 'SCP',
      'AE51017': 'KPS',
      'AE60001': 'AR',
      'AE60003': 'PJ',
      'AE60005': 'ADG',
      'AE60006': 'SMD',
      'AE60007': 'NKP',
      'AE60028': 'AG',
      'AE60036': 'SCP',
      'AE60206': 'SB',
      'AE60208': 'SK',
      'AE61001': 'AP',
      'AE61003': 'MRS',
      'AE61004': 'CSM',
      'AE61019': 'MM',
      'AE61026': 'KPS',
      'AE61032': 'SG',
      'AE61038': 'DKM',
      'AE69006': 'RJ',
      'AE69208': 'SK'
    }
    
    // Create offerings
    const offerings = []
    const errors = []
    
    courses.forEach(course => {
      const sectionId = courseSectionMap[course.code]
      const teacherCode = courseTeacherMap[course.code]
      const teacherId = teacherCode ? teacherCodeMap[teacherCode] : null
      
      if (sectionId && teacherId) {
        offerings.push({
          course_id: course.id,
          section_id: sectionId,
          teacher_id: teacherId,
          expected_size: 60,
          needs: course.P > 0 ? ['Lab Equipment', 'PC'] : ['Projector', 'Whiteboard']
        })
      } else {
        errors.push({
          course: course.code,
          reason: !sectionId ? 'No section found' : 'No teacher found',
          teacherCode,
          sectionId
        })
      }
    })
    
    console.log(`Creating ${offerings.length} offerings...`)
    
    // Insert offerings in batches
    const batchSize = 50
    let created = 0
    
    for (let i = 0; i < offerings.length; i += batchSize) {
      const batch = offerings.slice(i, i + batchSize)
      const { data, error } = await supabase
        .from('offering')
        .insert(batch)
        .select()
      
      if (error) {
        console.error('Batch error:', error)
        errors.push({ batch: i, error: error.message })
      } else {
        created += data?.length || 0
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Created ${created} offerings out of ${offerings.length} attempted`,
      stats: {
        total_courses: courses.length,
        total_teachers: teachers.length,
        total_sections: sections.length,
        offerings_created: created,
        offerings_attempted: offerings.length
      },
      errors: errors.slice(0, 10), // First 10 errors
      sample_offerings: offerings.slice(0, 5)
    })
    
  } catch (error: any) {
    console.error('Create offerings error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}