'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock, Unlock } from 'lucide-react'
import { AssignmentWithRelations, Slot } from '@/types/db'
import { useDraggable, useDroppable, DndContext, DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { formatSlotDisplay } from '@/lib/slot-utils'

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
    'L': 'bg-black',
    'T': 'bg-gray-800',
    'P': 'bg-gray-600'
  }

  return (
    <Card 
      className={`p-2 ${kindColors[assignment.kind]} text-white border-0 hover:shadow-lg transform hover:scale-105 transition-all duration-200 cursor-pointer active:scale-95`}
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
      <div className="text-xs font-bold">{assignment.offering?.course?.code}</div>
      <div className="text-[10px] opacity-90">{assignment.offering?.teacher?.name}</div>
      <div className="flex justify-between items-center mt-2">
        <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0">{assignment.kind}</Badge>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleLock()
          }}
          className="p-1"
        >
          {assignment.is_locked ? <Lock className="h-3 w-3 text-white" /> : <Unlock className="h-3 w-3 text-white/70" />}
        </button>
      </div>
      <div className="text-[10px] text-white/80 mt-1">{assignment.room?.code || 'No room'}</div>
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
    if (!viewId) {
      // If no view selected, show all assignments
      return true
    }
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
      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 bg-black text-white font-bold text-xs first:rounded-tl-xl">Time</th>
              {days.map(day => (
                <th key={day} className="p-2 bg-black text-white font-bold text-xs min-w-[140px] last:rounded-tr-xl">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((time, timeIdx) => (
              <tr key={time} className="hover:bg-gray-50 transition-colors">
                <td className="border border-gray-300 p-1 font-mono text-xs bg-gray-100 font-semibold text-black">
                  {formatTime(time)}
                </td>
                {days.map(day => {
                  const slotsAtTime = slotGrid[`${day}-${time}`] || []
                  const slotAssignments = filteredAssignments.filter(a =>
                    slotsAtTime.some(s => s.id === a.slot_id)
                  )
                  
                  return (
                    <td key={day} className="border border-gray-200 p-1 bg-white">
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
        border-2 rounded-lg p-2 min-h-[100px] space-y-1 transition-all duration-200
        ${isOver ? 'bg-gray-100 border-black shadow-lg scale-105' : ''}
        ${slot.is_lab ? 'bg-gray-50 border-gray-400' : 'bg-white border-gray-200'}
      `}
    >
      <div className="text-[10px] font-semibold mb-1">
        {formatSlotDisplay(slot)}
        {slot.is_lab && <Badge variant="outline" className="text-[10px] ml-1">LAB</Badge>}
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
    zIndex: isDragging ? 1000 : 'auto',
    position: isDragging ? 'relative' : 'static',
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