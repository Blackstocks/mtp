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
import { Loader2, RefreshCw, Download } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
      if (!response.ok) throw new Error('Failed to generate timetable')
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      toast({ 
        title: 'Timetable generated successfully',
        description: `${data.assignments} assignments created`
      })
      if (data.skipped?.length > 0) {
        toast({
          title: 'Some classes could not be scheduled',
          description: `${data.skipped.length} items skipped`,
          variant: 'destructive'
        })
      }
    }
  })
  
  const reoptimizeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/solver/reoptimize', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to re-optimize timetable')
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      toast({ 
        title: 'Timetable re-optimized',
        description: `${data.new} new assignments, ${data.locked} kept locked`
      })
    }
  })
  
  const toggleLockMutation = useMutation({
    mutationFn: async (assignment: AssignmentWithRelations) => {
      // Cancel any pending refetches
      await queryClient.cancelQueries({ queryKey: ['assignments'] })
      
      // Optimistically update the lock status
      queryClient.setQueryData(['assignments'], (old: AssignmentWithRelations[]) => {
        if (!old) return []
        return old.map(a => {
          if (a.offering_id === assignment.offering_id && 
              a.kind === assignment.kind && 
              a.slot_id === assignment.slot_id) {
            return { ...a, is_locked: !a.is_locked }
          }
          return a
        })
      })
      
      // Update in database
      await assignmentsFixed.updateLock(
        assignment.offering_id,
        assignment.kind,
        assignment.slot_id,
        !assignment.is_locked
      )
    },
    onError: () => {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
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
      
      // Delete old assignment
      await supabase
        .from('assignment')
        .delete()
        .eq('offering_id', assignment.offering_id)
        .eq('kind', assignment.kind)
        .eq('slot_id', assignment.slot_id)
      
      // Create new assignment
      await assignmentsFixed.create({
        offering_id: assignment.offering_id,
        slot_id: slot_id,
        room_id: room_id,
        kind: assignment.kind,
        is_locked: true
      })
      
      // Re-optimize
      await reoptimizeMutation.mutateAsync()
      
      toast({ title: 'Recommendation applied and schedule re-optimized' })
      setSelectedAssignment(null)
    } catch (error: any) {
      toast({ 
        title: 'Failed to apply recommendation',
        description: error.message,
        variant: 'destructive'
      })
    }
  }
  
  const currentViewId = viewType === 'section' ? selectedSectionId : selectedTeacherId
  
  return (
    <div className="container-fluid mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Timetable</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Schedule
          </Button>
          <Button 
            onClick={() => reoptimizeMutation.mutate()}
            variant="outline"
            disabled={reoptimizeMutation.isPending || assignmentsList.length === 0}
          >
            {reoptimizeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <RefreshCw className="mr-2 h-4 w-4" />
            Re-optimize
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      {assignmentsList.length === 0 ? (
        <Alert>
          <AlertDescription>
            No timetable generated yet. Click "Generate Schedule" to create an initial timetable.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex gap-4">
          {/* Left Side - Timetable */}
          <div className="flex-1">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Schedule View</CardTitle>
                  <Tabs value={viewType} onValueChange={(v) => setViewType(v as 'section' | 'teacher')}>
                    <TabsList>
                      <TabsTrigger value="section">By Section</TabsTrigger>
                      <TabsTrigger value="teacher">By Teacher</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="mt-4">
                  {viewType === 'section' ? (
                    <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a section" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map(section => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.name} ({section.program} Year {section.year})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map(teacher => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name} ({teacher.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {currentViewId && (
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
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Right Side - Recommendations Panel */}
          {selectedAssignment ? (
            <RecommendationsSidePanel
              selectedAssignment={selectedAssignment}
              onApplyRecommendation={handleApplyRecommendation}
              onClose={() => setSelectedAssignment(null)}
            />
          ) : (
            <div className="text-xs text-gray-500 p-4">
              Click any class card to see recommendations
            </div>
          )}
        </div>
      )}
    </div>
  )
}