'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Users, 
  School, 
  BookOpen, 
  Calendar, 
  Clock, 
  TableProperties,
  Home,
  Upload
} from 'lucide-react'

const navItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: Home
  },
  {
    title: 'Teachers',
    href: '/admin/teachers',
    icon: Users
  },
  {
    title: 'Rooms',
    href: '/admin/rooms',
    icon: School
  },
  {
    title: 'Courses',
    href: '/admin/courses',
    icon: BookOpen
  },
  {
    title: 'Offerings',
    href: '/admin/offerings',
    icon: TableProperties
  },
  {
    title: 'Slot Matrix',
    href: '/admin/slot-matrix',
    icon: Clock
  },
  {
    title: 'Timetable',
    href: '/admin/timetable',
    icon: Calendar
  },
  {
    title: 'Import Data',
    href: '/admin/import',
    icon: Upload
  }
]

export function AdminNav() {
  const pathname = usePathname()
  
  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold">Timetable Scheduler</span>
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-blue-100 text-blue-700" 
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Admin Panel</span>
          </div>
        </div>
      </div>
    </nav>
  )
}