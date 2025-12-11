import { supabase } from '../lib/db'

// New slot data
const newSlots = [
  { code: "A3", occ: "1", start_time: "08:00:33", end_time: "08:55:33", day: "MON", is_lab: false, duration: 1 },
  { code: "A3", occ: "2", start_time: "09:00:33", end_time: "09:55:33", day: "MON", is_lab: false, duration: 1 },
  { code: "A3", occ: "3", start_time: "12:00:33", end_time: "12:55:33", day: "TUE", is_lab: false, duration: 1 },
  { code: "B3", occ: "1", start_time: "11:00:33", end_time: "11:55:33", day: "MON", is_lab: false, duration: 1 },
  { code: "B3", occ: "2", start_time: "09:00:33", end_time: "09:55:33", day: "TUE", is_lab: false, duration: 1 },
  { code: "B3", occ: "3", start_time: "10:00:33", end_time: "10:55:33", day: "TUE", is_lab: false, duration: 1 },
  { code: "C3", occ: "1", start_time: "10:00:33", end_time: "10:55:33", day: "MON", is_lab: false, duration: 1 },
  { code: "C3", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "WED", is_lab: false, duration: 1 },
  { code: "C4", occ: "1", start_time: "10:00:33", end_time: "10:55:33", day: "MON", is_lab: false, duration: 1 },
  { code: "C4", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "WED", is_lab: false, duration: 1 },
  { code: "C4", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "WED", is_lab: false, duration: 1 },
  { code: "C4", occ: "4", start_time: "11:00:33", end_time: "11:55:33", day: "THU", is_lab: false, duration: 1 },
  { code: "D3", occ: "1", start_time: "12:00:33", end_time: "12:55:33", day: "MON", is_lab: false, duration: 1 },
  { code: "D3", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "TUE", is_lab: false, duration: 1 },
  { code: "D3", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "TUE", is_lab: false, duration: 1 },
  { code: "D4", occ: "1", start_time: "12:00:33", end_time: "12:55:33", day: "MON", is_lab: false, duration: 1 },
  { code: "D4", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "TUE", is_lab: false, duration: 1 },
  { code: "D4", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "TUE", is_lab: false, duration: 1 },
  { code: "D4", occ: "4", start_time: "09:00:33", end_time: "09:55:33", day: "THU", is_lab: false, duration: 1 },
  { code: "E3", occ: "1", start_time: "12:00:33", end_time: "12:55:33", day: "WED", is_lab: false, duration: 1 },
  { code: "E3", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "THU", is_lab: false, duration: 1 },
  { code: "E3", occ: "3", start_time: "10:00:33", end_time: "10:55:33", day: "FRI", is_lab: false, duration: 1 },
  { code: "E4", occ: "1", start_time: "12:00:33", end_time: "12:55:33", day: "WED", is_lab: false, duration: 1 },
  { code: "E4", occ: "2", start_time: "11:00:33", end_time: "11:55:33", day: "THU", is_lab: false, duration: 1 },
  { code: "E4", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "FRI", is_lab: false, duration: 1 },
  { code: "F3", occ: "1", start_time: "10:00:33", end_time: "10:55:33", day: "WED", is_lab: false, duration: 1 },
  { code: "F3", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "THU", is_lab: false, duration: 1 },
  { code: "F3", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "FRI", is_lab: false, duration: 1 },
  { code: "F4", occ: "1", start_time: "10:00:33", end_time: "10:55:33", day: "WED", is_lab: false, duration: 1 },
  { code: "F4", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "THU", is_lab: false, duration: 1 },
  { code: "F4", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "FRI", is_lab: false, duration: 1 },
  { code: "F4", occ: "4", start_time: "11:00:33", end_time: "11:55:33", day: "FRI", is_lab: false, duration: 1 },
  { code: "G3", occ: "1", start_time: "11:00:33", end_time: "11:55:33", day: "WED", is_lab: false, duration: 1 },
  { code: "G3", occ: "2", start_time: "12:00:33", end_time: "12:55:33", day: "THU", is_lab: false, duration: 1 },
  { code: "G3", occ: "3", start_time: "08:00:33", end_time: "08:55:33", day: "FRI", is_lab: false, duration: 1 },
  { code: "H3", occ: "1", start_time: "14:00:33", end_time: "14:55:33", day: "MON", is_lab: false, duration: 1 },
  { code: "H3", occ: "2", start_time: "16:00:33", end_time: "16:55:33", day: "TUE", is_lab: false, duration: 1 },
  { code: "H3", occ: "3", start_time: "16:00:33", end_time: "16:55:33", day: "TUE", is_lab: false, duration: 1 },
  { code: "H2", occ: "", start_time: "16:00:33", end_time: "16:55:33", day: "TUE", is_lab: false, duration: 1 },
  { code: "I2", occ: "1", start_time: "14:00:33", end_time: "14:55:33", day: "THU", is_lab: false, duration: 1 },
  { code: "I2", occ: "2", start_time: "16:00:33", end_time: "16:55:33", day: "FRI", is_lab: false, duration: 1 },
  { code: "S3", occ: "1", start_time: "17:00:33", end_time: "17:55:33", day: "MON", is_lab: false, duration: 1 },
  { code: "S3", occ: "2", start_time: "17:00:33", end_time: "17:55:33", day: "THU", is_lab: false, duration: 1 },
  { code: "S3", occ: "3", start_time: "17:00:33", end_time: "17:55:33", day: "FRI", is_lab: false, duration: 1 },
  { code: "X4", occ: "1", start_time: "14:00:33", end_time: "14:55:33", day: "WED", is_lab: false, duration: 1 },
  { code: "X4", occ: "2", start_time: "15:00:33", end_time: "15:55:33", day: "WED", is_lab: false, duration: 1 },
  { code: "X4", occ: "3", start_time: "16:00:33", end_time: "16:55:33", day: "WED", is_lab: false, duration: 1 },
  { code: "X4", occ: "4", start_time: "17:00:33", end_time: "17:55:33", day: "WED", is_lab: false, duration: 1 },
  
  // 2-hour slots
  { code: "A2", occ: "", start_time: "09:00:33", end_time: "10:55:33", day: "THU", is_lab: false, duration: 2 },
  { code: "B2", occ: "", start_time: "09:00:33", end_time: "10:55:33", day: "TUE", is_lab: false, duration: 2 },
  { code: "C2", occ: "", start_time: "09:00:33", end_time: "10:55:33", day: "WED", is_lab: false, duration: 2 },
  { code: "D2", occ: "", start_time: "10:00:33", end_time: "11:55:33", day: "TUE", is_lab: false, duration: 2 },
  { code: "E2", occ: "", start_time: "10:00:33", end_time: "11:55:33", day: "FRI", is_lab: false, duration: 2 },
  { code: "F2", occ: "", start_time: "11:00:33", end_time: "12:55:33", day: "THU", is_lab: false, duration: 2 },
  { code: "A3", occ: "1,2", start_time: "08:00:33", end_time: "09:55:33", day: "MON", is_lab: false, duration: 2 },
  { code: "B3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "TUE", is_lab: false, duration: 2 },
  { code: "C3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "WED", is_lab: false, duration: 2 },
  { code: "C4", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "WED", is_lab: false, duration: 2 },
  { code: "C4", occ: "3,4", start_time: "10:00:33", end_time: "11:55:33", day: "THU", is_lab: false, duration: 2 },
  { code: "D3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "TUE", is_lab: false, duration: 2 },
  { code: "D4", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "TUE", is_lab: false, duration: 2 },
  { code: "E3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "THU", is_lab: false, duration: 2 },
  { code: "E4", occ: "3,4", start_time: "10:00:33", end_time: "11:55:33", day: "FRI", is_lab: false, duration: 2 },
  { code: "F3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "THU", is_lab: false, duration: 2 },
  { code: "F4", occ: "3,4", start_time: "10:00:33", end_time: "11:55:33", day: "FRI", is_lab: false, duration: 2 },
  { code: "U3", occ: "1,2", start_time: "15:00:33", end_time: "16:55:33", day: "MON", is_lab: false, duration: 2 },
  { code: "U3", occ: "3,4", start_time: "15:00:33", end_time: "16:55:33", day: "TUE", is_lab: false, duration: 2 },
  { code: "U4", occ: "1,2", start_time: "15:00:33", end_time: "16:55:33", day: "MON", is_lab: false, duration: 2 },
  { code: "U4", occ: "3,4", start_time: "15:00:33", end_time: "16:55:33", day: "TUE", is_lab: false, duration: 2 },
  { code: "V3", occ: "1,2", start_time: "15:00:33", end_time: "16:55:33", day: "THU", is_lab: false, duration: 2 },
  { code: "V4", occ: "1,2", start_time: "15:00:33", end_time: "16:55:33", day: "THU", is_lab: false, duration: 2 },
  { code: "V4", occ: "3,4", start_time: "15:00:33", end_time: "16:55:33", day: "FRI", is_lab: false, duration: 2 },
  
  // 4-hour slot
  { code: "D4", occ: "4h", start_time: "09:00:33", end_time: "12:55:33", day: "THU", is_lab: false, duration: 4 },
  
  // Lab slots (3-hour)
  { code: "LAB", occ: "Q", start_time: "10:00:33", end_time: "12:55:33", day: "MON", is_lab: true, duration: 3 },
  { code: "LAB", occ: "K", start_time: "10:00:33", end_time: "12:55:33", day: "TUE", is_lab: true, duration: 3 },
  { code: "LAB", occ: "R", start_time: "10:00:33", end_time: "12:55:33", day: "WED", is_lab: true, duration: 3 },
  { code: "LAB", occ: "M", start_time: "10:00:33", end_time: "12:55:33", day: "THU", is_lab: true, duration: 3 },
  { code: "LAB", occ: "O", start_time: "10:00:33", end_time: "12:55:33", day: "FRI", is_lab: true, duration: 3 },
  { code: "LAB", occ: "J", start_time: "14:00:33", end_time: "16:55:33", day: "MON", is_lab: true, duration: 3 },
  { code: "LAB", occ: "L", start_time: "14:00:33", end_time: "16:55:33", day: "TUE", is_lab: true, duration: 3 },
  { code: "LAB", occ: "X", start_time: "14:00:33", end_time: "16:55:33", day: "WED", is_lab: true, duration: 3 },
  { code: "LAB", occ: "N", start_time: "14:00:33", end_time: "16:55:33", day: "THU", is_lab: true, duration: 3 },
  { code: "LAB", occ: "P", start_time: "14:00:33", end_time: "16:55:33", day: "FRI", is_lab: true, duration: 3 },
]

async function updateSlots() {
  console.log('Starting slot update...')
  
  try {
    // Step 1: Delete all existing slots
    console.log('Deleting existing slots...')
    const { error: deleteError } = await supabase
      .from('slot')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using impossible ID)
    
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
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the update
updateSlots()