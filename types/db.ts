export interface Teacher {
  id: string
  code: string
  name: string
  max_per_day: number
  max_per_week: number
  prefs: {
    avoid_8am?: boolean
    prefer_days?: string[]
    avoid_late?: boolean
    [key: string]: any
  }
}

export interface Room {
  id: string
  code: string
  capacity: number
  kind: 'CLASS' | 'LAB' | 'DRAWING'
  tags: string[]
}

export interface Course {
  id: string
  code: string
  name: string
  L: number
  T: number
  P: number
}

export interface Section {
  id: string
  program: string
  year: number
  name: string
}

export interface Offering {
  id: string
  course_id: string
  section_id: string
  teacher_id: string | null
  expected_size: number
  needs: string[]
}

export interface Slot {
  id: string
  code: string
  occ: number
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI'
  start_time: string
  end_time: string
  cluster: string | null
  is_lab: boolean
}

export interface Availability {
  teacher_id: string
  slot_id: string
  can_teach: boolean
}

export interface Assignment {
  offering_id: string
  slot_id: string
  room_id: string | null
  kind: 'L' | 'T' | 'P'
  is_locked: boolean
}

// Extended types with relations
export interface OfferingWithRelations extends Offering {
  course?: Course
  section?: Section
  teacher?: Teacher
}

export interface AssignmentWithRelations extends Assignment {
  offering?: OfferingWithRelations
  slot?: Slot
  room?: Room
}

export interface SlotWithAssignments extends Slot {
  assignments?: AssignmentWithRelations[]
}