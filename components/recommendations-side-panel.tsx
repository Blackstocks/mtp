'use client'

import { useState, useEffect } from 'react'
import { AssignmentWithRelations } from '@/types/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, X, AlertCircle, Check, XIcon } from 'lucide-react'
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
  const [applyingId, setApplyingId] = useState<string | null>(null)
  
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
      <div className="w-72 bg-white rounded-lg p-4 shadow-md border border-gray-200">
        <h3 className="text-lg font-bold text-black mb-3">AI Recommendations</h3>
        <div className="text-center">
          <div className="w-12 h-12 bg-black rounded-full mx-auto mb-3 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-xs text-gray-600">
            Click on any class to see AI-powered scheduling recommendations
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="w-72 bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <div className="bg-black p-4 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold mb-1">AI Recommendations</h3>
            <p className="text-sm font-semibold opacity-90">
              {selectedAssignment.offering?.course?.code}
            </p>
            <div className="flex gap-2 mt-2">
              <Badge className="bg-white/20 text-white border-0 text-[10px]">
                {selectedAssignment.kind}
              </Badge>
              <Badge className="bg-white/20 text-white border-0 text-[10px]">
                {selectedAssignment.offering?.section?.name}
              </Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-3">
          {isLoading ? (
            <div className="flex flex-col items-center py-6">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-gray-300 rounded-full animate-pulse"></div>
                <div className="w-12 h-12 border-4 border-transparent border-t-black rounded-full animate-spin absolute top-0"></div>
              </div>
              <p className="text-xs text-gray-600 mt-3">Analyzing best options...</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <div className="w-10 h-10 bg-red-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <Card
                  key={index}
                  className="p-3 transition-all border-gray-200 hover:border-gray-400"
                >
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium text-xs">{rec.display}</p>
                      <p className="text-[10px] text-gray-600 mt-1">
                        Room: {rec.room?.code} (Capacity: {rec.room?.capacity})
                      </p>
                    </div>
                    
                    <div className="space-y-1 text-[10px] text-gray-600">
                      {rec.reasons.map((reason: string, i: number) => (
                        <p key={i}>• {reason}</p>
                      ))}
                    </div>
                    
                    {rec.swaps && rec.swaps.length > 0 && (
                      <p className="text-[10px] text-orange-600">
                        Requires {rec.swaps.length} swap(s)
                      </p>
                    )}
                    
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs bg-black hover:bg-gray-800"
                        onClick={async () => {
                          setApplyingId(rec.slot_id)
                          await onApplyRecommendation({
                            ...rec,
                            assignment: selectedAssignment
                          })
                          setApplyingId(null)
                        }}
                        disabled={applyingId === rec.slot_id}
                      >
                        {applyingId === rec.slot_id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Apply
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2"
                        onClick={() => {
                          // Remove this recommendation from the list
                          setRecommendations(prev => prev.filter((_, i) => i !== index))
                        }}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}