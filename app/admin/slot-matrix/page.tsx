'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { slots, supabase } from '@/lib/db'
import { Slot } from '@/types/db'
import { formatSlotDisplay } from '@/lib/slot-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const

export default function SlotMatrixPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<typeof DAYS[number]>('MON')
  
  const { data: slotsList = [] } = useQuery({
    queryKey: ['slots'],
    queryFn: slots.list
  })
  
  const createMutation = useMutation({
    mutationFn: async (data: Omit<Slot, 'id'>) => {
      const { data: slot, error } = await supabase
        .from('slot')
        .insert(data)
        .select()
        .single()
      if (error) throw error
      return slot
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] })
      setIsDialogOpen(false)
      toast({ title: 'Slot created successfully' })
    }
  })
  
  const loadDefaultGrid = async () => {
    if (!confirm('This will replace all existing slots. Continue?')) return
    
    try {
      // Clear existing slots
      await supabase.from('slot').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      
      // Create IIT KGP style grid
      const defaultSlots = []
      const codes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
      const labCodes = ['J', 'K', 'L', 'M', 'N', 'P']
      const timings = [
        { start: '08:00', end: '08:55' },
        { start: '09:00', end: '09:55' },
        { start: '10:00', end: '10:55' },
        { start: '11:00', end: '11:55' },
        { start: '14:00', end: '14:55' },
        { start: '15:00', end: '15:55' },
        { start: '16:00', end: '16:55' },
        { start: '17:00', end: '17:55' }
      ]
      
      // Regular slots
      DAYS.forEach((day, dayIdx) => {
        codes.forEach((code, codeIdx) => {
          if (codeIdx < 4) {
            // Morning slots
            defaultSlots.push({
              code,
              occ: dayIdx + 1,
              day,
              start_time: timings[codeIdx].start,
              end_time: timings[codeIdx].end,
              cluster: null,
              is_lab: false
            })
          } else {
            // Afternoon slots
            defaultSlots.push({
              code,
              occ: dayIdx + 1,
              day,
              start_time: timings[codeIdx].start,
              end_time: timings[codeIdx].end,
              cluster: null,
              is_lab: false
            })
          }
        })
      })
      
      // Lab slots (Wed and Thu afternoons)
      const labSlots = [
        { day: 'WED' as const, cluster: 'LAB_J', code: 'J' },
        { day: 'THU' as const, cluster: 'LAB_M', code: 'M' }
      ]
      
      labSlots.forEach(({ day, cluster, code }) => {
        for (let i = 0; i < 3; i++) {
          defaultSlots.push({
            code,
            occ: i + 1,
            day,
            start_time: timings[4 + i].start,
            end_time: timings[4 + i].end,
            cluster,
            is_lab: true
          })
        }
      })
      
      const { error } = await supabase.from('slot').insert(defaultSlots)
      if (error) throw error
      
      queryClient.invalidateQueries({ queryKey: ['slots'] })
      toast({ title: 'Default IIT KGP grid loaded successfully' })
    } catch (error: any) {
      toast({ title: 'Error loading default grid', description: error.message, variant: 'destructive' })
    }
  }
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const data = {
      code: formData.get('code') as string,
      occ: parseInt(formData.get('occ') as string),
      day: formData.get('day') as Slot['day'],
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
      cluster: formData.get('cluster') as string || null,
      is_lab: formData.get('is_lab') === 'on'
    }
    
    createMutation.mutate(data)
  }
  
  const groupedSlots = slotsList.reduce((acc, slot) => {
    if (!acc[slot.day]) acc[slot.day] = []
    acc[slot.day].push(slot)
    return acc
  }, {} as Record<string, Slot[]>)
  
  const clusters = [...new Set(slotsList.filter(s => s.cluster).map(s => s.cluster))]
  
  return (
    <div className="container mx-auto p-2 md:p-3 lg:p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Slot Matrix</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadDefaultGrid} className="border-gray-300 hover:bg-gray-100">
            Load Default IIT KGP Grid
          </Button>
          <Button size="sm" onClick={() => setIsDialogOpen(true)} className="bg-black text-white hover:bg-gray-800">
            <Plus className="mr-1 h-3 w-3" />
            Add Slot
          </Button>
        </div>
      </div>
      
      <Tabs value={selectedDay} onValueChange={(v) => setSelectedDay(v as typeof DAYS[number])}>
        <TabsList className="mb-3 h-8">
          {DAYS.map(day => (
            <TabsTrigger key={day} value={day} className="text-xs data-[state=active]:bg-black data-[state=active]:text-white">
              {day}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {DAYS.map(day => (
          <TabsContent key={day} value={day}>
            <Card className="border border-gray-200">
              <CardHeader className="p-2">
                <CardTitle className="text-base">{day} Schedule</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Slot Code</TableHead>
                      <TableHead className="text-xs">Time</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Cluster</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedSlots[day]?.sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map(slot => (
                        <TableRow key={slot.id}>
                          <TableCell className="font-mono text-xs">
                            {formatSlotDisplay(slot)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              {slot.start_time} - {slot.end_time}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs border-gray-300">
                              {slot.is_lab ? 'LAB' : 'LECTURE'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {slot.cluster && (
                              <Badge variant="outline" className="text-xs border-gray-300">{slot.cluster}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg">Add New Slot</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code" className="text-sm">Code</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="A"
                  required
                />
              </div>
              <div>
                <Label htmlFor="occ" className="text-sm">Occurrence</Label>
                <Input
                  id="occ"
                  name="occ"
                  type="number"
                  placeholder="1"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="day" className="text-sm">Day</Label>
              <Select name="day" defaultValue="MON">
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map(day => (
                    <SelectItem key={day} value={day} className="text-xs">{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time" className="text-sm">Start Time</Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="time"
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_time" className="text-sm">End Time</Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="time"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cluster" className="text-sm">Cluster (for labs)</Label>
              <Input
                id="cluster"
                name="cluster"
                placeholder="LAB_J"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="is_lab" name="is_lab" />
              <Label htmlFor="is_lab" className="text-sm">Is Lab Slot</Label>
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
  )
}