'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/db'
import { offeringsFixed } from '@/lib/db-fixed'
import { OfferingWithRelations } from '@/types/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function OfferingsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const { data: offeringsList = [] } = useQuery({
    queryKey: ['offerings'],
    queryFn: offeringsFixed.list
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
  
  const { data: courses = [] } = useQuery({
    queryKey: ['courses-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course')
        .select('id, code, name')
        .order('code')
      if (error) throw error
      return data
    }
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
  
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: offering, error } = await supabase
        .from('offering')
        .insert(data)
        .select()
        .single()
      if (error) throw error
      return offering
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offerings'] })
      setIsDialogOpen(false)
      toast({ title: 'Offering created successfully' })
    }
  })
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('offering')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offerings'] })
      toast({ title: 'Offering deleted successfully' })
    }
  })
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const needs = (formData.get('needs') as string).split(',').map(n => n.trim()).filter(Boolean)
    
    const teacherId = formData.get('teacher_id') as string
    const data = {
      course_id: formData.get('course_id') as string,
      section_id: formData.get('section_id') as string,
      teacher_id: teacherId === 'none' ? null : teacherId,
      expected_size: parseInt(formData.get('expected_size') as string),
      needs
    }
    
    createMutation.mutate(data)
  }
  
  const groupedOfferings = offeringsList.reduce((acc, offering) => {
    const key = `${offering.section?.program}-${offering.section?.year}`
    if (!acc[key]) acc[key] = []
    acc[key].push(offering)
    return acc
  }, {} as Record<string, OfferingWithRelations[]>)
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Course Offerings</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Offering
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Offering</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="course_id">Course</Label>
                <Select name="course_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="section_id">Section</Label>
                <Select name="section_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map(section => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name} ({section.program} Year {section.year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="teacher_id">Teacher</Label>
                <Select name="teacher_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expected_size">Expected Size</Label>
                <Input
                  id="expected_size"
                  name="expected_size"
                  type="number"
                  defaultValue="60"
                  required
                />
              </div>
              <div>
                <Label htmlFor="needs">Requirements (comma-separated)</Label>
                <Input
                  id="needs"
                  name="needs"
                  placeholder="PC, Projector"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {Object.entries(groupedOfferings).map(([group, offerings]) => (
        <Card key={group} className="mb-6">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4">{group}</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Requirements</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offerings.map(offering => (
                  <TableRow key={offering.id}>
                    <TableCell>
                      <div>
                        <span className="font-mono">{offering.course?.code}</span>
                        <div className="text-sm text-gray-500">{offering.course?.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>{offering.section?.name}</TableCell>
                    <TableCell>
                      {offering.teacher ? (
                        <div>
                          <div>{offering.teacher.name}</div>
                          <div className="text-sm text-gray-500">{offering.teacher.code}</div>
                        </div>
                      ) : (
                        <Badge variant="outline">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>{offering.expected_size}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {offering.needs.map(need => (
                          <Badge key={need} variant="secondary">{need}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(offering.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}