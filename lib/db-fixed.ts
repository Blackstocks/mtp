import { supabase } from './db'
import { OfferingWithRelations } from '@/types/db'

// Alternative offering queries that work around foreign key issues
export const offeringsFixed = {
  async list() {
    // First get offerings
    const { data: offeringsData, error: offeringsError } = await supabase
      .from('offering')
      .select('*')
      .order('section_id')
    
    if (offeringsError) throw offeringsError
    if (!offeringsData) return []
    
    // Get unique IDs
    const courseIds = [...new Set(offeringsData.map(o => o.course_id))]
    const sectionIds = [...new Set(offeringsData.map(o => o.section_id))]
    const teacherIds = [...new Set(offeringsData.filter(o => o.teacher_id).map(o => o.teacher_id))]
    
    // Batch fetch related data
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
    const enrichedOfferings = offeringsData.map(offering => ({
      ...offering,
      course: courseMap.get(offering.course_id) || null,
      section: sectionMap.get(offering.section_id) || null,
      teacher: offering.teacher_id ? teacherMap.get(offering.teacher_id) || null : null
    }))
    
    return enrichedOfferings as OfferingWithRelations[]
  }
}