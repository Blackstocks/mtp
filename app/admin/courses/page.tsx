'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/db'
import { Course } from '@/types/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function CoursesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const { data: coursesList = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course')
        .select('*')
        .order('code')
      if (error) throw error
      return data as Course[]
    }
  })
  
  const createMutation = useMutation({
    mutationFn: async (data: Omit<Course, 'id'>) => {
      const { data: course, error } = await supabase
        .from('course')
        .insert(data)
        .select()
        .single()
      if (error) throw error
      return course
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      setIsDialogOpen(false)
      toast({ title: 'Course created successfully' })
    }
  })
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Course> }) => {
      const { error } = await supabase
        .from('course')
        .update(data)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      setEditingCourse(null)
      setIsDialogOpen(false)
      toast({ title: 'Course updated successfully' })
    }
  })
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('course')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      toast({ title: 'Course deleted successfully' })
    }
  })
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const data = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      L: parseInt(formData.get('L') as string),
      T: parseInt(formData.get('T') as string),
      P: parseInt(formData.get('P') as string)
    }
    
    if (editingCourse) {
      updateMutation.mutate({ id: editingCourse.id, data })
    } else {
      createMutation.mutate(data)
    }
  }
  
  const getTotalHours = (course: Course) => course.L + course.T + course.P
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Courses</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCourse(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code">Course Code</Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={editingCourse?.code}
                  placeholder="CS101"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Course Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingCourse?.name}
                  placeholder="Introduction to Programming"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="L">Lecture Hours (L)</Label>
                  <Input
                    id="L"
                    name="L"
                    type="number"
                    min="0"
                    defaultValue={editingCourse?.L || 3}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="T">Tutorial Hours (T)</Label>
                  <Input
                    id="T"
                    name="T"
                    type="number"
                    min="0"
                    defaultValue={editingCourse?.T || 0}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="P">Practical Hours (P)</Label>
                  <Input
                    id="P"
                    name="P"
                    type="number"
                    min="0"
                    defaultValue={editingCourse?.P || 0}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCourse ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>L-T-P</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coursesList.map(course => (
                <TableRow key={course.id}>
                  <TableCell className="font-mono">{course.code}</TableCell>
                  <TableCell>{course.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {course.L > 0 && <Badge variant="default">L: {course.L}</Badge>}
                      {course.T > 0 && <Badge variant="secondary">T: {course.T}</Badge>}
                      {course.P > 0 && <Badge variant="outline">P: {course.P}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{getTotalHours(course)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCourse(course)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(course.id)}
                      >
                        <Trash2 className="h-4 w-4" />
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