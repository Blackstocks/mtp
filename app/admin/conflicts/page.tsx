'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, XCircle, Clock, Users, Calendar, MapPin } from 'lucide-react'
import { supabase } from '@/lib/db'
import { toast } from '@/components/ui/use-toast'

interface ConflictDetail {
  offering_id: string
  course_code: string
  course_name: string
  section: string
  teacher_name: string | null
  kind: 'L' | 'T' | 'P'
  hours_required: number
  reason: string
  suggestions: string[]
}

interface ConflictSummary {
  total_offerings: number
  scheduled_successfully: number
  failed_to_schedule: number
  conflicts_by_reason: Record<string, number>
  conflicts: ConflictDetail[]
}

export default function ConflictsPage() {
  const [loading, setLoading] = useState(true)
  const [conflictSummary, setConflictSummary] = useState<ConflictSummary | null>(null)
  const [selectedConflict, setSelectedConflict] = useState<ConflictDetail | null>(null)

  useEffect(() => {
    analyzeConflicts()
  }, [])

  const analyzeConflicts = async () => {
    try {
      setLoading(true)

      // Get all offerings with their details using the same approach as assignmentsFixed
      const { data: offeringsData, error: offeringsError } = await supabase
        .from('offering')
        .select('*')

      if (offeringsError) throw offeringsError

      // Get related data for offerings
      let offerings = offeringsData || []
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

        // Create lookup maps
        const courseMap = new Map(coursesRes.data?.map(c => [c.id, c]) || [])
        const sectionMap = new Map(sectionsRes.data?.map(s => [s.id, s]) || [])
        const teacherMap = new Map(teachersRes.data?.map(t => [t.id, t]) || [])

        // Enrich offerings
        offerings = offerings.map(offering => ({
          ...offering,
          course: courseMap.get(offering.course_id) || null,
          section: sectionMap.get(offering.section_id) || null,
          teacher: offering.teacher_id ? teacherMap.get(offering.teacher_id) || null : null
        }))
      }

      // Get all assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignment')
        .select('*')

      if (assignmentsError) throw assignmentsError

      // Get slots and rooms for capacity analysis
      const { data: slots, error: slotsError } = await supabase
        .from('slot')
        .select('*')
        .order('day, start_time')

      if (slotsError) throw slotsError

      const { data: rooms, error: roomsError } = await supabase
        .from('room')
        .select('*')

      if (roomsError) throw roomsError

      // Analyze conflicts
      const conflicts: ConflictDetail[] = []
      const assignedOfferingIds = new Set<string>()
      const conflictsByReason: Record<string, number> = {}

      // Group assignments by offering
      const assignmentsByOffering = new Map<string, any[]>()
      assignments?.forEach(assignment => {
        if (!assignmentsByOffering.has(assignment.offering_id)) {
          assignmentsByOffering.set(assignment.offering_id, [])
        }
        assignmentsByOffering.get(assignment.offering_id)!.push(assignment)
      })

      // Check each offering
      offerings?.forEach((offering: any) => {
        const offeringAssignments = assignmentsByOffering.get(offering.id) || []
        const course = offering.course

        if (!course) return // Skip if course data is missing

        // Check if all required slots are assigned
        const requiredSlots = {
          L: course.L || 0,
          T: course.T || 0,
          P: course.P > 0 ? 1 : 0 // Labs are typically 3-hour blocks
        }

        const assignedSlots = {
          L: offeringAssignments.filter((a: any) => a.kind === 'L').length,
          T: offeringAssignments.filter((a: any) => a.kind === 'T').length,
          P: offeringAssignments.filter((a: any) => a.kind === 'P').length
        }

        // Check for each type (L, T, P)
        ;(['L', 'T', 'P'] as const).forEach(kind => {
          const required = requiredSlots[kind]
          const assigned = assignedSlots[kind]

          if (required > assigned) {
            let reason = 'Unknown conflict'
            let suggestions: string[] = []

            // Determine specific reason
            if (!offering.teacher_id) {
              reason = 'No teacher assigned'
              suggestions = [
                'Assign a teacher to this offering',
                'Check if qualified teachers are available'
              ]
            } else if (kind === 'P' && required > 0) {
              const labRooms = rooms?.filter(r => r.kind === 'LAB').length || 0
              if (labRooms === 0) {
                reason = 'No lab rooms available'
                suggestions = [
                  'Add lab rooms to the system',
                  'Check if existing rooms can be converted to labs'
                ]
              } else {
                const labSlots = slots?.filter(s => s.is_lab).length || 0
                if (labSlots === 0) {
                  reason = 'No lab slots configured'
                  suggestions = [
                    'Configure lab slots in the timetable',
                    'Check lab slot timing requirements'
                  ]
                } else {
                  reason = 'Lab scheduling conflict'
                  suggestions = [
                    'Check if lab slots are already occupied',
                    'Consider alternative lab timings',
                    'Review teacher availability for lab slots'
                  ]
                }
              }
            } else {
              // For lectures and tutorials
              const availableSlots = slots?.filter(s => !s.is_lab).length || 0
              const classrooms = rooms?.filter(r => r.kind === 'CLASS').length || 0

              if (availableSlots === 0) {
                reason = 'No time slots available'
                suggestions = [
                  'All time slots are occupied',
                  'Consider adding more time slots',
                  'Review if some courses can be moved to different timings'
                ]
              } else if (classrooms === 0) {
                reason = 'No classrooms available'
                suggestions = [
                  'Add more classrooms to the system',
                  'Check room capacity requirements'
                ]
              } else if (offering.teacher) {
                // Check teacher constraints
                reason = 'Teacher scheduling conflict'
                suggestions = [
                  `Teacher ${offering.teacher.name} may have reached daily/weekly limits`,
                  'Check teacher availability for specific time slots',
                  'Consider assigning a different teacher',
                  'Review teacher workload distribution'
                ]
              } else {
                reason = 'Room or timing conflict'
                suggestions = [
                  'All suitable rooms may be occupied at available times',
                  'Check if room capacity matches class size',
                  'Consider splitting large classes into sections'
                ]
              }
            }

            conflicts.push({
              offering_id: offering.id,
              course_code: course.code,
              course_name: course.name,
              section: `${offering.section?.program} Y${offering.section?.year}`,
              teacher_name: offering.teacher?.name || null,
              kind,
              hours_required: required - assigned,
              reason,
              suggestions
            })

            conflictsByReason[reason] = (conflictsByReason[reason] || 0) + 1
          } else if (required > 0) {
            assignedOfferingIds.add(offering.id)
          }
        })
      })

      const summary: ConflictSummary = {
        total_offerings: offerings?.length || 0,
        scheduled_successfully: assignedOfferingIds.size,
        failed_to_schedule: conflicts.length,
        conflicts_by_reason: conflictsByReason,
        conflicts
      }

      setConflictSummary(summary)
    } catch (error) {
      console.error('Error analyzing conflicts:', error)
      toast({
        title: 'Error',
        description: 'Failed to analyze scheduling conflicts',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getReasonIcon = (reason: string) => {
    if (reason.includes('teacher')) return <Users className="h-4 w-4" />
    if (reason.includes('room')) return <MapPin className="h-4 w-4" />
    if (reason.includes('slot') || reason.includes('time')) return <Clock className="h-4 w-4" />
    return <AlertCircle className="h-4 w-4" />
  }

  const getReasonColor = (reason: string): "default" | "destructive" | "outline" | "secondary" => {
    if (reason.includes('No teacher')) return 'destructive'
    if (reason.includes('Lab')) return 'outline'
    if (reason.includes('conflict')) return 'secondary'
    return 'default'
  }

  const applyFix = async (conflict: ConflictDetail, fixType: string) => {
    toast({
      title: 'Fix Applied',
      description: `Applying fix: ${fixType}`,
    })
    
    // Here you would implement actual fixes based on the fix type
    // For now, we'll just show a message
    setTimeout(() => {
      analyzeConflicts() // Refresh the conflicts
    }, 1000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Analyzing scheduling conflicts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Scheduling Conflicts</h1>
        <Button onClick={analyzeConflicts} variant="outline">
          Refresh Analysis
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Offerings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conflictSummary?.total_offerings || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Successfully Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {conflictSummary?.scheduled_successfully || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {conflictSummary?.total_offerings ? 
                `${((conflictSummary.scheduled_successfully / conflictSummary.total_offerings) * 100).toFixed(1)}%` 
                : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Failed to Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {conflictSummary?.failed_to_schedule || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Conflict Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(conflictSummary?.conflicts_by_reason || {}).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conflicts by Reason */}
      {conflictSummary && conflictSummary.conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conflicts by Reason</CardTitle>
            <CardDescription>Overview of scheduling conflict types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(conflictSummary.conflicts_by_reason).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getReasonIcon(reason)}
                    <span className="font-medium">{reason}</span>
                  </div>
                  <Badge variant={getReasonColor(reason)}>
                    {count} {count === 1 ? 'conflict' : 'conflicts'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Conflicts */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Conflicts</CardTitle>
          <CardDescription>Click on a conflict to see fix options</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Conflicts</TabsTrigger>
              <TabsTrigger value="no-teacher">No Teacher</TabsTrigger>
              <TabsTrigger value="scheduling">Scheduling Issues</TabsTrigger>
              <TabsTrigger value="lab">Lab Conflicts</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-2">
              {conflictSummary?.conflicts.map((conflict) => (
                <ConflictCard
                  key={`${conflict.offering_id}-${conflict.kind}`}
                  conflict={conflict}
                  onSelect={() => setSelectedConflict(conflict)}
                  onApplyFix={applyFix}
                />
              ))}
            </TabsContent>

            <TabsContent value="no-teacher" className="space-y-2">
              {conflictSummary?.conflicts
                .filter(c => c.reason.includes('No teacher'))
                .map((conflict) => (
                  <ConflictCard
                    key={`${conflict.offering_id}-${conflict.kind}`}
                    conflict={conflict}
                    onSelect={() => setSelectedConflict(conflict)}
                    onApplyFix={applyFix}
                  />
                ))}
            </TabsContent>

            <TabsContent value="scheduling" className="space-y-2">
              {conflictSummary?.conflicts
                .filter(c => c.reason.includes('conflict') && !c.reason.includes('Lab'))
                .map((conflict) => (
                  <ConflictCard
                    key={`${conflict.offering_id}-${conflict.kind}`}
                    conflict={conflict}
                    onSelect={() => setSelectedConflict(conflict)}
                    onApplyFix={applyFix}
                  />
                ))}
            </TabsContent>

            <TabsContent value="lab" className="space-y-2">
              {conflictSummary?.conflicts
                .filter(c => c.reason.includes('Lab') || c.kind === 'P')
                .map((conflict) => (
                  <ConflictCard
                    key={`${conflict.offering_id}-${conflict.kind}`}
                    conflict={conflict}
                    onSelect={() => setSelectedConflict(conflict)}
                    onApplyFix={applyFix}
                  />
                ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {conflictSummary && conflictSummary.conflicts.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>No Conflicts Found</AlertTitle>
          <AlertDescription>
            All offerings have been successfully scheduled. The timetable is complete.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

function ConflictCard({ 
  conflict, 
  onSelect, 
  onApplyFix 
}: { 
  conflict: ConflictDetail
  onSelect: () => void
  onApplyFix: (conflict: ConflictDetail, fixType: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const typeLabel = {
    L: 'Lecture',
    T: 'Tutorial',
    P: 'Practical'
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{conflict.course_code} - {conflict.course_name}</h3>
              <Badge variant="outline">{typeLabel[conflict.kind]}</Badge>
              <Badge variant="destructive">{conflict.hours_required}h missing</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {conflict.section} • {conflict.teacher_name || 'No teacher assigned'}
            </p>
          </div>
          <XCircle className="h-5 w-5 text-red-500" />
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Reason</AlertTitle>
            <AlertDescription>{conflict.reason}</AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div>
              <h4 className="font-medium mb-2">Suggested Fixes:</h4>
              <ul className="space-y-2">
                {conflict.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-sm">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2 pt-3">
              {conflict.reason.includes('No teacher') && (
                <Button
                  size="sm"
                  onClick={() => onApplyFix(conflict, 'auto-assign-teacher')}
                >
                  Auto-assign Teacher
                </Button>
              )}
              {conflict.reason.includes('conflict') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApplyFix(conflict, 'find-alternative-slot')}
                >
                  Find Alternative Slot
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSelect()}
              >
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}