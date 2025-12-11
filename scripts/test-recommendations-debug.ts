import { createClient } from '@supabase/supabase-js'
import { RecommendationEngine } from '../lib/recommendation-engine'

const supabaseUrl = 'https://wmgqkkaholdwhmozqmyr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtZ3Fra2Fob2xkd2htb3pxbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDg5NDgsImV4cCI6MjA3ODMyNDk0OH0.iOdG93N_FOnDvhid7Z5bAjU65SivcYLZFETZ9t0WBQw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRecommendationsDebug() {
  try {
    console.log('=== RECOMMENDATIONS DEBUG TEST ===\n')
    
    // 1. Check if we have assignments
    const { data: assignments, error: assignError } = await supabase
      .from('assignment')
      .select('*')
      .limit(5)
    
    if (assignError) {
      console.error('Error fetching assignments:', assignError)
      return
    }
    
    if (!assignments || assignments.length === 0) {
      console.log('No assignments found. Please generate a timetable first.')
      return
    }
    
    console.log(`Found ${assignments.length} assignments\n`)
    
    // Display first assignment details
    const firstAssignment = assignments[0]
    console.log('Testing with assignment:')
    console.log('- Offering ID:', firstAssignment.offering_id)
    console.log('- Kind:', firstAssignment.kind)
    console.log('- Slot ID:', firstAssignment.slot_id)
    console.log('- Room ID:', firstAssignment.room_id)
    console.log()
    
    // 2. Fetch all required data for recommendation engine
    console.log('Fetching data for recommendation engine...')
    const [teachers, rooms, slots, offerings, availability, allAssignments] = await Promise.all([
      supabase.from('teacher').select('*').then(r => r.data || []),
      supabase.from('room').select('*').then(r => r.data || []),
      supabase.from('slot').select('*').then(r => r.data || []),
      supabase.from('offering').select('*').then(r => r.data || []),
      supabase.from('availability').select('*').then(r => r.data || []),
      supabase.from('assignment').select('*, offering:offering_id(*)').then(r => r.data || [])
    ])
    
    console.log('Data loaded:')
    console.log('- Teachers:', teachers.length)
    console.log('- Rooms:', rooms.length)
    console.log('- Slots:', slots.length)
    console.log('- Offerings:', offerings.length)
    console.log('- Availability records:', availability.length)
    console.log('- Total assignments:', allAssignments.length)
    console.log()
    
    // 3. Check slot durations
    console.log('Checking slot durations:')
    const sampleSlots = slots.slice(0, 5)
    sampleSlots.forEach(slot => {
      const startParts = slot.start_time.split(':')
      const endParts = slot.end_time.split(':')
      const duration = (parseInt(endParts[0]) * 60 + parseInt(endParts[1])) - 
                      (parseInt(startParts[0]) * 60 + parseInt(startParts[1]))
      console.log(`- ${slot.code}: ${slot.start_time} - ${slot.end_time} = ${duration} minutes`)
    })
    console.log()
    
    // 4. Create recommendation engine and test
    console.log('Creating recommendation engine...')
    const engine = new RecommendationEngine({
      teachers,
      rooms,
      slots,
      offerings,
      availability,
      currentAssignments: allAssignments
    })
    
    console.log('\nGetting recommendations for first assignment...')
    const recommendations = engine.getRecommendations(
      firstAssignment.offering_id,
      firstAssignment.kind as 'L' | 'T' | 'P'
    )
    
    console.log(`\nFound ${recommendations.length} recommendations`)
    
    if (recommendations.length > 0) {
      console.log('\nTop 5 recommendations:')
      recommendations.slice(0, 5).forEach((rec, i) => {
        console.log(`\n${i + 1}. ${rec.display}`)
        console.log(`   Penalty Delta: ${rec.penalty_delta}`)
        console.log('   Reasons:')
        rec.reasons.forEach(reason => console.log(`   - ${reason}`))
      })
    } else {
      console.log('\nNo recommendations found!')
      console.log('This could be due to:')
      console.log('- No available slots with correct duration')
      console.log('- Teacher not available in other slots')
      console.log('- No suitable rooms available')
      console.log('- All slots occupied')
    }
    
    // 5. Test API endpoint
    console.log('\n\n=== TESTING API ENDPOINT ===')
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-production-url.com/api/recommendations'
      : 'http://localhost:3000/api/recommendations'
    
    console.log('Calling:', apiUrl)
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offering_id: firstAssignment.offering_id,
          kind: firstAssignment.kind
        })
      })
      
      if (!response.ok) {
        console.error('API error:', response.status)
        const errorText = await response.text()
        console.error('Error response:', errorText)
      } else {
        const result = await response.json()
        console.log('API Response:', JSON.stringify(result, null, 2))
      }
    } catch (apiError) {
      console.error('API call failed:', apiError)
      console.log('Make sure your Next.js server is running on port 3000')
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
testRecommendationsDebug()