import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = 'https://wmgqkkaholdwhmozqmyr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtZ3Fra2Fob2xkd2htb3pxbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDg5NDgsImV4cCI6MjA3ODMyNDk0OH0.iOdG93N_FOnDvhid7Z5bAjU65SivcYLZFETZ9t0WBQw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRecommendations() {
  try {
    // Get the first assignment
    const { data: assignments, error: assignError } = await supabase
      .from('assignment')
      .select('*')
      .limit(1)
    
    if (assignError) {
      console.error('Error fetching assignments:', assignError)
      return
    }
    
    if (!assignments || assignments.length === 0) {
      console.log('No assignments found. Please generate a timetable first.')
      return
    }
    
    const assignment = assignments[0]
    console.log('Testing recommendations for assignment:', {
      offering_id: assignment.offering_id,
      kind: assignment.kind,
      slot_id: assignment.slot_id
    })
    
    // Call the recommendations API
    const response = await fetch('http://localhost:3001/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offering_id: assignment.offering_id,
        kind: assignment.kind
      })
    })
    
    if (!response.ok) {
      console.error('API error:', response.status, await response.text())
      return
    }
    
    const result = await response.json()
    console.log('Recommendations response:', JSON.stringify(result, null, 2))
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testRecommendations()