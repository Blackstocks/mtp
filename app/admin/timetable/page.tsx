'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { slots, supabase } from '@/lib/db'
import { assignmentsFixed } from '@/lib/assignments-fixed'
import { AssignmentWithRelations } from '@/types/db'
import { TestTimetableGrid } from '@/components/test-timetable-grid'
import { RecommendationsSidePanel } from '@/components/recommendations-side-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, RefreshCw, Download, FileText, Table as TableIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { generateTimetablePDF } from '@/lib/pdf-export'

export default function TimetablePage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithRelations | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [viewType, setViewType] = useState<'section' | 'teacher'>('section')
  
  const { data: assignmentsList = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: assignmentsFixed.list,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  })
  
  const { data: slotsList = [] } = useQuery({
    queryKey: ['slots'],
    queryFn: slots.list
  })
  
  const { data: sections = [] } = useQuery({
    queryKey: ['sections-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('section')
        .select('id, program, year, name')
        .order('year, name')
      if (error) throw error
      return data
    }
  })
  
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher')
        .select('id, code, name')
        .order('name')
      if (error) throw error
      return data
    }
  })
  
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/solver/generate', { method: 'POST' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate timetable')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      toast({ 
        title: 'Timetable generated successfully',
        description: `${data.assignments} assignments created with ${data.stats?.utilization?.toFixed(1)}% utilization`
      })
      if (data.warnings?.length > 0) {
        toast({
          title: 'Some classes could not be scheduled',
          description: `${data.warnings.length} classes skipped due to conflicts`,
          variant: 'destructive'
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to generate timetable',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
  
  const reoptimizeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/solver/reoptimize', { method: 'POST' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to re-optimize timetable')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      toast({ 
        title: 'Timetable re-optimized successfully',
        description: `${data.new || 0} assignments updated, ${data.locked || 0} assignments kept locked`
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to re-optimize timetable',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
  
  const toggleLockMutation = useMutation({
    mutationFn: async (assignment: AssignmentWithRelations) => {
      // Cancel any pending refetches
      await queryClient.cancelQueries({ queryKey: ['assignments'] })
      
      const newLockStatus = !assignment.is_locked
      
      // Optimistically update the lock status
      queryClient.setQueryData(['assignments'], (old: AssignmentWithRelations[]) => {
        if (!old) return []
        return old.map(a => {
          if (a.offering_id === assignment.offering_id && 
              a.kind === assignment.kind && 
              a.slot_id === assignment.slot_id) {
            return { ...a, is_locked: newLockStatus }
          }
          return a
        })
      })
      
      // Update in database
      await assignmentsFixed.updateLock(
        assignment.offering_id,
        assignment.kind,
        assignment.slot_id,
        newLockStatus
      )
      
      // Return the new lock status for success handler
      return newLockStatus
    },
    onSuccess: (isLocked) => {
      toast({
        title: isLocked ? 'Class locked' : 'Class unlocked',
        description: isLocked 
          ? 'This class will not be moved during re-optimization'
          : 'This class can now be moved during re-optimization'
      })
    },
    onError: () => {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      toast({
        title: 'Failed to update lock status',
        description: 'Please try again',
        variant: 'destructive'
      })
    }
  })
  
  const handleDrop = async (
    assignment: AssignmentWithRelations, 
    targetSlot: any,
    targetRoom: string | null
  ) => {
    try {
      // Quick validation
      if (assignment.kind === 'P' && !targetSlot.is_lab) {
        toast({
          title: 'Cannot move practical here',
          description: 'Practical classes must be in lab slots',
          variant: 'destructive'
        })
        return
      }
      
      if (assignment.kind !== 'P' && targetSlot.is_lab) {
        toast({
          title: 'Cannot move theory/tutorial here', 
          description: 'Theory/Tutorial classes cannot be in lab slots',
          variant: 'destructive'
        })
        return
      }
      
      // Check if there's already an assignment for this offering/kind at the target slot
      const existingAssignment = assignmentsList.find(a => 
        a.offering_id === assignment.offering_id &&
        a.kind === assignment.kind &&
        a.slot_id === targetSlot.id
      )
      
      if (existingAssignment) {
        toast({
          title: 'Assignment already exists',
          description: 'This class is already scheduled at this time',
          variant: 'destructive'
        })
        return
      }
      
      // Determine the room to use
      let roomToUse = targetRoom || assignment.room_id || assignment.room?.id
      
      // If no room specified and it's required, try to find an available one
      if (!roomToUse && assignment.offering?.expected_size) {
        // Find available rooms for this slot
        const roomsInUse = assignmentsList
          .filter(a => a.slot_id === targetSlot.id && a.room_id)
          .map(a => a.room_id)
        
        // Get all rooms
        const { data: allRooms } = await supabase
          .from('room')
          .select('*')
          .gte('capacity', assignment.offering.expected_size)
          .eq('kind', assignment.kind === 'P' ? 'LAB' : 'CLASS')
        
        if (allRooms && allRooms.length > 0) {
          const availableRoom = allRooms.find(r => !roomsInUse.includes(r.id))
          if (availableRoom) {
            roomToUse = availableRoom.id
          }
        }
      }
      
      // Prepare the new assignment
      const newAssignment = {
        offering_id: assignment.offering_id,
        slot_id: targetSlot.id,
        room_id: roomToUse || null,
        kind: assignment.kind,
        is_locked: assignment.is_locked || false
      }
      
      // Store original data for rollback
      const originalData = queryClient.getQueryData(['assignments']) as AssignmentWithRelations[]
      
      // Optimistically update the UI first
      const optimisticData = originalData.filter(a => !(
        a.offering_id === assignment.offering_id && 
        a.kind === assignment.kind && 
        a.slot_id === assignment.slot_id
      ))
      
      const movedAssignment: AssignmentWithRelations = {
        ...assignment,
        slot_id: targetSlot.id,
        slot: targetSlot,
        room_id: roomToUse || null,
        room: roomToUse === assignment.room_id ? assignment.room : null
      }
      
      optimisticData.push(movedAssignment)
      queryClient.setQueryData(['assignments'], optimisticData)
      
      try {
        // Now do the database operations
        await assignmentsFixed.delete(
          assignment.offering_id,
          assignment.kind,
          assignment.slot_id
        )
        
        await assignmentsFixed.create(newAssignment)
        
        // Success!
        toast({ 
          title: 'Class moved successfully',
          description: `Moved to ${targetSlot.code}${targetSlot.occ} on ${targetSlot.day}`
        })
        
      } catch (error: any) {
        console.error('Failed to move assignment:', error)
        
        // Rollback to original data
        queryClient.setQueryData(['assignments'], originalData)
        
        toast({ 
          title: 'Failed to move class',
          description: error.message || 'Please try again',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      // Rollback by refreshing the data
      await queryClient.invalidateQueries({ queryKey: ['assignments'] })
      
      toast({ 
        title: 'Failed to move class',
        description: error.message,
        variant: 'destructive'
      })
    }
  }
  
  const handleApplyRecommendation = async (recommendation: any) => {
    try {
      const { assignment, slot_id, room_id } = recommendation
      
      // Update the assignment directly
      const { error: updateError } = await supabase
        .from('assignment')
        .update({
          slot_id: slot_id,
          room_id: room_id
        })
        .eq('offering_id', assignment.offering_id)
        .eq('kind', assignment.kind)
      
      if (updateError) {
        throw updateError
      }
      
      // Invalidate queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['assignments'] })
      
      toast({ title: 'Recommendation applied successfully' })
      setSelectedAssignment(null)
    } catch (error: any) {
      toast({ 
        title: 'Failed to apply recommendation',
        description: error.message,
        variant: 'destructive'
      })
    }
  }
  
  const handleExportCSV = () => {
    try {
      // Prepare CSV headers
      const headers = ['Day', 'Time', 'Course Code', 'Course Name', 'Type', 'Room', 'Teacher', 'Section']
      
      // Filter assignments based on current view
      const filteredAssignments = (selectedSectionId === 'all' || selectedTeacherId === 'all')
        ? assignmentsList // Show all assignments for "all" options
        : assignmentsList.filter(a => {
            if (viewType === 'section') {
              return a.offering?.section?.id === selectedSectionId
            } else {
              return a.offering?.teacher?.id === selectedTeacherId
            }
          })
      
      if (filteredAssignments.length === 0) {
        toast({
          title: 'No data to export',
          description: 'Please select a section or teacher with assignments',
          variant: 'destructive'
        })
        return
      }
      
      // Sort assignments by day and time
      const sortedAssignments = [...filteredAssignments].sort((a, b) => {
        const dayOrder = ['MON', 'TUE', 'WED', 'THU', 'FRI']
        const dayDiff = dayOrder.indexOf(a.slot?.day || '') - dayOrder.indexOf(b.slot?.day || '')
        if (dayDiff !== 0) return dayDiff
        return (a.slot?.start_time || '').localeCompare(b.slot?.start_time || '')
      })
      
      // Convert to CSV rows
      const rows = sortedAssignments.map(a => [
        a.slot?.day || '',
        `${a.slot?.start_time || ''} - ${a.slot?.end_time || ''}`,
        a.offering?.course?.code || '',
        a.offering?.course?.name || '',
        a.kind,
        a.room?.code || 'TBD',
        a.offering?.teacher?.name || '',
        a.offering?.section?.name || ''
      ])
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const fileName = viewType === 'section' 
        ? selectedSectionId === 'all' 
          ? 'timetable_all_sections.csv'
          : `timetable_${sections.find(s => s.id === selectedSectionId)?.name || 'section'}.csv`
        : selectedTeacherId === 'all'
          ? 'timetable_all_teachers.csv'  
          : `timetable_${teachers.find(t => t.id === selectedTeacherId)?.name || 'teacher'}.csv`
      
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: 'CSV exported successfully',
        description: `Downloaded as ${fileName}`
      })
    } catch (error: any) {
      toast({
        title: 'Failed to export CSV',
        description: error.message,
        variant: 'destructive'
      })
    }
  }
  
  const handleExportPDF = () => {
    try {
      if (!currentViewId && selectedSectionId !== 'all' && selectedTeacherId !== 'all') return
      
      // Get entity name
      let entityName = ''
      if (viewType === 'section') {
        if (selectedSectionId === 'all') {
          entityName = 'All Sections'
        } else {
          const section = sections.find(s => s.id === selectedSectionId)
          entityName = section ? `${section.program} Year ${section.year} ${section.name}` : 'Section'
        }
      } else {
        if (selectedTeacherId === 'all') {
          entityName = 'All Teachers'
        } else {
          const teacher = teachers.find(t => t.id === selectedTeacherId)
          entityName = teacher?.name || 'Teacher'
        }
      }
      
      // Generate PDF
      const doc = generateTimetablePDF({
        assignments: assignmentsList,
        slots: slotsList,
        viewType,
        viewId: currentViewId,
        entityName
      })
      
      // Download PDF
      const fileName = viewType === 'section' 
        ? selectedSectionId === 'all'
          ? 'timetable_all_sections.pdf'
          : `timetable_${sections.find(s => s.id === selectedSectionId)?.name || 'section'}.pdf`
        : selectedTeacherId === 'all'
          ? 'timetable_all_teachers.pdf'
          : `timetable_${teachers.find(t => t.id === selectedTeacherId)?.name || 'teacher'}.pdf`
      
      doc.save(fileName)
      
      toast({
        title: 'PDF exported successfully',
        description: `Downloaded as ${fileName}`
      })
    } catch (error: any) {
      toast({
        title: 'Failed to export PDF',
        description: error.message,
        variant: 'destructive'
      })
    }
  }
  
  const currentViewId = viewType === 'section' 
    ? (selectedSectionId === 'all' ? '' : selectedSectionId) 
    : (selectedTeacherId === 'all' ? '' : selectedTeacherId)
  
  return (
    <div className="min-h-screen p-2 md:p-3 lg:p-4">
      <div className="max-w-full mx-auto">
        <div className="glass-effect rounded-lg p-3 mb-3 shadow-elegant animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gradient mb-1">University Timetable</h1>
              <p className="text-xs text-gray-600">Manage and optimize class schedules with AI assistance</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                size="sm"
                className="gradient-primary text-white hover:opacity-90 transition-all text-xs"
              >
                {generateMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Generate
              </Button>
              <Button 
                onClick={() => reoptimizeMutation.mutate()}
                disabled={reoptimizeMutation.isPending || assignmentsList.length === 0}
                size="sm"
                variant="outline"
                className="border-black text-black hover:bg-gray-100 transition-all text-xs"
              >
                {reoptimizeMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                <RefreshCw className="mr-1 h-3 w-3" />
                Re-optimize
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    disabled={assignmentsList.length === 0}
                    variant="outline"
                    size="sm"
                    className="border-black text-black hover:bg-gray-100 transition-all text-xs"
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <TableIcon className="mr-2 h-4 w-4" />
                    Export as PDF (Timetable)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      
        {assignmentsList.length === 0 ? (
          <div className="glass-effect rounded-lg p-6 text-center shadow-elegant animate-fade-in">
            <div className="max-w-sm mx-auto">
              <div className="w-16 h-16 bg-gradient-primary rounded-full mx-auto mb-3 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No Timetable Generated</h3>
              <p className="text-sm text-gray-600">
                Click "Generate" to create an initial timetable
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Main Content - Timetable */}
            <div className="flex-1">
              <Card className="glass-effect shadow-elegant border-0 animate-slide-in">
                <CardHeader className="p-3 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle className="text-lg font-bold">Schedule View</CardTitle>
                    <Tabs value={viewType} onValueChange={(v) => setViewType(v as 'section' | 'teacher')} className="w-full sm:w-auto">
                      <TabsList className="h-8 grid w-full grid-cols-2 bg-white/50">
                        <TabsTrigger value="section" className="text-xs data-[state=active]:gradient-primary data-[state=active]:text-white">
                          By Section
                        </TabsTrigger>
                        <TabsTrigger value="teacher" className="text-xs data-[state=active]:gradient-primary data-[state=active]:text-white">
                          By Teacher
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div className="w-full">
                    {viewType === 'section' ? (
                      <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                        <SelectTrigger className="h-8 text-xs w-full bg-white border-gray-300">
                          <SelectValue placeholder="Select a section" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          <SelectItem value="all" className="text-xs font-semibold">
                            All Sections
                          </SelectItem>
                          <div className="my-1 border-t" />
                          {sections.map(section => (
                            <SelectItem key={section.id} value={section.id} className="text-xs">
                              {section.name} ({section.program} Year {section.year})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                        <SelectTrigger className="h-8 text-xs w-full bg-white border-gray-300">
                          <SelectValue placeholder="Select a teacher" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          <SelectItem value="all" className="text-xs font-semibold">
                            All Teachers
                          </SelectItem>
                          <div className="my-1 border-t" />
                          {teachers.map(teacher => (
                            <SelectItem key={teacher.id} value={teacher.id} className="text-xs">
                              {teacher.name} ({teacher.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
              <CardContent className="p-2">
                {assignmentsList.length > 0 ? (
                  <>
                    {(!currentViewId || selectedSectionId === 'all' || selectedTeacherId === 'all') && (
                      <Alert className="mb-4">
                        <AlertDescription>
                          {selectedSectionId === 'all' 
                            ? 'Showing timetable for all sections. You can see how all classes are distributed across the week.'
                            : selectedTeacherId === 'all'
                            ? 'Showing timetable for all teachers. You can see the overall teaching load distribution.'
                            : 'Select a section or teacher from the dropdown above to filter the view.'
                          }
                        </AlertDescription>
                      </Alert>
                    )}
                    <TestTimetableGrid
                      assignments={assignmentsList}
                      slots={slotsList}
                      viewType={viewType}
                      viewId={currentViewId}
                      selectedAssignment={selectedAssignment}
                      onDrop={handleDrop}
                      onToggleLock={(assignment) => toggleLockMutation.mutate(assignment)}
                      onSelectAssignment={(assignment) => {
                        setSelectedAssignment(assignment)
                      }}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground text-center">
                      No assignments found. Click "Generate" to create a new timetable.
                    </p>
                  </div>
                )}
                </CardContent>
              </Card>
            </div>
            
            {/* Right Side - Recommendations Panel */}
            {selectedAssignment && (
              <div className="animate-slide-in lg:w-72">
                <RecommendationsSidePanel
                  selectedAssignment={selectedAssignment}
                  onApplyRecommendation={handleApplyRecommendation}
                  onClose={() => setSelectedAssignment(null)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}