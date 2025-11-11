import { createClient } from '@supabase/supabase-js'
import type { 
  Teacher, Room, Course, Section, Offering, Slot, Availability, Assignment,
  OfferingWithRelations, AssignmentWithRelations, SlotWithAssignments 
} from '@/types/db'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Teacher queries
export const teachers = {
  async list() {
    const { data, error } = await supabase
      .from('teacher')
      .select('*')
      .order('name')
    if (error) throw error
    return data as Teacher[]
  },
  
  async get(id: string) {
    const { data, error } = await supabase
      .from('teacher')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Teacher
  },
  
  async create(teacher: Omit<Teacher, 'id'>) {
    const { data, error } = await supabase
      .from('teacher')
      .insert(teacher)
      .select()
      .single()
    if (error) throw error
    
    // If teacher has available slots in preferences, populate availability table
    if (data && teacher.prefs.available_slots?.length > 0) {
      const { data: slots } = await supabase
        .from('slot')
        .select('id, start_time, end_time')
      
      if (slots) {
        const availabilities = slots
          .filter(slot => {
            const timeSlot = `${slot.start_time}-${slot.end_time}`
            return teacher.prefs.available_slots?.includes(timeSlot)
          })
          .map(slot => ({
            teacher_id: data.id,
            slot_id: slot.id,
            can_teach: true
          }))
        
        if (availabilities.length > 0) {
          await supabase.from('availability').insert(availabilities)
        }
      }
    }
    
    return data as Teacher
  },
  
  async update(id: string, updates: Partial<Teacher>) {
    const { data, error } = await supabase
      .from('teacher')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    
    // Update availability if available_slots is provided
    if (data && updates.prefs?.available_slots !== undefined) {
      // Clear existing availability
      await supabase
        .from('availability')
        .delete()
        .eq('teacher_id', id)
      
      // Add new availability based on time slots
      if (updates.prefs.available_slots.length > 0) {
        const { data: slots } = await supabase
          .from('slot')
          .select('id, start_time, end_time')
        
        if (slots) {
          const availabilities = slots
            .filter(slot => {
              const timeSlot = `${slot.start_time}-${slot.end_time}`
              return updates.prefs.available_slots?.includes(timeSlot)
            })
            .map(slot => ({
              teacher_id: id,
              slot_id: slot.id,
              can_teach: true
            }))
          
          if (availabilities.length > 0) {
            await supabase.from('availability').insert(availabilities)
          }
        }
      }
    }
    
    return data as Teacher
  },
  
  async delete(id: string) {
    const { error } = await supabase
      .from('teacher')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

// Room queries
export const rooms = {
  async list() {
    const { data, error } = await supabase
      .from('room')
      .select('*')
      .order('code')
    if (error) throw error
    return data as Room[]
  },
  
  async getByType(kind: Room['kind']) {
    const { data, error } = await supabase
      .from('room')
      .select('*')
      .eq('kind', kind)
      .order('code')
    if (error) throw error
    return data as Room[]
  }
}

// Offering queries with relations
export const offerings = {
  async list() {
    const { data, error } = await supabase
      .from('offering')
      .select(`
        *,
        course(id, code, name, L, T, P),
        section(id, program, year, name),
        teacher(id, code, name)
      `)
      .order('section_id')
    if (error) throw error
    return data as OfferingWithRelations[]
  },
  
  async byTeacher(teacherId: string) {
    const { data, error } = await supabase
      .from('offering')
      .select(`
        *,
        course(id, code, name, L, T, P),
        section(id, program, year, name)
      `)
      .eq('teacher_id', teacherId)
    if (error) throw error
    return data as OfferingWithRelations[]
  },
  
  async bySection(sectionId: string) {
    const { data, error } = await supabase
      .from('offering')
      .select(`
        *,
        course(id, code, name, L, T, P),
        teacher(id, code, name)
      `)
      .eq('section_id', sectionId)
    if (error) throw error
    return data as OfferingWithRelations[]
  }
}

// Slot queries
export const slots = {
  async list() {
    const { data, error } = await supabase
      .from('slot')
      .select('*')
      .order('day, start_time')
    if (error) throw error
    return data as Slot[]
  },
  
  async byDay(day: Slot['day']) {
    const { data, error } = await supabase
      .from('slot')
      .select('*')
      .eq('day', day)
      .order('start_time')
    if (error) throw error
    return data as Slot[]
  },
  
  async getClusters() {
    const { data, error } = await supabase
      .from('slot')
      .select('cluster, id, code, occ, day, start_time, end_time')
      .not('cluster', 'is', null)
      .order('cluster, start_time')
    if (error) throw error
    
    // Group by cluster
    const clusters = data.reduce((acc, slot) => {
      if (!slot.cluster) return acc
      if (!acc[slot.cluster]) acc[slot.cluster] = []
      acc[slot.cluster].push(slot as Slot)
      return acc
    }, {} as Record<string, Slot[]>)
    
    return clusters
  }
}

// Availability queries
export const availability = {
  async getForTeacher(teacherId: string) {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('can_teach', true)
    if (error) throw error
    return data as Availability[]
  },
  
  async setForTeacher(teacherId: string, availabilities: Omit<Availability, 'teacher_id'>[]) {
    // Delete existing
    await supabase
      .from('availability')
      .delete()
      .eq('teacher_id', teacherId)
    
    // Insert new
    if (availabilities.length > 0) {
      const { error } = await supabase
        .from('availability')
        .insert(availabilities.map(a => ({ ...a, teacher_id: teacherId })))
      if (error) throw error
    }
  }
}

// Assignment queries
export const assignments = {
  async list() {
    const { data, error } = await supabase
      .from('assignment')
      .select(`
        *,
        offering(
          *,
          course(id, code, name),
          section(id, program, year, name),
          teacher(id, code, name)
        ),
        slot(*),
        room(*)
      `)
    if (error) throw error
    return data as AssignmentWithRelations[]
  },
  
  async create(assignment: Assignment) {
    const { data, error } = await supabase
      .from('assignment')
      .insert(assignment)
      .select()
      .single()
    if (error) throw error
    return data as Assignment
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
  
  async deleteUnlocked() {
    const { error } = await supabase
      .from('assignment')
      .delete()
      .eq('is_locked', false)
    if (error) throw error
  },
  
  async bulkUpsert(assignments: Assignment[]) {
    const { error } = await supabase
      .from('assignment')
      .upsert(assignments)
    if (error) throw error
  }
}