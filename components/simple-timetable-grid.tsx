'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock, Unlock } from 'lucide-react'
import { AssignmentWithRelations, Slot } from '@/types/db'

interface TimetableGridProps {
  assignments: AssignmentWithRelations[]
  slots: Slot[]
  viewType: 'section' | 'teacher'
  viewId: string
  selectedAssignment?: AssignmentWithRelations | null
  onToggleLock: (assignment: AssignmentWithRelations) => void
  onSelectAssignment: (assignment: AssignmentWithRelations) => void
}

interface SimpleCardProps {
  assignment: AssignmentWithRelations
  onToggleLock: () => void
  onClick: () => void
  isSelected?: boolean
}

function SimpleCard({ assignment, onToggleLock, onClick, isSelected = false }: SimpleCardProps) {
  const kindColors = {
    'L': 'bg-blue-100 text-blue-800 border-blue-300',
    'T': 'bg-green-100 text-green-800 border-green-300',
    'P': 'bg-purple-100 text-purple-800 border-purple-300'
  }
  
  return (
    <Card 
      className={`p-2 ${kindColors[assignment.kind]} border-2 hover:shadow-md transition-all duration-200 hover:scale-105 cursor-move`}
      onDoubleClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('CARD DOUBLE CLICKED!!!', assignment.offering?.course?.code)
        onClick()
      }}
    >
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
            e.preventDefault()
            e.stopPropagation()
            onToggleLock()
          }}
          className="p-1"
        >
          {assignment.is_locked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3 text-gray-400" />
          )}
        </button>
      </div>
      <div className="text-xs text-gray-600 mt-1">
        {assignment.room?.code || 'No room'}
      </div>
    </Card>
  )
}

export function SimpleTimetableGrid({
  assignments,
  slots,
  viewType,
  viewId,
  selectedAssignment,
  onToggleLock,
  onSelectAssignment
}: TimetableGridProps) {
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
  const times = [...new Set(slots.map(s => s.start_time))].sort()
  
  // Format time for display
  const formatTime = (time: string) => {
    if (time.includes(':')) {
      return time.substring(0, 5)
    }
    return time
  }
  
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
  
  return (
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
                        {slotsAtTime.map((slot) => {
                          const thisSlotAssignments = slotAssignments.filter(
                            a => a.slot_id === slot.id
                          )
                          return (
                            <div
                              key={slot.id}
                              className={`border-2 rounded p-2 min-h-[100px] ${
                                slot.is_lab ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
                              }`}
                            >
                              <div className="text-xs font-semibold mb-1 flex items-center gap-2">
                                <span>{slot.code}{slot.occ}</span>
                                {slot.is_lab && (
                                  <Badge variant="outline" className="text-xs">LAB</Badge>
                                )}
                              </div>
                              <div className="space-y-1">
                                {thisSlotAssignments.map(assignment => (
                                  <div
                                    key={`${assignment.offering_id}-${assignment.kind}-${assignment.slot_id}`}
                                  >
                                    <SimpleCard
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
  )
}