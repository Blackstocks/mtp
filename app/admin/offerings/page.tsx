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
    <div className="container mx-auto p-2 md:p-3 lg:p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Course Offerings</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-black text-white hover:bg-gray-800">
              <Plus className="mr-1 h-3 w-3" />
              Add Offering
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg">Add New Offering</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="course_id" className="text-sm">Course</Label>
                <Select name="course_id" required>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id} className="text-xs">
                        {course.code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="section_id" className="text-sm">Section</Label>
                <Select name="section_id" required>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map(section => (
                      <SelectItem key={section.id} value={section.id} className="text-xs">
                        {section.name} ({section.program} Year {section.year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="teacher_id" className="text-sm">Teacher</Label>
                <Select name="teacher_id">
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">None</SelectItem>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id} className="text-xs">
                        {teacher.name} ({teacher.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expected_size" className="text-sm">Expected Size</Label>
                <Input
                  id="expected_size"
                  name="expected_size"
                  type="number"
                  defaultValue="60"
                  required
                />
              </div>
              <div>
                <Label htmlFor="needs" className="text-sm">Requirements (comma-separated)</Label>
                <Input
                  id="needs"
                  name="needs"
                  placeholder="PC, Projector"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="bg-black text-white hover:bg-gray-800">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {Object.entries(groupedOfferings).map(([group, offerings]) => (
        <Card key={group} className="mb-4 border border-gray-200">
          <CardContent className="p-2">
            <h2 className="text-base font-semibold mb-3">{group}</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Course</TableHead>
                  <TableHead className="text-xs">Section</TableHead>
                  <TableHead className="text-xs">Teacher</TableHead>
                  <TableHead className="text-xs">Size</TableHead>
                  <TableHead className="text-xs">Requirements</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offerings.map(offering => (
                  <TableRow key={offering.id}>
                    <TableCell>
                      <div>
                        <span className="font-mono text-xs">{offering.course?.code}</span>
                        <div className="text-xs text-gray-500">{offering.course?.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{offering.section?.name}</TableCell>
                    <TableCell>
                      {offering.teacher ? (
                        <div>
                          <div className="text-xs">{offering.teacher.name}</div>
                          <div className="text-xs text-gray-500">{offering.teacher.code}</div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs border-gray-300">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{offering.expected_size}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {offering.needs.map(need => (
                          <Badge key={need} variant="outline" className="text-xs border-gray-300">{need}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hover:bg-gray-100"
                        onClick={() => deleteMutation.mutate(offering.id)}
                      >
                        <Trash2 className="h-3 w-3" />
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