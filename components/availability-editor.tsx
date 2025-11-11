'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { slots, availability } from '@/lib/db'
import { Teacher, Slot, Availability } from '@/types/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'

interface AvailabilityEditorProps {
  teacher: Teacher
}

export function AvailabilityEditor({ teacher }: AvailabilityEditorProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set())
  const [bulkDay, setBulkDay] = useState<string | null>(null)
  const [bulkCode, setBulkCode] = useState<string | null>(null)
  
  const { data: slotsList = [] } = useQuery({
    queryKey: ['slots'],
    queryFn: slots.list
  })
  
  const { data: teacherAvailability = [] } = useQuery({
    queryKey: ['availability', teacher.id],
    queryFn: () => availability.getForTeacher(teacher.id)
  })
  
  useEffect(() => {
    const availableSlotIds = new Set(teacherAvailability.map(a => a.slot_id))
    setSelectedSlots(availableSlotIds)
  }, [teacherAvailability])
  
  const saveMutation = useMutation({
    mutationFn: async () => {
      const availabilities = Array.from(selectedSlots).map(slot_id => ({
        slot_id,
        can_teach: true
      }))
      return availability.setForTeacher(teacher.id, availabilities)
    },
    onSuccess: () => {
      toast({ title: 'Availability saved successfully' })
      // Refetch to update the UI
      queryClient.invalidateQueries({ queryKey: ['availability', teacher.id] })
    }
  })
  
  const groupedSlots = slotsList.reduce((acc, slot) => {
    if (!acc[slot.day]) acc[slot.day] = {}
    const time = `${slot.start_time}-${slot.end_time}`
    if (!acc[slot.day][time]) acc[slot.day][time] = []
    acc[slot.day][time].push(slot)
    return acc
  }, {} as Record<string, Record<string, Slot[]>>)
  
  const uniqueTimes = [...new Set(slotsList.map(s => `${s.start_time}-${s.end_time}`))].sort()
  const uniqueCodes = [...new Set(slotsList.map(s => s.code))].sort()
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const
  
  const toggleSlot = (slotId: string) => {
    const newSelected = new Set(selectedSlots)
    if (newSelected.has(slotId)) {
      newSelected.delete(slotId)
    } else {
      newSelected.add(slotId)
    }
    setSelectedSlots(newSelected)
  }
  
  const selectBulkDay = (day: string) => {
    setBulkDay(day)
    setBulkCode(null)
    const daySlots = slotsList.filter(s => s.day === day)
    const newSelected = new Set(selectedSlots)
    daySlots.forEach(s => newSelected.add(s.id))
    setSelectedSlots(newSelected)
  }
  
  const deselectBulkDay = (day: string) => {
    setBulkDay(null)
    const daySlots = slotsList.filter(s => s.day === day)
    const newSelected = new Set(selectedSlots)
    daySlots.forEach(s => newSelected.delete(s.id))
    setSelectedSlots(newSelected)
  }
  
  const selectBulkCode = (code: string) => {
    setBulkCode(code)
    setBulkDay(null)
    const codeSlots = slotsList.filter(s => s.code === code)
    const newSelected = new Set(selectedSlots)
    codeSlots.forEach(s => newSelected.add(s.id))
    setSelectedSlots(newSelected)
  }
  
  const deselectBulkCode = (code: string) => {
    setBulkCode(null)
    const codeSlots = slotsList.filter(s => s.code === code)
    const newSelected = new Set(selectedSlots)
    codeSlots.forEach(s => newSelected.delete(s.id))
    setSelectedSlots(newSelected)
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Availability for {teacher.name}</CardTitle>
          <Button onClick={() => saveMutation.mutate()}>
            Save Availability
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-2">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">Select Day:</span>
            {days.map(day => (
              <div key={day} className="flex gap-1">
                <Button
                  size="sm"
                  variant={bulkDay === day ? 'default' : 'outline'}
                  onClick={() => selectBulkDay(day)}
                >
                  {day}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deselectBulkDay(day)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm font-medium">Select Code:</span>
            {uniqueCodes.map(code => (
              <div key={code} className="flex gap-1">
                <Button
                  size="sm"
                  variant={bulkCode === code ? 'default' : 'outline'}
                  onClick={() => selectBulkCode(code)}
                >
                  {code}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deselectBulkCode(code)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 text-left">Time</th>
                {days.map(day => (
                  <th key={day} className="border p-2 text-center">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueTimes.map(time => (
                <tr key={time}>
                  <td className="border p-2 font-mono text-sm">{time}</td>
                  {days.map(day => {
                    const slotsAtTime = groupedSlots[day]?.[time] || []
                    return (
                      <td key={day} className="border p-2">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {slotsAtTime.map(slot => (
                            <label
                              key={slot.id}
                              className="flex items-center cursor-pointer"
                            >
                              <Checkbox
                                checked={selectedSlots.has(slot.id)}
                                onCheckedChange={() => toggleSlot(slot.id)}
                                className="mr-1"
                              />
                              <Badge
                                variant={slot.is_lab ? 'default' : 'outline'}
                                className="text-xs"
                              >
                                {slot.code}{slot.occ}
                              </Badge>
                            </label>
                          ))}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <p>Selected: {selectedSlots.size} slots</p>
          <p>Preferences: 
            {teacher.prefs.avoid_8am && ' No 8AM,'}
            {teacher.prefs.avoid_late && ' No Late,'}
            {teacher.prefs.prefer_days?.length > 0 && ` Prefers: ${teacher.prefs.prefer_days.join(', ')}`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}