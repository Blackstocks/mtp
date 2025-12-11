import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wmgqkkaholdwhmozqmyr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtZ3Fra2Fob2xkd2htb3pxbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDg5NDgsImV4cCI6MjA3ODMyNDk0OH0.iOdG93N_FOnDvhid7Z5bAjU65SivcYLZFETZ9t0WBQw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testApplyRecommendation() {
  try {
    // First, get an assignment to test with
    const { data: assignments } = await supabase
      .from('assignment')
      .select('*')
      .limit(1)
    
    if (!assignments || assignments.length === 0) {
      console.log('No assignments found')
      return
    }
    
    const testAssignment = assignments[0]
    console.log('Test assignment:', testAssignment)
    
    // Get available slots
    const { data: slots } = await supabase
      .from('slot')
      .select('*')
      .neq('id', testAssignment.slot_id)
      .limit(1)
    
    if (!slots || slots.length === 0) {
      console.log('No alternative slots found')
      return
    }
    
    // Create a test recommendation
    const recommendation = {
      slot_id: slots[0].id,
      room_id: testAssignment.room_id, // Keep same room for simplicity
      reasons: ['Test recommendation'],
      assignment: testAssignment
    }
    
    console.log('Applying recommendation:', recommendation)
    
    // Test the API
    const response = await fetch('http://localhost:3000/api/recommendations/apply-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recommendation, assignment: testAssignment })
    })
    
    console.log('Response status:', response.status)
    const text = await response.text()
    console.log('Response text:', text.substring(0, 200))
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const result = JSON.parse(text)
      console.log('Response JSON:', result)
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testApplyRecommendation()