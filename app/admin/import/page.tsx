'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, CheckCircle, AlertCircle, Download, FileText, Info } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { AdminNav } from '@/components/admin-nav'

export default function ImportPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [errors, setErrors] = useState<string[]>([])
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setResults(null)
    setErrors([])
    
    const formData = new FormData(e.currentTarget)
    
    try {
      const response = await fetch('/api/import', {
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
        setErrors(data.errors || [data.error])
        toast({
          title: 'Import failed',
          description: data.error || 'Some files failed to import',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      setErrors([error.message])
      toast({
        title: 'Import error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <>
      <AdminNav />
      <div className="container mx-auto py-10">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Import Data</h1>
            <p className="text-muted-foreground mt-2">
              Import your timetable data from CSV files
            </p>
          </div>
          
          {/* Instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Import Instructions</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>Follow these steps to import your data:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Download the CSV templates below</li>
                <li>Fill in your data following the template format</li>
                <li>Import files in order: Teachers → Rooms → Courses → Sections → Offerings → Slots</li>
                <li>Ensure all foreign key references (emails, codes, names) match exactly</li>
              </ol>
            </AlertDescription>
          </Alert>
          
          {/* CSV Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                CSV Templates
              </CardTitle>
              <CardDescription>
                Download these templates and fill them with your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Button variant="outline" className="justify-start" asChild>
                  <a href="/templates/teachers.csv" download>
                    <Download className="mr-2 h-4 w-4" />
                    Teachers Template
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a href="/templates/rooms.csv" download>
                    <Download className="mr-2 h-4 w-4" />
                    Rooms Template
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a href="/templates/courses.csv" download>
                    <Download className="mr-2 h-4 w-4" />
                    Courses Template
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a href="/templates/sections.csv" download>
                    <Download className="mr-2 h-4 w-4" />
                    Sections Template
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a href="/templates/offerings.csv" download>
                    <Download className="mr-2 h-4 w-4" />
                    Offerings Template
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a href="/templates/slots.csv" download>
                    <Download className="mr-2 h-4 w-4" />
                    Slots Template
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Import Form */}
          <Card>
            <CardHeader>
              <CardTitle>Import CSV Files</CardTitle>
              <CardDescription>
                Upload your filled CSV files to import data into the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="teachers">
                      Teachers CSV
                      <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                    </Label>
                    <Input 
                      id="teachers" 
                      name="teachers" 
                      type="file" 
                      accept=".csv"
                      required
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Faculty members with teaching constraints
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="rooms">
                      Rooms CSV
                      <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                    </Label>
                    <Input 
                      id="rooms" 
                      name="rooms" 
                      type="file" 
                      accept=".csv"
                      required
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Classrooms and labs with capacity
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="courses">
                      Courses CSV
                      <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                    </Label>
                    <Input 
                      id="courses" 
                      name="courses" 
                      type="file" 
                      accept=".csv"
                      required
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Courses with L-T-P structure
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sections">
                      Sections CSV
                      <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                    </Label>
                    <Input 
                      id="sections" 
                      name="sections" 
                      type="file" 
                      accept=".csv"
                      required
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Student sections by program and year
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="offerings">
                      Offerings CSV
                      <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                    </Label>
                    <Input 
                      id="offerings" 
                      name="offerings" 
                      type="file" 
                      accept=".csv"
                      required
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maps courses to teachers and sections
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="slots">
                      Slots CSV
                      <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                    </Label>
                    <Input 
                      id="slots" 
                      name="slots" 
                      type="file" 
                      accept=".csv"
                      required
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Weekly time slots (fixed institutional schedule)
                    </p>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full"
                  size="lg"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {loading ? 'Importing...' : 'Import All Files'}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {/* Field Descriptions */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CSV Field Descriptions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm">Teachers CSV</h4>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>• <code>name</code>: Full name of the teacher</li>
                    <li>• <code>email</code>: Unique email address (used as reference)</li>
                    <li>• <code>designation</code>: Job title (Professor, Associate Professor, etc.)</li>
                    <li>• <code>max_hours_per_day</code>: Maximum teaching hours per day</li>
                    <li>• <code>max_hours_per_week</code>: Maximum teaching hours per week</li>
                    <li>• <code>avoid_early_morning</code>: true/false for 8 AM slot preference</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm">Courses CSV</h4>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>• <code>code</code>: Unique course code (e.g., CS101)</li>
                    <li>• <code>name</code>: Full course name</li>
                    <li>• <code>L</code>: Lecture hours per week</li>
                    <li>• <code>T</code>: Tutorial hours per week</li>
                    <li>• <code>P</code>: Practical/Lab hours per week (3-hour blocks)</li>
                    <li>• <code>credits</code>: Course credits</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm">Rooms CSV</h4>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>• <code>code</code>: Unique room identifier</li>
                    <li>• <code>capacity</code>: Maximum student capacity</li>
                    <li>• <code>kind</code>: classroom/lab/tutorial</li>
                    <li>• <code>tags</code>: Features separated by semicolon (projector;ac;whiteboard)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">More Field Descriptions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm">Sections CSV</h4>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>• <code>name</code>: Section identifier (e.g., CSE-1A)</li>
                    <li>• <code>program</code>: Department/Program name</li>
                    <li>• <code>year</code>: Academic year (1, 2, 3, or 4)</li>
                    <li>• <code>student_count</code>: Number of students in section</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm">Offerings CSV</h4>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>• <code>course_code</code>: References code from courses.csv</li>
                    <li>• <code>section_name</code>: References name from sections.csv</li>
                    <li>• <code>teacher_email</code>: References email from teachers.csv</li>
                    <li>• <code>needs</code>: Special requirements (projector;lab_equipment)</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm">Slots CSV</h4>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>• <code>day</code>: MON/TUE/WED/THU/FRI</li>
                    <li>• <code>start_time</code>: 24-hour format (HH:MM:SS)</li>
                    <li>• <code>end_time</code>: 24-hour format (HH:MM:SS)</li>
                    <li>• <code>is_lab</code>: true for 3-hour lab slots, false for theory</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Results */}
          {results && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Import Successful</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  {Object.entries(results).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="capitalize">{key}:</span>
                      <Badge variant="secondary">{value} records imported</Badge>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import Errors</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  {errors.map((error, idx) => (
                    <li key={idx} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </>
  )
}