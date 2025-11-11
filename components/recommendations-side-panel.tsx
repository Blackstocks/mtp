'use client'

import { useState, useEffect } from 'react'
import { AssignmentWithRelations } from '@/types/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, X } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface RecommendationsSidePanelProps {
  selectedAssignment: AssignmentWithRelations | null
  onApplyRecommendation: (recommendation: any) => void
  onClose: () => void
}

export function RecommendationsSidePanel({ 
  selectedAssignment, 
  onApplyRecommendation,
  onClose
}: RecommendationsSidePanelProps) {
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    console.log('RecommendationsSidePanel - selectedAssignment:', selectedAssignment)
    
    if (!selectedAssignment) {
      setRecommendations([])
      return
    }
    
    const fetchRecommendations = async () => {
      console.log('Fetching recommendations for:', selectedAssignment.offering?.course?.code)
      setIsLoading(true)
      setError(null)
      setRecommendations([])
      
      try {
        const response = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offering_id: selectedAssignment.offering_id,
            kind: selectedAssignment.kind
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations')
        }
        
        const result = await response.json()
        const recs = result.recommendations || []
        
        if (recs.length === 0) {
          setError('No alternative slots available.')
        } else {
          setRecommendations(recs)
        }
      } catch (err) {
        setError('Failed to load recommendations.')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchRecommendations()
  }, [selectedAssignment])
  
  if (!selectedAssignment) {
    return (
      <div className="w-80 bg-gray-50 h-full p-4 border-r">
        <h3 className="font-semibold mb-4">Recommendations</h3>
        <p className="text-sm text-gray-500">
          Click on any class to see alternative slots
        </p>
      </div>
    )
  }
  
  return (
    <div className="w-80 bg-white h-full border-r shadow-md">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold">Recommendations</h3>
            <p className="text-sm text-gray-600 mt-1">
              {selectedAssignment.offering?.course?.code}
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {selectedAssignment.kind}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {selectedAssignment.offering?.section?.name}
              </Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-4">
          {isLoading ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mb-2" />
              <p className="text-sm text-gray-500">Loading recommendations...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <Card
                  key={index}
                  className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onApplyRecommendation(rec)}
                >
                  <div className="mb-2">
                    <p className="font-medium text-sm">{rec.display}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Room: {rec.room?.code} (Cap: {rec.room?.capacity})
                    </p>
                  </div>
                  
                  <Badge 
                    variant={rec.penalty_delta === 0 ? 'default' : 
                             rec.penalty_delta < 5 ? 'secondary' : 'outline'}
                    className="mb-2"
                  >
                    Score: {-rec.penalty_delta}
                  </Badge>
                  
                  <div className="space-y-1 text-xs text-gray-600">
                    {rec.reasons.map((reason: string, i: number) => (
                      <p key={i}>• {reason}</p>
                    ))}
                  </div>
                  
                  {rec.swaps && rec.swaps.length > 0 && (
                    <p className="text-xs text-orange-600 mt-2">
                      Requires {rec.swaps.length} swap(s)
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}