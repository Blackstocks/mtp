import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, School, Clock } from 'lucide-react'
import { AdminNav } from '@/components/admin-nav'

export default function HomePage() {
  return (
    <>
      <AdminNav />
      <div className="container mx-auto py-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">Timetable Scheduler</h1>
        <p className="text-xl text-muted-foreground">
          Intelligent teacher-centric scheduling for educational institutions
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card className="border border-gray-200">
          <CardHeader>
            <Users className="h-8 w-8 mb-2" />
            <CardTitle>Teacher Management</CardTitle>
            <CardDescription>
              Manage faculty availability and preferences
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="border border-gray-200">
          <CardHeader>
            <School className="h-8 w-8 mb-2" />
            <CardTitle>Course Offerings</CardTitle>
            <CardDescription>
              Define courses with L-T-P structure
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="border border-gray-200">
          <CardHeader>
            <Clock className="h-8 w-8 mb-2" />
            <CardTitle>Smart Scheduling</CardTitle>
            <CardDescription>
              AI-powered constraint optimization
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="border border-gray-200">
          <CardHeader>
            <Calendar className="h-8 w-8 mb-2" />
            <CardTitle>Interactive Timetable</CardTitle>
            <CardDescription>
              Drag & drop with recommendations
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
      
      <div className="text-center">
        <Link href="/admin/teachers">
          <Button size="lg" className="bg-black text-white hover:bg-gray-800">
            Go to Admin Dashboard
          </Button>
        </Link>
      </div>
      
      <Card className="mt-10 border border-gray-200">
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to Teachers to add faculty and set availability</li>
            <li>Create Rooms and define their capacity and type</li>
            <li>Add Courses with lecture, tutorial, and practical hours</li>
            <li>Create Offerings to link courses with sections and teachers</li>
            <li>Configure the Slot Matrix for your weekly schedule</li>
            <li>Generate and optimize your timetable</li>
          </ol>
        </CardContent>
      </Card>
    </div>
    </>
  )
}