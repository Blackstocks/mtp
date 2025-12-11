import { z } from 'zod'

export const teacherSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  max_per_day: z.number().int().positive().default(3),
  max_per_week: z.number().int().positive().default(12),
  prefs: z.record(z.any()).default({})
})

export const roomSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  capacity: z.number().int().positive(),
  kind: z.enum(['CLASS', 'LAB', 'DRAWING']),
  tags: z.array(z.string()).default([])
})

export const courseSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  L: z.number().int().min(0).default(3),
  T: z.number().int().min(0).default(0),
  P: z.number().int().min(0).default(0)
})

export const sectionSchema = z.object({
  id: z.string().uuid(),
  program: z.string().min(1),
  year: z.number().int().min(1).max(4),
  name: z.string().min(1)
})

export const offeringSchema = z.object({
  id: z.string().uuid(),
  course_id: z.string().uuid(),
  section_id: z.string().uuid(),
  teacher_id: z.string().uuid().nullable(),
  expected_size: z.number().int().positive(),
  needs: z.array(z.string()).default([])
})

export const slotSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  occ: z.number().int().positive(),
  day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI']),
  start_time: z.string(), // Accept any time format from DB
  end_time: z.string(),   // Accept any time format from DB
  cluster: z.string().nullable().default(null),
  is_lab: z.boolean().default(false)
})

export const availabilitySchema = z.object({
  teacher_id: z.string().uuid(),
  slot_id: z.string().uuid(),
  can_teach: z.boolean()
})

export const assignmentSchema = z.object({
  offering_id: z.string().uuid(),
  slot_id: z.string().uuid(),
  room_id: z.string().uuid().nullable(),
  kind: z.enum(['L', 'T', 'P']),
  is_locked: z.boolean().default(false)
})

// CSV import schemas - Updated for better import functionality
export const teacherCsvSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  designation: z.string().optional(),
  max_hours_per_day: z.string().transform(v => parseInt(v) || 6),
  max_hours_per_week: z.string().transform(v => parseInt(v) || 20),
  avoid_early_morning: z.string().transform(v => v.toLowerCase() === 'true')
})

export const roomCsvSchema = z.object({
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

export const courseCsvSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  L: z.string().transform(v => parseInt(v) || 0),
  T: z.string().transform(v => parseInt(v) || 0),
  P: z.string().transform(v => parseInt(v) || 0),
  credits: z.string().transform(v => parseFloat(v) || 0).optional()
})

export const sectionCsvSchema = z.object({
  name: z.string().min(1),
  program: z.string().min(1),
  year: z.string().transform(v => parseInt(v)),
  student_count: z.string().transform(v => parseInt(v) || 60)
})

export const offeringCsvSchema = z.object({
  course_code: z.string().min(1),
  section_name: z.string().min(1),
  teacher_email: z.string().email(),
  needs: z.string().transform(v => v ? v.split(';').filter(Boolean) : [])
})

export const slotCsvSchema = z.object({
  day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI']),
  start_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  is_lab: z.string().transform(v => v.toLowerCase() === 'true')
})

// Solver schemas
export const solverInputSchema = z.object({
  teachers: z.array(teacherSchema),
  rooms: z.array(roomSchema),
  slots: z.array(slotSchema),
  offerings: z.array(offeringSchema.extend({
    course: courseSchema,
    section: sectionSchema,
    teacher: teacherSchema.nullable()
  })),
  availability: z.array(availabilitySchema),
  locked_assignments: z.array(assignmentSchema).default([])
})

export const solverOutputSchema = z.object({
  success: z.boolean(),
  assignments: z.array(assignmentSchema),
  stats: z.object({
    total_offerings: z.number(),
    total_slots_required: z.number(),
    successful_assignments: z.number(),
    failed_assignments: z.number(),
    utilization: z.number()
  }),
  warnings: z.array(z.object({
    offering_id: z.string(),
    kind: z.string(),
    reason: z.string()
  })).default([])
})

export const recommendationSchema = z.object({
  slot_id: z.string(),
  room_id: z.string(),
  penalty_delta: z.number(),
  reasons: z.array(z.string()),
  swaps: z.array(z.object({
    from_offering_id: z.string(),
    to_slot_id: z.string()
  })).optional()
})