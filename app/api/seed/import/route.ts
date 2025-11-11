import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { 
  teacherCsvSchema, roomCsvSchema, courseCsvSchema, 
  sectionCsvSchema, offeringCsvSchema, slotCsvSchema 
} from '@/lib/schemas'
import { parse } from 'csv-parse/sync'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const results: any = {}
    
    // Process teachers
    const teachersFile = formData.get('teachers') as File
    if (teachersFile) {
      const content = await teachersFile.text()
      const records = parse(content, { columns: true, skip_empty_lines: true })
      const teachers = records.map((r: any) => teacherCsvSchema.parse(r))
      
      // Clear existing and insert
      await supabase.from('teacher').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      const { data, error } = await supabase.from('teacher').insert(teachers).select()
      if (error) throw error
      results.teachers = data.length
    }
    
    // Process rooms
    const roomsFile = formData.get('rooms') as File
    if (roomsFile) {
      const content = await roomsFile.text()
      const records = parse(content, { columns: true, skip_empty_lines: true })
      const rooms = records.map((r: any) => roomCsvSchema.parse(r))
      
      await supabase.from('room').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      const { data, error } = await supabase.from('room').insert(rooms).select()
      if (error) throw error
      results.rooms = data.length
    }
    
    // Process courses
    const coursesFile = formData.get('courses') as File
    if (coursesFile) {
      const content = await coursesFile.text()
      const records = parse(content, { columns: true, skip_empty_lines: true })
      const courses = records.map((r: any) => courseCsvSchema.parse(r))
      
      await supabase.from('course').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      const { data, error } = await supabase.from('course').insert(courses).select()
      if (error) throw error
      results.courses = data.length
    }
    
    // Process sections
    const sectionsFile = formData.get('sections') as File
    if (sectionsFile) {
      const content = await sectionsFile.text()
      const records = parse(content, { columns: true, skip_empty_lines: true })
      const sections = records.map((r: any) => sectionCsvSchema.parse(r))
      
      await supabase.from('section').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      const { data, error } = await supabase.from('section').insert(sections).select()
      if (error) throw error
      results.sections = data.length
    }
    
    // Process slots
    const slotsFile = formData.get('slots') as File
    if (slotsFile) {
      const content = await slotsFile.text()
      const records = parse(content, { columns: true, skip_empty_lines: true })
      const slots = records.map((r: any) => slotCsvSchema.parse(r))
      
      await supabase.from('slot').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      const { data, error } = await supabase.from('slot').insert(slots).select()
      if (error) throw error
      results.slots = data.length
    }
    
    // Process offerings (needs lookups)
    const offeringsFile = formData.get('offerings') as File
    if (offeringsFile) {
      const content = await offeringsFile.text()
      const records = parse(content, { columns: true, skip_empty_lines: true })
      const offeringsCsv = records.map((r: any) => offeringCsvSchema.parse(r))
      
      // Fetch lookup data
      const { data: teachers } = await supabase.from('teacher').select('id, code')
      const { data: courses } = await supabase.from('course').select('id, code')
      const { data: sections } = await supabase.from('section').select('id, name')
      
      const teacherMap = new Map(teachers?.map(t => [t.code, t.id]))
      const courseMap = new Map(courses?.map(c => [c.code, c.id]))
      const sectionMap = new Map(sections?.map(s => [s.name, s.id]))
      
      const offerings = offeringsCsv.map(o => ({
        course_id: courseMap.get(o.course_code),
        section_id: sectionMap.get(o.section_name),
        teacher_id: teacherMap.get(o.teacher_code),
        expected_size: o.expected_size,
        needs: o.needs
      })).filter(o => o.course_id && o.section_id)
      
      await supabase.from('offering').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      const { data, error } = await supabase.from('offering').insert(offerings).select()
      if (error) throw error
      results.offerings = data.length
    }
    
    return NextResponse.json({ success: true, results })
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 400 })
  }
}