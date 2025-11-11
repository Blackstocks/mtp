'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function ImportPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setResults(null)
    
    const formData = new FormData(e.currentTarget)
    
    try {
      const response = await fetch('/api/seed/import', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResults(data.results)
        toast({
          title: 'Import successful',
          description: 'Data has been imported successfully'
        })
      } else {
        toast({
          title: 'Import failed',
          description: data.error,
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: 'Import error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleQuickSeed = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/seed/quick', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResults(data.results)
        toast({
          title: 'Quick seed successful',
          description: 'Sample data has been loaded'
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Seed error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleAerospaceCourses = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/seed/aerospace-courses', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Aerospace courses loaded',
          description: data.message || `${data.courses} aerospace engineering courses added`
        })
        // Log details for debugging
        console.log('Load AE Courses response:', data)
      } else {
        console.error('Load AE Courses error:', data)
        throw new Error(data.error || 'Failed to load courses')
      }
    } catch (error: any) {
      toast({
        title: 'Error loading courses',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleAerospaceTeachers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/seed/aerospace-teachers', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Aerospace teachers & offerings loaded',
          description: `Loaded ${data.stats.teachers} teachers with ${data.stats.offerings} course assignments`
        })
        setResults(data.stats)
      } else {
        throw new Error(data.error || 'Failed to load teachers')
      }
    } catch (error: any) {
      toast({
        title: 'Error loading teachers',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleLoadTimetableData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/seed/load-timetable-data', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Timetable data loaded successfully',
          description: `Loaded ${data.results.teachers} teachers, ${data.results.rooms} rooms, ${data.results.courses} courses, ${data.results.offerings} offerings`
        })
        setResults(data.results)
      } else {
        throw new Error(data.error || 'Failed to load timetable data')
      }
    } catch (error: any) {
      toast({
        title: 'Error loading timetable data',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Data</h1>
        <p className="text-muted-foreground mt-2">
          Import data from CSV files or use quick seed for sample data
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Complete Timetable Data
              <Badge variant="outline" className="text-xs border-gray-300">RECOMMENDED</Badge>
            </CardTitle>
            <CardDescription>
              Load full IIT KGP timetable data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleLoadTimetableData} 
              disabled={loading}
              className="w-full bg-black text-white hover:bg-gray-800"
            >
              <Upload className="mr-2 h-3 w-3" />
              Load Complete Data
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              This will load:
              • 50+ teachers with full names
              • 30+ rooms (classrooms & labs)
              • 70+ courses with proper L-T-P
              • 5 sections (FIRST-1, AE 2-4, PG)
              • 100+ course offerings
              • IIT KGP time slots
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle>Quick Seed</CardTitle>
            <CardDescription>
              Load sample data to quickly test the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleQuickSeed} 
              disabled={loading}
              className="w-full border-gray-300 hover:bg-gray-100"
              variant="outline"
            >
              <Upload className="mr-2 h-3 w-3" />
              Load Sample Data
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              This will load:
              • 3 teachers with availability
              • 5 rooms (classrooms and labs)
              • 5 courses with L-T-P structure
              • 5 sections
              • Sample offerings
              • Default IIT KGP time slots
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle>Aerospace Courses</CardTitle>
            <CardDescription>
              Load IIT KGP Aerospace Engineering courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleAerospaceCourses} 
              disabled={loading}
              className="w-full bg-gray-200 text-black hover:bg-gray-300"
              variant="secondary"
            >
              <Upload className="mr-2 h-3 w-3" />
              Load AE Courses
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              This will load 42 courses including:
              • AE courses (2nd-4th year)
              • Lab courses
              • Core engineering courses
              • PG/Elective courses
              • Interdisciplinary courses
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle>Aerospace Teachers</CardTitle>
            <CardDescription>
              Load IIT KGP Aerospace Department faculty
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleAerospaceTeachers} 
              disabled={loading}
              className="w-full bg-gray-200 text-black hover:bg-gray-300"
              variant="secondary"
            >
              <Upload className="mr-2 h-3 w-3" />
              Load AE Faculty & Assignments
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              This will load:
              • 22 faculty members with full names
              • Create course-teacher assignments
              • Set up offerings for each course
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle>Step 1: Create Sections</CardTitle>
            <CardDescription>
              Create academic sections (Required before offerings)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={async () => {
                setLoading(true)
                try {
                  const response = await fetch('/api/seed/create-sections', { method: 'POST' })
                  const data = await response.json()
                  if (data.success) {
                    toast({
                      title: 'Sections created',
                      description: data.message
                    })
                  } else {
                    throw new Error(data.error)
                  }
                } catch (error: any) {
                  toast({
                    title: 'Error creating sections',
                    description: error.message,
                    variant: 'destructive'
                  })
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              className="w-full bg-black text-white hover:bg-gray-800"
            >
              <Upload className="mr-2 h-3 w-3" />
              Create Sections
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Creates: FIRST-1, AE-2A, AE-3A, AE-4A, AE-PG-1
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle>Step 2: Create Course Offerings</CardTitle>
            <CardDescription>
              Map courses to teachers and sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={async () => {
                setLoading(true)
                try {
                  const response = await fetch('/api/seed/create-offerings', { method: 'POST' })
                  const data = await response.json()
                  if (data.success) {
                    toast({
                      title: 'Offerings created',
                      description: data.message
                    })
                  } else {
                    throw new Error(data.error)
                  }
                } catch (error: any) {
                  toast({
                    title: 'Error creating offerings',
                    description: error.message,
                    variant: 'destructive'
                  })
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              className="w-full bg-gray-200 text-black hover:bg-gray-300"
              variant="secondary"
            >
              <Upload className="mr-2 h-3 w-3" />
              Create Offerings
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Maps courses to teachers and sections based on timetable
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle>Step 3: Set Teacher Availability</CardTitle>
            <CardDescription>
              Make all teachers available for all slots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={async () => {
                setLoading(true)
                try {
                  const response = await fetch('/api/seed/set-teacher-availability', { method: 'POST' })
                  const data = await response.json()
                  if (data.success) {
                    toast({
                      title: 'Availability set',
                      description: data.message
                    })
                  } else {
                    throw new Error(data.error)
                  }
                } catch (error: any) {
                  toast({
                    title: 'Error setting availability',
                    description: error.message,
                    variant: 'destructive'
                  })
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              className="w-full bg-black text-white hover:bg-gray-800"
            >
              <Upload className="mr-2 h-3 w-3" />
              Set Availability
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Makes all teachers available for all time slots
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle>CSV Templates</CardTitle>
            <CardDescription>
              Download templates for bulk data import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full border-gray-300 hover:bg-gray-100" asChild>
              <a href="/seed/teachers.csv" download>
                <Download className="mr-2 h-3 w-3" />
                Teachers Template
              </a>
            </Button>
            <Button variant="outline" className="w-full border-gray-300 hover:bg-gray-100" asChild>
              <a href="/seed/rooms.csv" download>
                <Download className="mr-2 h-3 w-3" />
                Rooms Template
              </a>
            </Button>
            <Button variant="outline" className="w-full border-gray-300 hover:bg-gray-100" asChild>
              <a href="/seed/courses.csv" download>
                <Download className="mr-2 h-3 w-3" />
                Courses Template
              </a>
            </Button>
            <Button variant="outline" className="w-full border-gray-300 hover:bg-gray-100" asChild>
              <a href="/seed/sections.csv" download>
                <Download className="mr-2 h-3 w-3" />
                Sections Template
              </a>
            </Button>
            <Button variant="outline" className="w-full border-gray-300 hover:bg-gray-100" asChild>
              <a href="/seed/offerings.csv" download>
                <Download className="mr-2 h-3 w-3" />
                Offerings Template
              </a>
            </Button>
            <Button variant="outline" className="w-full border-gray-300 hover:bg-gray-100" asChild>
              <a href="/seed/slot_matrix.csv" download>
                <Download className="mr-2 h-3 w-3" />
                Slot Matrix Template
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Import CSV Files</CardTitle>
          <CardDescription>
            Upload your CSV files to import data into the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="teachers">Teachers CSV</Label>
                <Input id="teachers" name="teachers" type="file" accept=".csv" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rooms">Rooms CSV</Label>
                <Input id="rooms" name="rooms" type="file" accept=".csv" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courses">Courses CSV</Label>
                <Input id="courses" name="courses" type="file" accept=".csv" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sections">Sections CSV</Label>
                <Input id="sections" name="sections" type="file" accept=".csv" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offerings">Offerings CSV</Label>
                <Input id="offerings" name="offerings" type="file" accept=".csv" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slots">Slots CSV</Label>
                <Input id="slots" name="slots" type="file" accept=".csv" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-black text-white hover:bg-gray-800">
              <Upload className="mr-2 h-3 w-3" />
              Import Files
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {results && (
        <Alert>
          <CheckCircle className="h-3 w-3" />
          <AlertDescription>
            <div className="font-semibold mb-2">Import Results:</div>
            <ul className="space-y-1">
              {Object.entries(results).map(([key, value]) => (
                <li key={key}>
                  {key}: {value} records imported
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}