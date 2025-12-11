import { supabase } from './db'
import { AssignmentWithRelations } from '@/types/db'

export const assignmentsFixed = {
  async list(): Promise<AssignmentWithRelations[]> {
    // First get assignments
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('assignment')
      .select('*')
    
    if (assignmentsError) throw assignmentsError
    if (!assignmentsData || assignmentsData.length === 0) return []
    
    // Get unique IDs
    const offeringIds = [...new Set(assignmentsData.map(a => a.offering_id))]
    const slotIds = [...new Set(assignmentsData.map(a => a.slot_id))]
    const roomIds = [...new Set(assignmentsData.filter(a => a.room_id).map(a => a.room_id))]
    
    // Fetch related data
    const [offeringsRes, slotsRes, roomsRes] = await Promise.all([
      supabase.from('offering').select('*').in('id', offeringIds),
      supabase.from('slot').select('*').in('id', slotIds),
      roomIds.length > 0 
        ? supabase.from('room').select('*').in('id', roomIds)
        : Promise.resolve({ data: [] })
    ])
    
    // For offerings, we need to fetch their related data too
    const offerings = offeringsRes.data || []
    if (offerings.length > 0) {
      const courseIds = [...new Set(offerings.map(o => o.course_id))]
      const sectionIds = [...new Set(offerings.map(o => o.section_id))]
      const teacherIds = [...new Set(offerings.filter(o => o.teacher_id).map(o => o.teacher_id))]
      
      const [coursesRes, sectionsRes, teachersRes] = await Promise.all([
        supabase.from('course').select('*').in('id', courseIds),
        supabase.from('section').select('*').in('id', sectionIds),
        teacherIds.length > 0
          ? supabase.from('teacher').select('*').in('id', teacherIds)
          : Promise.resolve({ data: [] })
      ])
      
      // Create lookup maps for offerings
      const courseMap = new Map(coursesRes.data?.map(c => [c.id, c]) || [])
      const sectionMap = new Map(sectionsRes.data?.map(s => [s.id, s]) || [])
      const teacherMap = new Map(teachersRes.data?.map(t => [t.id, t]) || [])
      
      // Enrich offerings
      offerings.forEach(offering => {
        (offering as any).course = courseMap.get(offering.course_id) || null;
        (offering as any).section = sectionMap.get(offering.section_id) || null;
        (offering as any).teacher = offering.teacher_id ? teacherMap.get(offering.teacher_id) || null : null;
      })
    }
    
    // Create lookup maps
    const offeringMap = new Map(offerings.map(o => [o.id, o]))
    const slotMap = new Map(slotsRes.data?.map(s => [s.id, s]) || [])
    const roomMap = new Map(roomsRes.data?.map(r => [r.id, r]) || [])
    
    // Combine everything
    const enrichedAssignments = assignmentsData.map(assignment => ({
      ...assignment,
      offering: offeringMap.get(assignment.offering_id) || null,
      slot: slotMap.get(assignment.slot_id) || null,
      room: assignment.room_id ? roomMap.get(assignment.room_id) || null : null
    }))
    
    return enrichedAssignments as AssignmentWithRelations[]
  },
  
  async deleteUnlocked() {
    const { error } = await supabase
      .from('assignment')
      .delete()
      .eq('is_locked', false)
    if (error) throw error
  },
  
  async updateLock(offeringId: string, kind: string, slotId: string, isLocked: boolean) {
    const { error } = await supabase
      .from('assignment')
      .update({ is_locked: isLocked })
      .eq('offering_id', offeringId)
      .eq('kind', kind)
      .eq('slot_id', slotId)
    if (error) throw error
  },
  
  async bulkUpsert(assignments: any[]) {
    // Clean assignments to only include database fields
    const cleanedAssignments = assignments.map(a => ({
      offering_id: a.offering_id,
      slot_id: a.slot_id,
      room_id: a.room_id || null,
      kind: a.kind,
      is_locked: a.is_locked || false
    }))
    
    // Check for duplicates based on primary key
    const seen = new Set<string>()
    const uniqueAssignments = cleanedAssignments.filter(a => {
      const key = `${a.offering_id}-${a.kind}-${a.slot_id}`
      if (seen.has(key)) {
        console.warn('Duplicate assignment detected:', key)
        return false
      }
      seen.add(key)
      return true
    })
    
    const { error } = await supabase
      .from('assignment')
      .upsert(uniqueAssignments)
    if (error) throw error
  },
  
  async create(assignment: {
    offering_id: string
    slot_id: string
    room_id: string | null
    kind: string
    is_locked?: boolean
  }) {
    const { data, error } = await supabase
      .from('assignment')
      .insert([assignment])
      .select()
      .single()
    if (error) throw error
    return data
  },
  
  async delete(offeringId: string, kind: string, slotId: string) {
    const { error } = await supabase
      .from('assignment')
      .delete()
      .eq('offering_id', offeringId)
      .eq('kind', kind)
      .eq('slot_id', slotId)
    if (error) throw error
  }
}