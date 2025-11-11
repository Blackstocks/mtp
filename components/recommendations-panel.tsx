'use client'

import { useState, useEffect } from 'react'
import { AssignmentWithRelations } from '@/types/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronRight } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

interface RecommendationsPanelProps {
  selectedAssignment: AssignmentWithRelations | null
  onApplyRecommendation: (recommendation: any) => void
}

export function RecommendationsPanel({ 
  selectedAssignment, 
  onApplyRecommendation 
}: RecommendationsPanelProps) {
  const [isApplying, setIsApplying] = useState(false)
  const [localRecommendations, setLocalRecommendations] = useState<any[]>([])
  const [isLocalLoading, setIsLocalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch recommendations when selectedAssignment changes
  useEffect(() => {
    if (!selectedAssignment) {
      setLocalRecommendations([])
      setIsLocalLoading(false)
      setError(null)
      return
    }
    
    // Immediately show loading state
    setIsLocalLoading(true)
    setLocalRecommendations([])
    setError(null)
    
    const fetchRecommendations = async () => {
      try {
        console.log('Fetching recommendations for:', {
          offering_id: selectedAssignment.offering_id,
          kind: selectedAssignment.kind,
          course: selectedAssignment.offering?.course?.code,
          teacher: selectedAssignment.offering?.teacher?.name
        })
        
        const response = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offering_id: selectedAssignment.offering_id,
            kind: selectedAssignment.kind
          })
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Recommendation API error:', errorText)
          throw new Error('Failed to fetch recommendations')
        }
        
        const result = await response.json()
        console.log('Recommendations received:', result)
        const recs = result.recommendations || []
        
        if (recs.length === 0) {
          setError('No alternative slots found for this class. This could be due to teacher availability constraints or room capacity limitations.')
        }
        
        setLocalRecommendations(recs)
      } catch (error: any) {
        console.error('Error fetching recommendations:', error)
        setError(error.message || 'Failed to fetch recommendations')
        setLocalRecommendations([])
      } finally {
        setIsLocalLoading(false)
      }
    }
    
    // Add a small delay to ensure UI updates first
    const timeoutId = setTimeout(() => {
      fetchRecommendations()
    }, 50)
    
    return () => clearTimeout(timeoutId)
  }, [selectedAssignment?.offering_id, selectedAssignment?.kind, selectedAssignment?.slot_id])
  
  
  
  if (!selectedAssignment) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Select a class from the timetable to see alternative placement options
          </p>
        </CardContent>
      </Card>
    )
  }
  
  const handleApply = (rec: any) => {
    setIsApplying(true)
    onApplyRecommendation({
      ...rec,
      assignment: selectedAssignment
    })
    setIsApplying(false)
  }
  
  return (
    <Card className="h-full transition-all duration-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Recommendations for {selectedAssignment.offering?.course?.code}</span>
          {isLocalLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
        </CardTitle>
        <div className="flex gap-2 mt-2">
          <Badge>{selectedAssignment.kind}</Badge>
          <Badge variant="outline">
            {selectedAssignment.offering?.section?.name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLocalLoading ? (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="p-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="space-y-1 my-3">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                    <Skeleton className="h-9 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {error ? (
                <div className="text-center p-4">
                  <p className="text-sm text-red-600 mb-2">⚠️ {error}</p>
                  <p className="text-xs text-gray-500">
                    Try selecting a different class or check the solver logs for more details.
                  </p>
                </div>
              ) : localRecommendations && localRecommendations.length > 0 ? (
                localRecommendations.map((rec: any, idx: number) => (
                  <Card key={idx} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-sm">{rec.display}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Room: {rec.room?.code} (Cap: {rec.room?.capacity})
                      </div>
                    </div>
                    <Badge 
                      variant={rec.penalty_delta === 0 ? 'default' : 
                               rec.penalty_delta < 5 ? 'secondary' : 'outline'}
                    >
                      Score: {-rec.penalty_delta}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {rec.reasons.map((reason: string, i: number) => (
                      <div key={i} className="text-xs text-gray-600 flex items-start">
                        <ChevronRight className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                        {reason}
                      </div>
                    ))}
                  </div>
                  
                  {rec.swaps && rec.swaps.length > 0 && (
                    <div className="text-xs text-orange-600 mb-2">
                      Requires {rec.swaps.length} swap(s)
                    </div>
                  )}
                  
                  <Button
                    size="sm"
                    variant={idx === 0 ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => handleApply(rec)}
                    disabled={isApplying}
                  >
                    {isApplying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Apply This Option
                  </Button>
                </Card>
              ))) : (
                <div className="text-center p-4">
                  <p className="text-sm text-gray-500">
                    No recommendations available
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}