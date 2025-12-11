import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with env variables
const supabaseUrl = 'https://wmgqkkaholdwhmozqmyr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtZ3Fra2Fob2xkd2htb3pxbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDg5NDgsImV4cCI6MjA3ODMyNDk0OH0.iOdG93N_FOnDvhid7Z5bAjU65SivcYLZFETZ9t0WBQw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// New slot data
const newSlots = [
  { code: "A3", occ: "1", start_time: "08:00:33", end_time: "08:55:33", day: "MON", is_lab: false },
  { code: "A3", occ: "2", start_time: "09:00:33", end_time: "09:55:33", day: "MON", is_lab: false },
  { code: "A3", occ: "3", start_time: "12:00:33", end_time: "12:55:33", day: "TUE", is_lab: false },
  { code: "B3", occ: "1", start_time: "11:00:33", end_time: "11:55:33", day: "MON", is_lab: false },
  { code: "B3", occ: "2", start_time: "09:00:33", end_time: "09:55:33", day: "TUE", is_lab: false },
  { code: "B3", occ: "3", start_time: "10:00:33", end_time: "10:55:33", day: "TUE", is_lab: false },
  { code: "C3", occ: "1", start_time: "10:00:33", end_time: "10:55:33", day: "MON", is_lab: false },
  { code: "C3", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "WED", is_lab: false },
  { code: "C4", occ: "1", start_time: "10:00:33", end_time: "10:55:33", day: "MON", is_lab: false },
  { code: "C4", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "WED", is_lab: false },
  { code: "C4", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "WED", is_lab: false },
  { code: "C4", occ: "4", start_time: "11:00:33", end_time: "11:55:33", day: "THU", is_lab: false },
  { code: "D3", occ: "1", start_time: "12:00:33", end_time: "12:55:33", day: "MON", is_lab: false },
  { code: "D3", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "TUE", is_lab: false },
  { code: "D3", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "TUE", is_lab: false },
  { code: "D4", occ: "1", start_time: "12:00:33", end_time: "12:55:33", day: "MON", is_lab: false },
  { code: "D4", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "TUE", is_lab: false },
  { code: "D4", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "TUE", is_lab: false },
  { code: "D4", occ: "4", start_time: "09:00:33", end_time: "09:55:33", day: "THU", is_lab: false },
  { code: "E3", occ: "1", start_time: "12:00:33", end_time: "12:55:33", day: "WED", is_lab: false },
  { code: "E3", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "THU", is_lab: false },
  { code: "E3", occ: "3", start_time: "10:00:33", end_time: "10:55:33", day: "FRI", is_lab: false },
  { code: "E4", occ: "1", start_time: "12:00:33", end_time: "12:55:33", day: "WED", is_lab: false },
  { code: "E4", occ: "2", start_time: "11:00:33", end_time: "11:55:33", day: "THU", is_lab: false },
  { code: "E4", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "FRI", is_lab: false },
  { code: "F3", occ: "1", start_time: "10:00:33", end_time: "10:55:33", day: "WED", is_lab: false },
  { code: "F3", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "THU", is_lab: false },
  { code: "F3", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "FRI", is_lab: false },
  { code: "F4", occ: "1", start_time: "10:00:33", end_time: "10:55:33", day: "WED", is_lab: false },
  { code: "F4", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "THU", is_lab: false },
  { code: "F4", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "FRI", is_lab: false },
  { code: "F4", occ: "4", start_time: "11:00:33", end_time: "11:55:33", day: "FRI", is_lab: false },
  { code: "G3", occ: "1", start_time: "11:00:33", end_time: "11:55:33", day: "WED", is_lab: false },
  { code: "G3", occ: "2", start_time: "12:00:33", end_time: "12:55:33", day: "THU", is_lab: false },
  { code: "G3", occ: "3", start_time: "08:00:33", end_time: "08:55:33", day: "FRI", is_lab: false },
  { code: "H3", occ: "1", start_time: "14:00:33", end_time: "14:55:33", day: "MON", is_lab: false },
  { code: "H3", occ: "2", start_time: "16:00:33", end_time: "16:55:33", day: "TUE", is_lab: false },
  { code: "H3", occ: "3", start_time: "16:00:33", end_time: "16:55:33", day: "TUE", is_lab: false },
  { code: "H2", occ: "", start_time: "16:00:33", end_time: "16:55:33", day: "TUE", is_lab: false },
  { code: "I2", occ: "1", start_time: "14:00:33", end_time: "14:55:33", day: "THU", is_lab: false },
  { code: "I2", occ: "2", start_time: "16:00:33", end_time: "16:55:33", day: "FRI", is_lab: false },
  { code: "S3", occ: "1", start_time: "17:00:33", end_time: "17:55:33", day: "MON", is_lab: false },
  { code: "S3", occ: "2", start_time: "17:00:33", end_time: "17:55:33", day: "THU", is_lab: false },
  { code: "S3", occ: "3", start_time: "17:00:33", end_time: "17:55:33", day: "FRI", is_lab: false },
  { code: "X4", occ: "1", start_time: "14:00:33", end_time: "14:55:33", day: "WED", is_lab: false },
  { code: "X4", occ: "2", start_time: "15:00:33", end_time: "15:55:33", day: "WED", is_lab: false },
  { code: "X4", occ: "3", start_time: "16:00:33", end_time: "16:55:33", day: "WED", is_lab: false },
  { code: "X4", occ: "4", start_time: "17:00:33", end_time: "17:55:33", day: "WED", is_lab: false },
  
  // 2-hour slots
  { code: "A2", occ: "", start_time: "09:00:33", end_time: "10:55:33", day: "THU", is_lab: false },
  { code: "B2", occ: "", start_time: "09:00:33", end_time: "10:55:33", day: "TUE", is_lab: false },
  { code: "C2", occ: "", start_time: "09:00:33", end_time: "10:55:33", day: "WED", is_lab: false },
  { code: "D2", occ: "", start_time: "10:00:33", end_time: "11:55:33", day: "TUE", is_lab: false },
  { code: "E2", occ: "", start_time: "10:00:33", end_time: "11:55:33", day: "FRI", is_lab: false },
  { code: "F2", occ: "", start_time: "11:00:33", end_time: "12:55:33", day: "THU", is_lab: false },
  { code: "A3", occ: "1,2", start_time: "08:00:33", end_time: "09:55:33", day: "MON", is_lab: false },
  { code: "B3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "TUE", is_lab: false },
  { code: "C3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "WED", is_lab: false },
  { code: "C4", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "WED", is_lab: false },
  { code: "C4", occ: "3,4", start_time: "10:00:33", end_time: "11:55:33", day: "THU", is_lab: false },
  { code: "D3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "TUE", is_lab: false },
  { code: "D4", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "TUE", is_lab: false },
  { code: "E3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "THU", is_lab: false },
  { code: "E4", occ: "3,4", start_time: "10:00:33", end_time: "11:55:33", day: "FRI", is_lab: false },
  { code: "F3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "THU", is_lab: false },
  { code: "F4", occ: "3,4", start_time: "10:00:33", end_time: "11:55:33", day: "FRI", is_lab: false },
  { code: "U3", occ: "1,2", start_time: "15:00:33", end_time: "16:55:33", day: "MON", is_lab: false },
  { code: "U3", occ: "3,4", start_time: "15:00:33", end_time: "16:55:33", day: "TUE", is_lab: false },
  { code: "U4", occ: "1,2", start_time: "15:00:33", end_time: "16:55:33", day: "MON", is_lab: false },
  { code: "U4", occ: "3,4", start_time: "15:00:33", end_time: "16:55:33", day: "TUE", is_lab: false },
  { code: "V3", occ: "1,2", start_time: "15:00:33", end_time: "16:55:33", day: "THU", is_lab: false },
  { code: "V4", occ: "1,2", start_time: "15:00:33", end_time: "16:55:33", day: "THU", is_lab: false },
  { code: "V4", occ: "3,4", start_time: "15:00:33", end_time: "16:55:33", day: "FRI", is_lab: false },
  
  // 4-hour slot
  { code: "D4", occ: "4h", start_time: "09:00:33", end_time: "12:55:33", day: "THU", is_lab: false },
  
  // Lab slots (3-hour)
  { code: "LAB", occ: "Q", start_time: "10:00:33", end_time: "12:55:33", day: "MON", is_lab: true },
  { code: "LAB", occ: "K", start_time: "10:00:33", end_time: "12:55:33", day: "TUE", is_lab: true },
  { code: "LAB", occ: "R", start_time: "10:00:33", end_time: "12:55:33", day: "WED", is_lab: true },
  { code: "LAB", occ: "M", start_time: "10:00:33", end_time: "12:55:33", day: "THU", is_lab: true },
  { code: "LAB", occ: "O", start_time: "10:00:33", end_time: "12:55:33", day: "FRI", is_lab: true },
  { code: "LAB", occ: "J", start_time: "14:00:33", end_time: "16:55:33", day: "MON", is_lab: true },
  { code: "LAB", occ: "L", start_time: "14:00:33", end_time: "16:55:33", day: "TUE", is_lab: true },
  { code: "LAB", occ: "X", start_time: "14:00:33", end_time: "16:55:33", day: "WED", is_lab: true },
  { code: "LAB", occ: "N", start_time: "14:00:33", end_time: "16:55:33", day: "THU", is_lab: true },
  { code: "LAB", occ: "P", start_time: "14:00:33", end_time: "16:55:33", day: "FRI", is_lab: true },
]

async function updateSlots() {
  console.log('Starting slot update...')
  
  try {
    // First, delete all assignments that reference existing slots
    console.log('Deleting existing assignments...')
    const { error: deleteAssignmentsError } = await supabase
      .from('assignment')
      .delete()
      .gte('offering_id', '00000000-0000-0000-0000-000000000000')
    
    if (deleteAssignmentsError) {
      console.error('Error deleting assignments:', deleteAssignmentsError)
      return
    }
    
    // Step 1: Delete all existing slots
    console.log('Deleting existing slots...')
    const { error: deleteError } = await supabase
      .from('slot')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (deleteError) {
      console.error('Error deleting slots:', deleteError)
      return
    }
    
    console.log('Existing slots deleted successfully')
    
    // Step 2: Insert new slots
    console.log('Inserting new slots...')
    const { error: insertError } = await supabase
      .from('slot')
      .insert(newSlots)
    
    if (insertError) {
      console.error('Error inserting slots:', insertError)
      return
    }
    
    console.log(`Successfully inserted ${newSlots.length} slots`)
    
    // Step 3: Verify insertion
    const { data: verifyData, error: verifyError } = await supabase
      .from('slot')
      .select('*')
      .order('day', { ascending: true })
      .order('start_time', { ascending: true })
    
    if (verifyError) {
      console.error('Error verifying slots:', verifyError)
      return
    }
    
    console.log(`Verification: ${verifyData?.length} slots in database`)
    console.log('Slot update completed successfully!')
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the update
updateSlots()