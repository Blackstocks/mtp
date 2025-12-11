import { createClient } from '@supabase/supabase-js'
import { RecommendationEngine } from '../lib/recommendation-engine'

const supabaseUrl = 'https://wmgqkkaholdwhmozqmyr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtZ3Fra2Fob2xkd2htb3pxbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDg5NDgsImV4cCI6MjA3ODMyNDk0OH0.iOdG93N_FOnDvhid7Z5bAjU65SivcYLZFETZ9t0WBQw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDirectly() {
  try {
    console.log('Fetching data...')
    
    // Fetch all required data
    const [teachers, rooms, slots, offerings, availability, assignments] = await Promise.all([
      supabase.from('teacher').select('*').then(r => r.data || []),
      supabase.from('room').select('*').then(r => r.data || []),
      supabase.from('slot').select('*').then(r => r.data || []),
      supabase.from('offering').select('*').then(r => r.data || []),
      supabase.from('availability').select('*').then(r => r.data || []),
      supabase.from('assignment').select('*, offering:offering_id(*)').then(r => r.data || [])
    ])
    
    console.log('Data fetched:', {
      teachers: teachers.length,
      rooms: rooms.length,
      slots: slots.length,
      offerings: offerings.length,
      assignments: assignments.length
    })
    
    if (assignments.length === 0) {
      console.log('No assignments found')
      return
    }
    
    // Create recommendation engine
    const engine = new RecommendationEngine({
      teachers,
      rooms,
      slots,
      offerings,
      availability,
      currentAssignments: assignments
    })
    
    // Test with first assignment
    const testAssignment = assignments[0]
    console.log('\nTesting with assignment:', {
      offering_id: testAssignment.offering_id,
      kind: testAssignment.kind,
      slot_id: testAssignment.slot_id
    })
    
    const recommendations = engine.getRecommendations(
      testAssignment.offering_id,
      testAssignment.kind
    )
    
    console.log('\nRecommendations found:', recommendations.length)
    
    if (recommendations.length > 0) {
      console.log('\nTop 3 recommendations:')
      recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`\n${i + 1}. ${rec.display}`)
        console.log(`   Score: ${rec.penalty_delta}`)
        console.log(`   Reasons:`, rec.reasons)
      })
    } else {
      console.log('No recommendations generated')
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testDirectly()