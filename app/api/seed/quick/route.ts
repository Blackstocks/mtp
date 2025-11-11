import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { parse } from 'csv-parse/sync'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function POST() {
  try {
    // Read and parse CSV files
    const seedDir = join(process.cwd(), 'seed')
    
    const teachers = parse(await readFile(join(seedDir, 'teachers.csv'), 'utf-8'), { 
      columns: true, 
      skip_empty_lines: true 
    })
    
    const rooms = parse(await readFile(join(seedDir, 'rooms.csv'), 'utf-8'), { 
      columns: true, 
      skip_empty_lines: true 
    })
    
    const courses = parse(await readFile(join(seedDir, 'courses.csv'), 'utf-8'), { 
      columns: true, 
      skip_empty_lines: true 
    })
    
    const sections = parse(await readFile(join(seedDir, 'sections.csv'), 'utf-8'), { 
      columns: true, 
      skip_empty_lines: true 
    })
    
    const slots = parse(await readFile(join(seedDir, 'slot_matrix.csv'), 'utf-8'), { 
      columns: true, 
      skip_empty_lines: true 
    })
    
    // Process and insert data
    const results: any = {}
    
    // Teachers
    await supabase.from('teacher').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const teachersData = teachers.map((t: any) => ({
      code: t.code,
      name: t.name,
      max_per_day: parseInt(t.max_per_day),
      max_per_week: parseInt(t.max_per_week),
      prefs: JSON.parse(t.prefs || '{}')
    }))
    const { data: teacherResult } = await supabase.from('teacher').insert(teachersData).select()
    results.teachers = teacherResult?.length || 0
    
    // Rooms
    await supabase.from('room').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const roomsData = rooms.map((r: any) => ({
      code: r.code,
      capacity: parseInt(r.capacity),
      kind: r.kind,
      tags: r.tags ? r.tags.split(';').filter(Boolean) : []
    }))
    const { data: roomResult } = await supabase.from('room').insert(roomsData).select()
    results.rooms = roomResult?.length || 0
    
    // Courses
    await supabase.from('course').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const coursesData = courses.map((c: any) => ({
      code: c.code,
      name: c.name,
      L: parseInt(c.L),
      T: parseInt(c.T),
      P: parseInt(c.P)
    }))
    const { data: courseResult } = await supabase.from('course').insert(coursesData).select()
    results.courses = courseResult?.length || 0
    
    // Sections
    await supabase.from('section').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const sectionsData = sections.map((s: any) => ({
      program: s.program,
      year: parseInt(s.year),
      name: s.name
    }))
    const { data: sectionResult } = await supabase.from('section').insert(sectionsData).select()
    results.sections = sectionResult?.length || 0
    
    // Slots
    await supabase.from('slot').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const slotsData = slots.map((s: any) => ({
      code: s.code,
      occ: parseInt(s.occ),
      day: s.day,
      start_time: s.start_time,
      end_time: s.end_time,
      cluster: s.cluster || null,
      is_lab: s.is_lab.toLowerCase() === 'true'
    }))
    const { data: slotResult } = await supabase.from('slot').insert(slotsData).select()
    results.slots = slotResult?.length || 0
    
    // Process offerings with lookups
    const offeringsRaw = parse(await readFile(join(seedDir, 'offerings.csv'), 'utf-8'), { 
      columns: true, 
      skip_empty_lines: true 
    })
    
    const teacherMap = new Map(teacherResult?.map(t => [t.code, t.id]))
    const courseMap = new Map(courseResult?.map(c => [c.code, c.id]))
    const sectionMap = new Map(sectionResult?.map(s => [s.name, s.id]))
    
    await supabase.from('offering').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const offeringsData = offeringsRaw.map((o: any) => ({
      course_id: courseMap.get(o.course_code),
      section_id: sectionMap.get(o.section_name),
      teacher_id: teacherMap.get(o.teacher_code),
      expected_size: parseInt(o.expected_size),
      needs: o.needs ? o.needs.split(';').filter(Boolean) : []
    })).filter(o => o.course_id && o.section_id)
    
    const { data: offeringResult } = await supabase.from('offering').insert(offeringsData).select()
    results.offerings = offeringResult?.length || 0
    
    return NextResponse.json({ 
      success: true, 
      message: 'Quick seed completed',
      results 
    })
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}