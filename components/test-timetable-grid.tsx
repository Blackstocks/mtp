'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock, Unlock } from 'lucide-react'
import { AssignmentWithRelations, Slot } from '@/types/db'
import { useDraggable, useDroppable, DndContext, DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
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

function TestCard({ assignment, onToggleLock, onShowRecommendations }: {
  assignment: AssignmentWithRelations
  onToggleLock: () => void
  onShowRecommendations: () => void
}) {
  const kindColors = {
    'L': 'bg-blue-100 text-blue-800 border-blue-300',
    'T': 'bg-green-100 text-green-800 border-green-300',
    'P': 'bg-purple-100 text-purple-800 border-purple-300'
  }

  return (
    <Card 
      className={`p-2 ${kindColors[assignment.kind]} border-2 hover:shadow-lg hover:scale-105 transition-all cursor-pointer active:scale-95`}
      onMouseDown={(e) => {
        // If not clicking on a button or the lock icon
        const target = e.target as HTMLElement
        if (target.tagName !== 'BUTTON' && !target.closest('button')) {
          e.preventDefault()
          e.stopPropagation()
          console.log('Card clicked - showing recommendations')
          onShowRecommendations()
        }
      }}
    >
      <div className="text-xs font-semibold">{assignment.offering?.course?.code}</div>
      <div className="text-xs">{assignment.offering?.teacher?.name}</div>
      <div className="flex justify-between items-center mt-1">
        <Badge variant="outline" className="text-xs">{assignment.kind}</Badge>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleLock()
          }}
          className="p-1"
        >
          {assignment.is_locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3 text-gray-400" />}
        </button>
      </div>
      <div className="text-xs text-gray-600">{assignment.room?.code}</div>
    </Card>
  )
}

export function TestTimetableGrid({
  assignments,
  slots,
  viewType,
  viewId,
  onDrop,
  onToggleLock,
  onSelectAssignment
}: TimetableGridProps) {
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
  const times = [...new Set(slots.map(s => s.start_time))].sort()
  
  const formatTime = (time: string) => {
    if (time.includes(':')) {
      return time.substring(0, 5)
    }
    return time
  }
  
  const filteredAssignments = assignments.filter(a => {
    if (viewType === 'section') {
      return a.offering?.section?.id === viewId
    } else {
      return a.offering?.teacher?.id === viewId
    }
  })
  
  const slotGrid = slots.reduce((acc, slot) => {
    const key = `${slot.day}-${slot.start_time}`
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {} as Record<string, Slot[]>)

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over) return
    
    const assignment = event.active.data.current as AssignmentWithRelations
    const targetSlot = event.over.data.current as Slot
    
    if (assignment && targetSlot && assignment.slot_id !== targetSlot.id && !assignment.is_locked) {
      onDrop(assignment, targetSlot, assignment.room?.id || null)
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-50">Time</th>
              {days.map(day => (
                <th key={day} className="border p-2 bg-gray-50 min-w-[150px]">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map(time => (
              <tr key={time}>
                <td className="border p-2 font-mono text-sm bg-gray-50">{formatTime(time)}</td>
                {days.map(day => {
                  const slotsAtTime = slotGrid[`${day}-${time}`] || []
                  const slotAssignments = filteredAssignments.filter(a =>
                    slotsAtTime.some(s => s.id === a.slot_id)
                  )
                  
                  return (
                    <td key={day} className="border p-2">
                      {slotsAtTime.map((slot) => (
                        <DroppableSlot key={slot.id} slot={slot}>
                          {slotAssignments
                            .filter(a => a.slot_id === slot.id)
                            .map(assignment => (
                              <DraggableItem
                                key={`${assignment.offering_id}-${assignment.kind}`}
                                assignment={assignment}
                                disabled={assignment.is_locked}
                              >
                                <TestCard
                                  assignment={assignment}
                                  onToggleLock={() => onToggleLock(assignment)}
                                  onShowRecommendations={() => onSelectAssignment(assignment)}
                                />
                              </DraggableItem>
                            ))}
                        </DroppableSlot>
                      ))}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DndContext>
  )
}

function DroppableSlot({ slot, children }: { slot: Slot; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: slot.id,
    data: slot
  })

  return (
    <div
      ref={setNodeRef}
      className={`
        border-2 rounded p-2 min-h-[100px] space-y-1
        ${isOver ? 'bg-blue-50 border-blue-400' : ''}
        ${slot.is_lab ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}
      `}
    >
      <div className="text-xs font-semibold mb-1">
        {slot.code}{slot.occ}
        {slot.is_lab && <Badge variant="outline" className="text-xs ml-2">LAB</Badge>}
      </div>
      {children}
    </div>
  )
}

function DraggableItem({ 
  assignment, 
  disabled, 
  children 
}: { 
  assignment: AssignmentWithRelations
  disabled: boolean
  children: React.ReactNode 
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${assignment.offering_id}-${assignment.kind}-${assignment.slot_id}`,
    data: assignment,
    disabled
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(disabled ? {} : { ...attributes, ...listeners })}
      className={disabled ? 'cursor-not-allowed' : 'cursor-move'}
    >
      {children}
    </div>
  )
}