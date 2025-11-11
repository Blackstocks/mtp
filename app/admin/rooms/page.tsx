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
    const tags = (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean)
    
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
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Rooms</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingRoom(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code">Room Code</Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={editingRoom?.code}
                  placeholder="NC241"
                  required
                />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  defaultValue={editingRoom?.capacity || 60}
                  required
                />
              </div>
              <div>
                <Label htmlFor="kind">Type</Label>
                <Select name="kind" defaultValue={editingRoom?.kind || 'CLASS'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLASS">Classroom</SelectItem>
                    <SelectItem value="LAB">Laboratory</SelectItem>
                    <SelectItem value="DRAWING">Drawing Hall</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  name="tags"
                  defaultValue={editingRoom?.tags.join(', ')}
                  placeholder="Projector, AC, PC"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRoom ? 'Update' : 'Create'}
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
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roomsList.map(room => (
                <TableRow key={room.id}>
                  <TableCell className="font-mono">{room.code}</TableCell>
                  <TableCell>
                    <Badge variant={room.kind === 'LAB' ? 'default' : 'secondary'}>
                      {room.kind}
                    </Badge>
                  </TableCell>
                  <TableCell>{room.capacity}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {room.tags.map(tag => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingRoom(room)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(room.id)}
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