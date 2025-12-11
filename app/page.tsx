'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, School, Clock, CheckCircle2, TrendingUp, GraduationCap, BookOpen, LayoutDashboard, Info, BarChart3, AlertCircle, Lightbulb } from 'lucide-react'
import { AdminNav } from '@/components/admin-nav'
import { supabase } from '@/lib/db'
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { motion } from 'framer-motion'

export default function HomePage() {
  const [analytics, setAnalytics] = useState({
    teachers: 0,
    courses: 0,
    offerings: 0,
    rooms: 0,
    assignments: 0,
    sections: 0,
    slots: 0
  })
  const [assignmentDetails, setAssignmentDetails] = useState({
    lectures: 0,
    tutorials: 0,
    practicals: 0,
    utilizationRate: 0,
    totalRequired: 0,
    failedAssignments: 0
  })
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const [teachersData, coursesData, offeringsData, roomsData, assignmentsData, sectionsData, slotsData] = await Promise.all([
        supabase.from('teacher').select('*', { count: 'exact', head: true }),
        supabase.from('course').select('*', { count: 'exact', head: true }),
        supabase.from('offering').select('*', { count: 'exact', head: true }),
        supabase.from('room').select('*', { count: 'exact', head: true }),
        supabase.from('assignment').select('*', { count: 'exact', head: true }),
        supabase.from('section').select('*', { count: 'exact', head: true }),
        supabase.from('slot').select('*', { count: 'exact', head: true })
      ])

      setAnalytics({
        teachers: teachersData.count || 0,
        courses: coursesData.count || 0,
        offerings: offeringsData.count || 0,
        rooms: roomsData.count || 0,
        assignments: assignmentsData.count || 0,
        sections: sectionsData.count || 0,
        slots: slotsData.count || 0
      })

      // Always fetch assignment details to show proper statistics
      // Get assignment breakdown by type
      const { data: assignments } = await supabase
        .from('assignment')
        .select('kind')
      
      const breakdown = { L: 0, T: 0, P: 0 }
      assignments?.forEach(a => {
        breakdown[a.kind]++
      })

      // Get all offerings with course details using separate queries
      const { data: allOfferings } = await supabase
        .from('offering')
        .select('*')
      
      const { data: allCourses } = await supabase
        .from('course')
        .select('*')
      
      // Create course lookup map
      const courseMap = new Map(allCourses?.map(c => [c.id, c]) || [])
      
      // Enrich offerings with course data
      const offerings = allOfferings?.map(o => ({
        ...o,
        course: courseMap.get(o.course_id)
      })) || []

      // Calculate statistics if there are offerings
      if (offerings.length > 0) {
        
        // Count successful assignments by offering to match conflicts page logic
        const { data: assignmentsByOffering } = await supabase
          .from('assignment')
          .select('offering_id, kind')
        
        // Group assignments by offering
        const offeringAssignments = new Map()
        assignmentsByOffering?.forEach(a => {
          if (!offeringAssignments.has(a.offering_id)) {
            offeringAssignments.set(a.offering_id, { L: 0, T: 0, P: 0 })
          }
          offeringAssignments.get(a.offering_id)[a.kind]++
        })

        // Calculate how many offerings are fully/partially scheduled
        let successfulOfferings = 0
        let failedSlots = 0
        
        offerings?.forEach(offering => {
          if (offering.course) {
            const assigned = offeringAssignments.get(offering.id) || { L: 0, T: 0, P: 0 }
            const required = {
              L: offering.course.L || 0,
              T: offering.course.T || 0,
              P: offering.course.P > 0 ? 1 : 0 // P is counted as 1 requirement (even though it takes 3 hours)
            }
            
            // Check if offering is at least partially scheduled
            if (assigned.L > 0 || assigned.T > 0 || assigned.P > 0) {
              successfulOfferings++
            }
            
            // Count failed slots
            failedSlots += Math.max(0, required.L - assigned.L)
            failedSlots += Math.max(0, required.T - assigned.T)
            failedSlots += Math.max(0, required.P - assigned.P)
          }
        })

        const utilizationRate = offerings?.length > 0 
          ? (successfulOfferings / offerings.length) * 100 
          : 0

        setAssignmentDetails({
          lectures: breakdown.L,
          tutorials: breakdown.T,
          practicals: breakdown.P,
          utilizationRate: Math.round(utilizationRate),
          totalRequired: offerings.length,
          failedAssignments: offerings.length - successfulOfferings
        })
      } else {
        // No offerings, set default values
        setAssignmentDetails({
          lectures: breakdown.L,
          tutorials: breakdown.T,
          practicals: breakdown.P,
          utilizationRate: 0,
          totalRequired: 0,
          failedAssignments: 0
        })
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const chartData = [
    { name: 'Teachers', value: analytics.teachers, color: '#8B5CF6' },
    { name: 'Courses', value: analytics.courses, color: '#10B981' },
    { name: 'Rooms', value: analytics.rooms, color: '#F59E0B' },
    { name: 'Sections', value: analytics.sections, color: '#3B82F6' }
  ]

  const barChartData = [
    { category: 'Offerings', count: analytics.offerings },
    { category: 'Assignments', count: analytics.assignments }
  ]

  const steps = [
    { id: 1, title: 'Add Teachers', description: 'Setup faculty and availability', icon: Users, completed: analytics.teachers > 0 },
    { id: 2, title: 'Add Rooms', description: 'Configure room capacity', icon: School, completed: analytics.rooms > 0 },
    { id: 3, title: 'Create Courses', description: 'Define L-T-P structure', icon: BookOpen, completed: analytics.courses > 0 },
    { id: 4, title: 'Create Offerings', description: 'Link courses with sections', icon: GraduationCap, completed: analytics.offerings > 0 },
    { id: 5, title: 'Configure Slots', description: 'Setup weekly schedule', icon: Clock, completed: analytics.slots > 0 },
    { id: 6, title: 'Generate Timetable', description: 'Create optimized schedule', icon: Calendar, completed: analytics.assignments > 0 }
  ]

  const completedSteps = steps.filter(s => s.completed).length

  return (
    <>
      <AdminNav />
      <div className="container mx-auto py-10">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Timetable Scheduler</h1>
        <p className="text-xl text-muted-foreground">
          Intelligent teacher-centric scheduling for educational institutions
        </p>
      </motion.div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Main Stats */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="border border-gray-200 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                System Analytics
              </CardTitle>
              <CardDescription>Overview of your scheduling system</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-purple-200"
                  >
                    <Users className="h-8 w-8 text-purple-600 mb-2" />
                    <p className="text-2xl font-bold">{analytics.teachers}</p>
                    <p className="text-sm text-muted-foreground">Teachers</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-green-200"
                  >
                    <BookOpen className="h-8 w-8 text-green-600 mb-2" />
                    <p className="text-2xl font-bold">{analytics.courses}</p>
                    <p className="text-sm text-muted-foreground">Courses</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-orange-200"
                  >
                    <School className="h-8 w-8 text-orange-600 mb-2" />
                    <p className="text-2xl font-bold">{analytics.rooms}</p>
                    <p className="text-sm text-muted-foreground">Rooms</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-blue-200"
                  >
                    <GraduationCap className="h-8 w-8 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold">{analytics.sections}</p>
                    <p className="text-sm text-muted-foreground">Sections</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-indigo-200"
                  >
                    <LayoutDashboard className="h-8 w-8 text-indigo-600 mb-2" />
                    <p className="text-2xl font-bold">{analytics.offerings}</p>
                    <p className="text-sm text-muted-foreground">Offerings</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-pink-200"
                  >
                    <Calendar className="h-8 w-8 text-pink-600 mb-2" />
                    <p className="text-2xl font-bold">{analytics.assignments}</p>
                    <p className="text-sm text-muted-foreground">Assignments</p>
                  </motion.div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border border-gray-200 h-full">
            <CardHeader>
              <CardTitle className="text-lg">Resource Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {!loading && (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Progress Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-10"
      >
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Setup Progress</span>
              <span className="text-sm font-normal text-muted-foreground">{completedSteps} of {steps.length} completed</span>
            </CardTitle>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${(completedSteps / steps.length) * 100}%` }}
              ></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ scale: 1.02 }}
                    className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      step.completed 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : step.id === currentStep 
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 bg-white dark:bg-gray-800'
                    }`}
                    onClick={() => setCurrentStep(step.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        step.completed 
                          ? 'bg-green-500 text-white' 
                          : step.id === currentStep
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {step.completed ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{step.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                      </div>
                    </div>
                    {step.id < steps.length && (
                      <div className={`absolute top-1/2 -right-2 w-4 h-0.5 ${
                        step.completed ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <motion.div
          whileHover={{ scale: 1.05, rotate: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="border border-gray-200 hover:border-purple-400 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20">
            <CardHeader>
              <Users className="h-8 w-8 mb-2 text-purple-600" />
              <CardTitle>Teacher Management</CardTitle>
              <CardDescription>
                Manage faculty availability and preferences
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.05, rotate: -1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="border border-gray-200 hover:border-green-400 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900/20">
            <CardHeader>
              <School className="h-8 w-8 mb-2 text-green-600" />
              <CardTitle>Course Offerings</CardTitle>
              <CardDescription>
                Define courses with L-T-P structure
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.05, rotate: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="border border-gray-200 hover:border-blue-400 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20">
            <CardHeader>
              <Clock className="h-8 w-8 mb-2 text-blue-600" />
              <CardTitle>Smart Scheduling</CardTitle>
              <CardDescription>
                AI-powered constraint optimization
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.05, rotate: -1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="border border-gray-200 hover:border-orange-400 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-900/20">
            <CardHeader>
              <Calendar className="h-8 w-8 mb-2 text-orange-600" />
              <CardTitle>Interactive Timetable</CardTitle>
              <CardDescription>
                Drag & drop with recommendations
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </div>
      
      <motion.div 
        className="text-center"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Link href="/admin/teachers">
          <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300">
            <LayoutDashboard className="mr-2 h-5 w-5" />
            Go to Admin Dashboard
          </Button>
        </Link>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="mt-10 border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Quick Start Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {[
                'Navigate to Teachers to add faculty and set availability',
                'Create Rooms and define their capacity and type',
                'Add Courses with lecture, tutorial, and practical hours',
                'Create Offerings to link courses with sections and teachers',
                'Configure the Slot Matrix for your weekly schedule',
                'Generate and optimize your timetable'
              ].map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <span className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">{item}</span>
                </motion.li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </motion.div>

      {/* Comprehensive Guide Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-6 space-y-6"
      >
        {/* Understanding the System */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Understanding the Timetable System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2">What is the L-T-P Structure?</h3>
              <p className="text-sm text-muted-foreground">
                Each course follows the L-T-P (Lecture-Tutorial-Practical) format:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 ml-4">
                <li><strong>L (Lectures):</strong> Traditional classroom teaching sessions (1 hour each)</li>
                <li><strong>T (Tutorials):</strong> Small group problem-solving sessions (1 hour each)</li>
                <li><strong>P (Practicals):</strong> Laboratory sessions (typically 3-hour blocks)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">Time Slots Structure</h3>
              <p className="text-sm text-muted-foreground">
                The timetable follows a fixed institutional slot structure:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 ml-4">
                <li><strong>Theory Slots:</strong> 9 slots per day (8:00 AM - 5:55 PM, 1 hour each)</li>
                <li><strong>Lab Slots:</strong> Specific 3-hour clusters for practicals</li>
                <li><strong>Days:</strong> Monday to Friday (5 days)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">Key Constraints</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground ml-4">
                <li>A teacher can only teach one class at a time</li>
                <li>A room can only host one class at a time</li>
                <li>Students in the same section cannot have overlapping classes</li>
                <li>Lab sessions must be in lab rooms with appropriate equipment</li>
                <li>Teachers have daily and weekly workload limits</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Understanding Your Statistics */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Understanding Your Timetable Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.assignments > 0 && (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2">Current Timetable Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Total Assignments:</strong> {analytics.assignments}</p>
                    <p className="text-muted-foreground">These are successfully scheduled classes</p>
                  </div>
                  <div>
                    <p><strong>Utilization Rate:</strong> {assignmentDetails.utilizationRate}%</p>
                    <p className="text-muted-foreground">Percentage of required slots successfully scheduled</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">
                  <div>
                    <p><strong>Total Offerings:</strong> {assignmentDetails.totalRequired}</p>
                    <p className="text-muted-foreground">Course sections to be scheduled</p>
                  </div>
                  <div>
                    <p><strong>Failed to Schedule:</strong> {assignmentDetails.failedAssignments}</p>
                    <p className="text-muted-foreground">Offerings with missing classes</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-sm mb-2">What the Numbers Mean</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-medium text-purple-600">{analytics.teachers}</span>
                  <span className="text-muted-foreground">Teachers available to teach courses</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-green-600">{analytics.courses}</span>
                  <span className="text-muted-foreground">Unique courses in the system</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-blue-600">{analytics.offerings}</span>
                  <span className="text-muted-foreground">Course instances (course + section + teacher combinations)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-orange-600">{analytics.rooms}</span>
                  <span className="text-muted-foreground">Available rooms (classrooms + labs)</span>
                </div>
              </div>
            </div>

            {analytics.assignments > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Current Assignment Breakdown</h3>
                <p className="text-sm text-muted-foreground">
                  Your timetable with {analytics.assignments} assignments includes:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 ml-4">
                  {assignmentDetails.lectures > 0 && (
                    <li><strong>{assignmentDetails.lectures} Lectures:</strong> Regular classroom sessions</li>
                  )}
                  {assignmentDetails.practicals > 0 && (
                    <li><strong>{assignmentDetails.practicals} Practicals:</strong> Lab sessions in 3-hour blocks</li>
                  )}
                  {assignmentDetails.tutorials > 0 && (
                    <li><strong>{assignmentDetails.tutorials} Tutorials:</strong> Small group sessions</li>
                  )}
                </ul>
                
                {assignmentDetails.utilizationRate < 100 && assignmentDetails.failedAssignments > 0 && (
                  <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md">
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      <strong>Note:</strong> {assignmentDetails.failedAssignments} offerings have incomplete schedules. 
                      Check the <Link href="/admin/conflicts" className="underline font-medium">Conflicts page</Link> to see which classes are missing and why.
                    </p>
                  </div>
                )}
              </div>
            )}

            {analytics.assignments === 0 && analytics.offerings > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Ready to generate:</strong> You have {analytics.offerings} course offerings configured. 
                  Go to the <Link href="/admin/timetable" className="underline font-medium">Timetable page</Link> and click "Generate" to create your schedule.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Common Issues and Solutions */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Common Issues and Solutions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="border-l-4 border-orange-400 pl-4">
                <h4 className="font-semibold text-sm">Blank Timetable After Generation</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Solution:</strong> Select "All Sections" or a specific section/teacher from the dropdown to view the schedule.
                </p>
              </div>

              <div className="border-l-4 border-orange-400 pl-4">
                <h4 className="font-semibold text-sm">Some Courses Not Scheduled</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Solution:</strong> Check the Conflicts page to see why certain offerings failed. Common reasons:
                </p>
                <ul className="list-disc list-inside text-xs text-muted-foreground mt-1 ml-4">
                  <li>No teacher assigned to the offering</li>
                  <li>Teacher workload limits exceeded</li>
                  <li>No suitable rooms available</li>
                  <li>Time slot conflicts</li>
                </ul>
              </div>

              <div className="border-l-4 border-orange-400 pl-4">
                <h4 className="font-semibold text-sm">Low Utilization Rate</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Solution:</strong> This usually means you need more resources:
                </p>
                <ul className="list-disc list-inside text-xs text-muted-foreground mt-1 ml-4">
                  <li>Add more teachers or increase their workload limits</li>
                  <li>Add more rooms (especially labs if many practicals)</li>
                  <li>Check teacher availability settings</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pro Tips */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              Pro Tips for Better Scheduling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">1</span>
                <div>
                  <p className="font-medium">Start with Teacher Preferences</p>
                  <p className="text-muted-foreground text-xs">Set teacher availability and preferences (avoid 8am, max hours) before generating.</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                <div>
                  <p className="font-medium">Assign Lab Courses First</p>
                  <p className="text-muted-foreground text-xs">Labs have more constraints (special rooms, 3-hour blocks), so prioritize them.</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">3</span>
                <div>
                  <p className="font-medium">Use the Conflicts Page</p>
                  <p className="text-muted-foreground text-xs">After generation, check the Conflicts page to understand and fix scheduling failures.</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">4</span>
                <div>
                  <p className="font-medium">Lock Important Classes</p>
                  <p className="text-muted-foreground text-xs">Use the lock feature to keep critical classes in place during re-optimization.</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">5</span>
                <div>
                  <p className="font-medium">Export for Review</p>
                  <p className="text-muted-foreground text-xs">Use "All Sections" view and export to PDF/CSV for comprehensive schedule review.</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </motion.div>
    </div>
    </>
  )
}