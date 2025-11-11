'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teachers } from '@/lib/db'
import { Teacher } from '@/types/db'
import { teacherSchema } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import { slots } from '@/lib/db'

export default function TeachersPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const { data: teachersList = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: teachers.list
  })
  
  const createMutation = useMutation({
    mutationFn: (data: Omit<Teacher, 'id'>) => teachers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      setIsDialogOpen(false)
      toast({ title: 'Teacher created successfully' })
    }
  })
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Teacher> }) => 
      teachers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      setEditingTeacher(null)
      toast({ title: 'Teacher updated successfully' })
    }
  })
  
  const deleteMutation = useMutation({
    mutationFn: teachers.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      toast({ title: 'Teacher deleted successfully' })
    }
  })
  
  const [avoid8am, setAvoid8am] = useState(false)
  const [avoidLate, setAvoidLate] = useState(false)
  const [preferredDays, setPreferredDays] = useState<string[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  
  const { data: slotsList = [] } = useQuery({
    queryKey: ['slots'],
    queryFn: slots.list
  })
  
  // Get unique time slots
  const uniqueTimeSlots = [...new Set(slotsList.map(s => `${s.start_time}-${s.end_time}`))].sort()
  
  useEffect(() => {
    if (editingTeacher) {
      setAvoid8am(editingTeacher.prefs.avoid_8am || false)
      setAvoidLate(editingTeacher.prefs.avoid_late || false)
      setPreferredDays(editingTeacher.prefs.prefer_days || [])
      setAvailableSlots(editingTeacher.prefs.available_slots || [])
    } else {
      setAvoid8am(false)
      setAvoidLate(false)
      setPreferredDays([])
      setAvailableSlots([])
    }
  }, [editingTeacher])
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      max_per_day: parseInt(formData.get('max_per_day') as string),
      max_per_week: parseInt(formData.get('max_per_week') as string),
      prefs: {
        avoid_8am: avoid8am,
        avoid_late: avoidLate,
        prefer_days: preferredDays,
        available_slots: availableSlots
      }
    }
    
    if (editingTeacher) {
      updateMutation.mutate({ id: editingTeacher.id, data })
    } else {
      createMutation.mutate(data)
    }
  }
  
  return (
    <div className="container mx-auto p-2 md:p-3 lg:p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Teachers</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => {
              setEditingTeacher(null)
              setAvoid8am(false)
              setAvoidLate(false)
              setPreferredDays([])
              setAvailableSlots([])
            }}>
              <Plus className="mr-2 h-3 w-3" />
              Add Teacher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code" className="text-sm">Code</Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={editingTeacher?.code}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name" className="text-sm">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingTeacher?.name}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_per_day" className="text-sm">Max Classes/Day</Label>
                  <Input
                    id="max_per_day"
                    name="max_per_day"
                    type="number"
                    defaultValue={editingTeacher?.max_per_day || 3}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="max_per_week" className="text-sm">Max Classes/Week</Label>
                  <Input
                    id="max_per_week"
                    name="max_per_week"
                    type="number"
                    defaultValue={editingTeacher?.max_per_week || 12}
                    required
                  />
                </div>
              </div>
              <div className="space-y-4">
                <Label className="text-sm">Preferences</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="avoid8am"
                      checked={avoid8am}
                      onCheckedChange={(checked) => setAvoid8am(checked as boolean)}
                    />
                    <Label htmlFor="avoid8am" className="font-normal text-xs">
                      Avoid 8 AM classes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="avoidLate"
                      checked={avoidLate}
                      onCheckedChange={(checked) => setAvoidLate(checked as boolean)}
                    />
                    <Label htmlFor="avoidLate" className="font-normal text-xs">
                      Avoid late evening classes (after 5 PM)
                    </Label>
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Preferred Days</Label>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {['MON', 'TUE', 'WED', 'THU', 'FRI'].map(day => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={day}
                          checked={preferredDays.includes(day)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPreferredDays([...preferredDays, day])
                            } else {
                              setPreferredDays(preferredDays.filter(d => d !== day))
                            }
                          }}
                        />
                        <Label htmlFor={day} className="font-normal text-xs">
                          {day}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Available Time Slots</Label>
                  <div className="space-y-2 mt-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {uniqueTimeSlots.map(timeSlot => (
                      <div key={timeSlot} className="flex items-center space-x-2">
                        <Checkbox
                          id={timeSlot}
                          checked={availableSlots.includes(timeSlot)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAvailableSlots([...availableSlots, timeSlot])
                            } else {
                              setAvailableSlots(availableSlots.filter(t => t !== timeSlot))
                            }
                          }}
                        />
                        <Label htmlFor={timeSlot} className="font-normal text-xs">
                          {timeSlot}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {availableSlots.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      No time slots selected - teacher will be considered available for all slots
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="bg-black text-white hover:bg-gray-800">
                  {editingTeacher ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Max/Day</TableHead>
                <TableHead className="text-xs">Max/Week</TableHead>
                <TableHead className="text-xs">Preferences</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachersList.map(teacher => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-mono text-xs">{teacher.code}</TableCell>
                  <TableCell className="text-xs">{teacher.name}</TableCell>
                  <TableCell className="text-xs">{teacher.max_per_day}</TableCell>
                  <TableCell className="text-xs">{teacher.max_per_week}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {teacher.prefs.avoid_8am && <Badge variant="secondary" className="text-xs">No 8AM</Badge>}
                      {teacher.prefs.avoid_late && <Badge variant="secondary" className="text-xs">No Late</Badge>}
                      {teacher.prefs.prefer_days?.map(day => (
                        <Badge key={day} variant="outline" className="text-xs">{day}</Badge>
                      ))}
                      {teacher.prefs.available_slots?.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {teacher.prefs.available_slots.length} time slots
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingTeacher(teacher)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(teacher.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}