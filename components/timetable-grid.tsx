'use client'

import { useDraggable, useDroppable, DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock, Unlock } from 'lucide-react'
import { AssignmentWithRelations, Slot } from '@/types/db'
import { useState } from 'react'

interface TimetableGridProps {
  assignments: AssignmentWithRelations[]
  slots: Slot[]
  viewType: 'section' | 'teacher'
  viewId: string
  selectedAssignment?: AssignmentWithRelations | null
  onDrop: (assignment: AssignmentWithRelations, targetSlot: Slot, targetRoom: string | null) => void
  onToggleLock: (assignment: AssignmentWithRelations) => void
  onSelectAssignment: (assignment: AssignmentWithRelations) => void
}

interface DraggableCardProps {
  assignment: AssignmentWithRelations
  onToggleLock: () => void
  onClick: () => void
  isSelected?: boolean
}

function DraggableCard({ assignment, onToggleLock, onClick, isSelected = false }: DraggableCardProps) {
  const dragId = `${assignment.offering_id}-${assignment.kind}-${assignment.slot_id}`
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: assignment,
    disabled: assignment.is_locked
  })
  
  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transform ? 'none' : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 999 : undefined,
  }
  
  const kindColors = {
    'L': 'bg-blue-100 text-blue-800 border-blue-300',
    'T': 'bg-green-100 text-green-800 border-green-300',
    'P': 'bg-purple-100 text-purple-800 border-purple-300'
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('DOUBLE CLICK FIRED!', assignment.offering?.course?.code)
    onClick()
  }
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${assignment.is_locked ? 'cursor-not-allowed' : 'cursor-move'}`}
      {...attributes}
      {...(assignment.is_locked ? {} : listeners)}
    >
      <Card 
        className={`p-2 ${kindColors[assignment.kind]} border-2 hover:shadow-md transition-all duration-200 hover:scale-[1.02] select-none`}
      >
        <div className="relative">
          <div className="text-xs font-semibold">
            {assignment.offering?.course?.code}
          </div>
          <div className="text-xs">
            {assignment.offering?.teacher?.name}
          </div>
          <div className="flex justify-between items-center mt-1">
            <Badge variant="outline" className="text-xs">
              {assignment.kind}
            </Badge>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleLock()
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              className="p-1 cursor-pointer"
            >
              {assignment.is_locked ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Unlock className="h-3 w-3 text-gray-400" />
              )}
            </button>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {assignment.room?.code}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              console.log('Recommendations button clicked!')
              onClick()
            }}
            className="mt-1 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 w-full"
          >
            Show Recommendations
          </button>
        </div>
      </Card>
    </div>
  )
}

interface DroppableSlotProps {
  slot: Slot
  assignments: AssignmentWithRelations[]
  selectedAssignment?: AssignmentWithRelations | null
  onToggleLock: (assignment: AssignmentWithRelations) => void
  onSelectAssignment: (assignment: AssignmentWithRelations) => void
}

function DroppableSlot({ slot, assignments, selectedAssignment, onToggleLock, onSelectAssignment }: DroppableSlotProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: slot.id,
    data: slot
  })
  
  // Check if the current drag item is compatible with this slot
  const isDragCompatible = () => {
    if (!active?.data?.current) return true
    const draggedAssignment = active.data.current as AssignmentWithRelations
    
    // Check slot type compatibility
    if (draggedAssignment.kind === 'P' && !slot.is_lab) return false
    if (draggedAssignment.kind !== 'P' && slot.is_lab) return false
    
    return true
  }
  
  const isCompatible = isDragCompatible()
  
  return (
    <div
      ref={setNodeRef}
      className={`
        border-2 rounded p-2 min-h-[100px] transition-all duration-150
        ${isOver && isCompatible ? 'bg-blue-50 border-blue-400 scale-[1.02]' : ''}
        ${isOver && !isCompatible ? 'bg-red-50 border-red-400' : ''}
        ${!isOver && slot.is_lab ? 'bg-yellow-50 border-yellow-200' : ''}
        ${!isOver && !slot.is_lab ? 'bg-white border-gray-200' : ''}
      `}
    >
      <div className="text-xs font-semibold mb-1 flex items-center gap-2">
        <span>{slot.code}{slot.occ}</span>
        {slot.is_lab && (
          <Badge variant="outline" className="text-xs">LAB</Badge>
        )}
      </div>
      <div className="space-y-1">
        {assignments.map(assignment => (
          <div
            key={`${assignment.offering_id}-${assignment.kind}-${assignment.slot_id}`}
            className="animate-fade-in"
          >
            <DraggableCard
              assignment={assignment}
              isSelected={
                selectedAssignment?.offering_id === assignment.offering_id &&
                selectedAssignment?.kind === assignment.kind &&
                selectedAssignment?.slot_id === assignment.slot_id
              }
              onToggleLock={() => onToggleLock(assignment)}
              onClick={() => onSelectAssignment(assignment)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TimetableGrid({
  assignments,
  slots,
  viewType,
  viewId,
  selectedAssignment,
  onDrop,
  onToggleLock,
  onSelectAssignment
}: TimetableGridProps) {
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
  const times = [...new Set(slots.map(s => s.start_time))].sort()
  
  // Format time for display
  const formatTime = (time: string) => {
    // Handle HH:MM:SS format
    if (time.includes(':')) {
      return time.substring(0, 5) // Get HH:MM
    }
    return time
  }
  const [activeAssignment, setActiveAssignment] = useState<AssignmentWithRelations | null>(null)
  
  // Filter assignments based on view
  const filteredAssignments = assignments.filter(a => {
    if (viewType === 'section') {
      return a.offering?.section?.id === viewId
    } else {
      return a.offering?.teacher?.id === viewId
    }
  })
  
  // Group slots by day and time
  const slotGrid = slots.reduce((acc, slot) => {
    const key = `${slot.day}-${slot.start_time}`
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {} as Record<string, Slot[]>)
  
  const handleDragStart = (event: DragStartEvent) => {
    const assignment = event.active.data.current as AssignmentWithRelations
    setActiveAssignment(assignment)
  }
  
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveAssignment(null)
    
    if (!event.over) return
    
    const assignment = event.active.data.current as AssignmentWithRelations
    const targetSlot = event.over.data.current as Slot
    
    // Don't allow dropping on the same slot
    if (assignment.slot_id === targetSlot.id) return
    
    // Don't allow dropping locked assignments
    if (assignment.is_locked) return
    
    if (assignment && targetSlot) {
      // Check if the target slot is appropriate for the assignment type
      if (assignment.kind === 'P' && !targetSlot.is_lab) {
        // Don't allow dropping practicals on non-lab slots
        return
      }
      if (assignment.kind !== 'P' && targetSlot.is_lab) {
        // Don't allow dropping theory/tutorial on lab slots
        return
      }
      
      // Keep the same room if possible, otherwise null
      const targetRoom = assignment.room?.id || null
      onDrop(assignment, targetSlot, targetRoom)
    }
  }
  
  return (
    <DndContext 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-50">Time</th>
              {days.map(day => (
                <th key={day} className="border p-2 bg-gray-50 min-w-[150px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map(time => (
              <tr key={time}>
                <td className="border p-2 font-mono text-sm bg-gray-50">
                  {formatTime(time)}
                </td>
                {days.map(day => {
                  const slotsAtTime = slotGrid[`${day}-${time}`] || []
                  const slotAssignments = filteredAssignments.filter(a =>
                    slotsAtTime.some(s => s.id === a.slot_id)
                  )
                  
                  return (
                    <td key={day} className="border p-2">
                      {slotsAtTime.length > 0 ? (
                        <div className="space-y-2">
                          {slotsAtTime.map((slot, idx) => {
                            const thisSlotAssignments = slotAssignments.filter(
                              a => a.slot_id === slot.id
                            )
                            return (
                              <DroppableSlot
                                key={slot.id}
                                slot={slot}
                                assignments={thisSlotAssignments}
                                selectedAssignment={selectedAssignment}
                                onToggleLock={onToggleLock}
                                onSelectAssignment={onSelectAssignment}
                              />
                            )
                          })}
                        </div>
                      ) : (
                        <div className="min-h-[100px]" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DragOverlay>
        {activeAssignment && (
          <Card className="p-2 bg-blue-100 border-2 border-blue-400 shadow-lg cursor-move">
            <div className="text-xs font-semibold">
              {activeAssignment.offering?.course?.code || 'Unknown Course'}
            </div>
            <div className="text-xs">
              {activeAssignment.offering?.teacher?.name || 'No Teacher'}
            </div>
            <div className="flex justify-between items-center mt-1">
              <Badge variant="outline" className="text-xs">
                {activeAssignment.kind}
              </Badge>
              {activeAssignment.room?.code && (
                <span className="text-xs text-gray-600">
                  {activeAssignment.room.code}
                </span>
              )}
            </div>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  )
}