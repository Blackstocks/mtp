'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rooms, supabase } from '@/lib/db'
import { Room } from '@/types/db'
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

export default function RoomsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const { data: roomsList = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: rooms.list
  })
  
  const createMutation = useMutation({
    mutationFn: async (data: Omit<Room, 'id'>) => {
      const { data: room, error } = await supabase
        .from('room')
        .insert(data)
        .select()
        .single()
      if (error) throw error
      return room
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setIsDialogOpen(false)
      toast({ title: 'Room created successfully' })
    }
  })
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Room> }) => {
      const { error } = await supabase
        .from('room')
        .update(data)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setEditingRoom(null)
      setIsDialogOpen(false)
      toast({ title: 'Room updated successfully' })
    }
  })
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('room')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      toast({ title: 'Room deleted successfully' })
    }
  })
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const tagsInput = formData.get('tags') as string
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : []
    
    const data = {
      code: formData.get('code') as string,
      capacity: parseInt(formData.get('capacity') as string),
      kind: formData.get('kind') as Room['kind'],
      tags
    }
    
    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, data })
    } else {
      createMutation.mutate(data)
    }
  }
  
  return (
    <div className="container mx-auto p-2 md:p-3 lg:p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Rooms</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditingRoom(null)} className="bg-black text-white hover:bg-gray-800">
              <Plus className="mr-1 h-3 w-3" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg">
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code" className="text-sm">Room Code</Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={editingRoom?.code}
                  placeholder="NC241"
                  required
                />
              </div>
              <div>
                <Label htmlFor="capacity" className="text-sm">Capacity</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  defaultValue={editingRoom?.capacity || 60}
                  required
                />
              </div>
              <div>
                <Label htmlFor="kind" className="text-sm">Type</Label>
                <Select name="kind" defaultValue={editingRoom?.kind || 'CLASS'}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLASS" className="text-xs">Classroom</SelectItem>
                    <SelectItem value="LAB" className="text-xs">Laboratory</SelectItem>
                    <SelectItem value="DRAWING" className="text-xs">Drawing Hall</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tags" className="text-sm">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  name="tags"
                  defaultValue={editingRoom?.tags?.join(', ') || ''}
                  placeholder="Projector, AC, PC"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="bg-black text-white hover:bg-gray-800">
                  {editingRoom ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Capacity</TableHead>
                <TableHead className="text-xs">Tags</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roomsList.map(room => (
                <TableRow key={room.id}>
                  <TableCell className="font-mono text-xs">{room.code}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs border-gray-300">
                      {room.kind}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{room.capacity}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(room.tags || []).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs border-gray-300">{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hover:bg-gray-100"
                        onClick={() => {
                          setEditingRoom(room)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hover:bg-gray-100"
                        onClick={() => deleteMutation.mutate(room.id)}
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