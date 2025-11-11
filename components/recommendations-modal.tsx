'use client'

import { useState, useEffect } from 'react'
import { AssignmentWithRelations } from '@/types/db'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'

interface RecommendationsModalProps {
  assignment: AssignmentWithRelations | null
  isOpen: boolean
  onClose: () => void
  onApply: (recommendation: any) => void
}

export function RecommendationsModal({
  assignment,
  isOpen,
  onClose,
  onApply
}: RecommendationsModalProps) {
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!assignment || !isOpen) return

    const fetchRecommendations = async () => {
      setIsLoading(true)
      setError(null)
      setRecommendations([])

      try {
        const response = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offering_id: assignment.offering_id,
            kind: assignment.kind
          })
        })

        if (!response.ok) {
          throw new Error('Failed to fetch recommendations')
        }

        const result = await response.json()
        const recs = result.recommendations || []
        
        if (recs.length === 0) {
          setError('No alternative slots available for this class.')
        } else {
          setRecommendations(recs)
        }
      } catch (err) {
        setError('Failed to load recommendations. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendations()
  }, [assignment, isOpen])

  if (!assignment) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Recommendations for {assignment.offering?.course?.code}
          </DialogTitle>
          <DialogDescription>
            <div className="flex gap-2 mt-2">
              <Badge>{assignment.kind}</Badge>
              <Badge variant="outline">{assignment.offering?.section?.name}</Badge>
              <Badge variant="outline">{assignment.offering?.teacher?.name}</Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 overflow-y-auto max-h-[50vh] pr-2">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8"
              >
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                <p className="text-sm text-gray-500">Finding best alternatives...</p>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-8"
              >
                <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
                <p className="text-sm text-red-600 text-center">{error}</p>
              </motion.div>
            ) : (
              <motion.div
                key="recommendations"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {recommendations.map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => onApply(rec)}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{rec.display}</p>
                          <p className="text-sm text-gray-600">
                            Room: {rec.room?.code} (Capacity: {rec.room?.capacity})
                          </p>
                        </div>
                        <Badge 
                          variant={rec.penalty_delta === 0 ? 'default' : 
                                   rec.penalty_delta < 5 ? 'secondary' : 'outline'}
                          className="animate-pulse"
                        >
                          Score: {-rec.penalty_delta}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        {rec.reasons.map((reason: string, i: number) => (
                          <p key={i} className="text-xs text-gray-600">
                            • {reason}
                          </p>
                        ))}
                      </div>
                      
                      {rec.swaps && rec.swaps.length > 0 && (
                        <p className="text-xs text-orange-600 mt-2">
                          ⚠️ Requires {rec.swaps.length} swap(s)
                        </p>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}