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
    <nav className="bg-white sticky top-0 z-50 border-b border-gray-200">
      <div className="px-3">
        <div className="flex items-center justify-between h-12">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold text-black hidden md:block">Timetable</span>
          </Link>
          <div className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                    isActive 
                      ? "bg-black text-white shadow-md" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-black"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.title}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}