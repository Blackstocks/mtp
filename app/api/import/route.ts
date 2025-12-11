import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { parse } from 'csv-parse/sync'
import { z } from 'zod'

// CSV validation schemas
const teacherCsvSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  designation: z.string().optional(),
  max_hours_per_day: z.string().transform(v => parseInt(v) || 6),
  max_hours_per_week: z.string().transform(v => parseInt(v) || 20),
  avoid_early_morning: z.string().transform(v => v.toLowerCase() === 'true')
})

const courseCsvSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  L: z.string().transform(v => parseInt(v) || 0),
  T: z.string().transform(v => parseInt(v) || 0),
  P: z.string().transform(v => parseInt(v) || 0),
  credits: z.string().transform(v => parseFloat(v) || 0)
})

const roomCsvSchema = z.object({
  code: z.string().min(1),
  capacity: z.string().transform(v => parseInt(v)),
  kind: z.string().transform(v => {
    const normalized = v.toLowerCase()
    if (normalized === 'classroom' || normalized === 'class') return 'classroom'
    if (normalized === 'lab' || normalized === 'laboratory') return 'lab'
    if (normalized === 'tutorial') return 'tutorial'
    throw new Error(`Invalid room kind: ${v}`)
  }),
  tags: z.string().transform(v => v ? v.split(';').filter(Boolean) : [])
})

const sectionCsvSchema = z.object({
  name: z.string().min(1),
  program: z.string().min(1),
  year: z.string().transform(v => parseInt(v)),
  student_count: z.string().transform(v => parseInt(v) || 60)
})

const offeringCsvSchema = z.object({
  course_code: z.string().min(1),
  section_name: z.string().min(1),
  teacher_email: z.string().email(),
  needs: z.string().transform(v => v ? v.split(';').filter(Boolean) : [])
})

const slotCsvSchema = z.object({
  day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI']),
  start_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  is_lab: z.string().transform(v => v.toLowerCase() === 'true')
})

export async function POST(request: NextRequest) {
  const results: Record<string, number> = {}
  const errors: string[] = []
  
  try {
    const formData = await request.formData()
    
    // Process teachers
    const teachersFile = formData.get('teachers') as File
    if (teachersFile) {
      try {
        const content = await teachersFile.text()
        const records = parse(content, { columns: true, skip_empty_lines: true })
        
        const teachers = []
        for (let i = 0; i < records.length; i++) {
          try {
            const validated = teacherCsvSchema.parse(records[i])
            teachers.push(validated)
          } catch (e: any) {
            errors.push(`Teachers row ${i + 2}: ${e.message}`)
          }
        }
        
        if (teachers.length > 0) {
          // Delete existing teachers
          await supabase.from('teacher').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          
          // Insert new teachers
          const { data, error } = await supabase.from('teacher').insert(teachers).select()
          if (error) throw new Error(`Teachers import failed: ${error.message}`)
          results.teachers = data?.length || 0
        }
      } catch (e: any) {
        errors.push(`Teachers file: ${e.message}`)
      }
    }
    
    // Process courses
    const coursesFile = formData.get('courses') as File
    if (coursesFile) {
      try {
        const content = await coursesFile.text()
        const records = parse(content, { columns: true, skip_empty_lines: true })
        
        const courses = []
        for (let i = 0; i < records.length; i++) {
          try {
            const validated = courseCsvSchema.parse(records[i])
            courses.push(validated)
          } catch (e: any) {
            errors.push(`Courses row ${i + 2}: ${e.message}`)
          }
        }
        
        if (courses.length > 0) {
          await supabase.from('course').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          const { data, error } = await supabase.from('course').insert(courses).select()
          if (error) throw new Error(`Courses import failed: ${error.message}`)
          results.courses = data?.length || 0
        }
      } catch (e: any) {
        errors.push(`Courses file: ${e.message}`)
      }
    }
    
    // Process rooms
    const roomsFile = formData.get('rooms') as File
    if (roomsFile) {
      try {
        const content = await roomsFile.text()
        const records = parse(content, { columns: true, skip_empty_lines: true })
        
        const rooms = []
        for (let i = 0; i < records.length; i++) {
          try {
            const validated = roomCsvSchema.parse(records[i])
            rooms.push(validated)
          } catch (e: any) {
            errors.push(`Rooms row ${i + 2}: ${e.message}`)
          }
        }
        
        if (rooms.length > 0) {
          await supabase.from('room').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          const { data, error } = await supabase.from('room').insert(rooms).select()
          if (error) throw new Error(`Rooms import failed: ${error.message}`)
          results.rooms = data?.length || 0
        }
      } catch (e: any) {
        errors.push(`Rooms file: ${e.message}`)
      }
    }
    
    // Process sections
    const sectionsFile = formData.get('sections') as File
    if (sectionsFile) {
      try {
        const content = await sectionsFile.text()
        const records = parse(content, { columns: true, skip_empty_lines: true })
        
        const sections = []
        for (let i = 0; i < records.length; i++) {
          try {
            const validated = sectionCsvSchema.parse(records[i])
            sections.push(validated)
          } catch (e: any) {
            errors.push(`Sections row ${i + 2}: ${e.message}`)
          }
        }
        
        if (sections.length > 0) {
          await supabase.from('section').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          const { data, error } = await supabase.from('section').insert(sections).select()
          if (error) throw new Error(`Sections import failed: ${error.message}`)
          results.sections = data?.length || 0
        }
      } catch (e: any) {
        errors.push(`Sections file: ${e.message}`)
      }
    }
    
    // Process slots
    const slotsFile = formData.get('slots') as File
    if (slotsFile) {
      try {
        const content = await slotsFile.text()
        const records = parse(content, { columns: true, skip_empty_lines: true })
        
        const slots = []
        for (let i = 0; i < records.length; i++) {
          try {
            const validated = slotCsvSchema.parse(records[i])
            slots.push(validated)
          } catch (e: any) {
            errors.push(`Slots row ${i + 2}: ${e.message}`)
          }
        }
        
        if (slots.length > 0) {
          await supabase.from('slot').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          const { data, error } = await supabase.from('slot').insert(slots).select()
          if (error) throw new Error(`Slots import failed: ${error.message}`)
          results.slots = data?.length || 0
        }
      } catch (e: any) {
        errors.push(`Slots file: ${e.message}`)
      }
    }
    
    // Process offerings (requires lookups)
    const offeringsFile = formData.get('offerings') as File
    if (offeringsFile) {
      try {
        const content = await offeringsFile.text()
        const records = parse(content, { columns: true, skip_empty_lines: true })
        
        // Fetch lookup data
        const [teachersRes, coursesRes, sectionsRes] = await Promise.all([
          supabase.from('teacher').select('id, email'),
          supabase.from('course').select('id, code'),
          supabase.from('section').select('id, name')
        ])
        
        if (teachersRes.error) throw new Error(`Failed to fetch teachers: ${teachersRes.error.message}`)
        if (coursesRes.error) throw new Error(`Failed to fetch courses: ${coursesRes.error.message}`)
        if (sectionsRes.error) throw new Error(`Failed to fetch sections: ${sectionsRes.error.message}`)
        
        const teacherMap = new Map(teachersRes.data?.map(t => [t.email, t.id]) || [])
        const courseMap = new Map(coursesRes.data?.map(c => [c.code, c.id]) || [])
        const sectionMap = new Map(sectionsRes.data?.map(s => [s.name, s.id]) || [])
        
        const offerings = []
        for (let i = 0; i < records.length; i++) {
          try {
            const validated = offeringCsvSchema.parse(records[i])
            
            const teacher_id = teacherMap.get(validated.teacher_email)
            const course_id = courseMap.get(validated.course_code)
            const section_id = sectionMap.get(validated.section_name)
            
            if (!teacher_id) {
              errors.push(`Offerings row ${i + 2}: Teacher with email "${validated.teacher_email}" not found`)
              continue
            }
            if (!course_id) {
              errors.push(`Offerings row ${i + 2}: Course with code "${validated.course_code}" not found`)
              continue
            }
            if (!section_id) {
              errors.push(`Offerings row ${i + 2}: Section with name "${validated.section_name}" not found`)
              continue
            }
            
            offerings.push({
              course_id,
              section_id,
              teacher_id,
              needs: validated.needs
            })
          } catch (e: any) {
            errors.push(`Offerings row ${i + 2}: ${e.message}`)
          }
        }
        
        if (offerings.length > 0) {
          await supabase.from('offering').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          const { data, error } = await supabase.from('offering').insert(offerings).select()
          if (error) throw new Error(`Offerings import failed: ${error.message}`)
          results.offerings = data?.length || 0
        }
      } catch (e: any) {
        errors.push(`Offerings file: ${e.message}`)
      }
    }
    
    // Return results
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        results,
        errors,
        error: `Import completed with ${errors.length} errors`
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      results
    })
    
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      errors: [...errors, error.message]
    }, { status: 500 })
  }
}