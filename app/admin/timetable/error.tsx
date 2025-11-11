'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-4">
      <h2 className="text-2xl font-semibold mb-4">Timetable Error</h2>
      <p className="text-gray-600 mb-4">Failed to load the timetable.</p>
      <p className="text-sm text-gray-500 mb-6">Error: {error.message}</p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>
          Try again
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/admin'}>
          Back to Admin
        </Button>
      </div>
    </div>
  )
}