import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with env variables
const supabaseUrl = 'https://wmgqkkaholdwhmozqmyr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtZ3Fra2Fob2xkd2htb3pxbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDg5NDgsImV4cCI6MjA3ODMyNDk0OH0.iOdG93N_FOnDvhid7Z5bAjU65SivcYLZFETZ9t0WBQw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper to parse occ field
function parseOcc(occStr: string): number {
  // Convert empty string to 1
  if (!occStr || occStr === '') return 1
  // If it's a simple number
  if (/^\d+$/.test(occStr)) return parseInt(occStr)
  // If it contains comma (like "1,2"), return the first number
  if (occStr.includes(',')) return parseInt(occStr.split(',')[0])
  // For special cases like "4h", return 1
  return 1
}

// Helper to determine cluster
function getCluster(code: string, occStr: string): string | null {
  // Lab slots have their cluster in occ field
  if (code === 'LAB') return occStr
  // Other slots don't have clusters in this data
  return null
}

// Parse the raw data
const rawSlots = [
  { code: "A3", occ: "1", start_time: "08:00:33", end_time: "08:55:33", day: "MON" },
  { code: "A3", occ: "2", start_time: "09:00:33", end_time: "09:55:33", day: "MON" },
  { code: "A3", occ: "3", start_time: "12:00:33", end_time: "12:55:33", day: "TUE" },
  { code: "B3", occ: "1", start_time: "11:00:33", end_time: "11:55:33", day: "MON" },
  { code: "B3", occ: "2", start_time: "09:00:33", end_time: "09:55:33", day: "TUE" },
  { code: "B3", occ: "3", start_time: "10:00:33", end_time: "10:55:33", day: "TUE" },
  { code: "C3", occ: "1", start_time: "10:00:33", end_time: "10:55:33", day: "MON" },
  { code: "C3", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "WED" },
  { code: "C4", occ: "1", start_time: "10:00:33", end_time: "10:55:33", day: "MON" },
  { code: "C4", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "WED" },
  { code: "C4", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "WED" },
  { code: "C4", occ: "4", start_time: "11:00:33", end_time: "11:55:33", day: "THU" },
  { code: "D3", occ: "1", start_time: "12:00:33", end_time: "12:55:33", day: "MON" },
  { code: "D3", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "TUE" },
  { code: "D3", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "TUE" },
  { code: "D4", occ: "1", start_time: "12:00:33", end_time: "12:55:33", day: "MON" },
  { code: "D4", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "TUE" },
  { code: "D4", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "TUE" },
  { code: "D4", occ: "4", start_time: "09:00:33", end_time: "09:55:33", day: "THU" },
  { code: "E3", occ: "1", start_time: "12:00:33", end_time: "12:55:33", day: "WED" },
  { code: "E3", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "THU" },
  { code: "E3", occ: "3", start_time: "10:00:33", end_time: "10:55:33", day: "FRI" },
  { code: "E4", occ: "1", start_time: "12:00:33", end_time: "12:55:33", day: "WED" },
  { code: "E4", occ: "2", start_time: "11:00:33", end_time: "11:55:33", day: "THU" },
  { code: "E4", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "FRI" },
  { code: "F3", occ: "1", start_time: "10:00:33", end_time: "10:55:33", day: "WED" },
  { code: "F3", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "THU" },
  { code: "F3", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "FRI" },
  { code: "F4", occ: "1", start_time: "10:00:33", end_time: "10:55:33", day: "WED" },
  { code: "F4", occ: "2", start_time: "10:00:33", end_time: "10:55:33", day: "THU" },
  { code: "F4", occ: "3", start_time: "11:00:33", end_time: "11:55:33", day: "FRI" },
  { code: "F4", occ: "4", start_time: "11:00:33", end_time: "11:55:33", day: "FRI" },
  { code: "G3", occ: "1", start_time: "11:00:33", end_time: "11:55:33", day: "WED" },
  { code: "G3", occ: "2", start_time: "12:00:33", end_time: "12:55:33", day: "THU" },
  { code: "G3", occ: "3", start_time: "08:00:33", end_time: "08:55:33", day: "FRI" },
  { code: "H3", occ: "1", start_time: "14:00:33", end_time: "14:55:33", day: "MON" },
  { code: "H3", occ: "2", start_time: "16:00:33", end_time: "16:55:33", day: "TUE" },
  { code: "H3", occ: "3", start_time: "16:00:33", end_time: "16:55:33", day: "TUE" },
  { code: "H2", occ: "", start_time: "16:00:33", end_time: "16:55:33", day: "TUE" },
  { code: "I2", occ: "1", start_time: "14:00:33", end_time: "14:55:33", day: "THU" },
  { code: "I2", occ: "2", start_time: "16:00:33", end_time: "16:55:33", day: "FRI" },
  { code: "S3", occ: "1", start_time: "17:00:33", end_time: "17:55:33", day: "MON" },
  { code: "S3", occ: "2", start_time: "17:00:33", end_time: "17:55:33", day: "THU" },
  { code: "S3", occ: "3", start_time: "17:00:33", end_time: "17:55:33", day: "FRI" },
  { code: "X4", occ: "1", start_time: "14:00:33", end_time: "14:55:33", day: "WED" },
  { code: "X4", occ: "2", start_time: "15:00:33", end_time: "15:55:33", day: "WED" },
  { code: "X4", occ: "3", start_time: "16:00:33", end_time: "16:55:33", day: "WED" },
  { code: "X4", occ: "4", start_time: "17:00:33", end_time: "17:55:33", day: "WED" },
  // 2-hour slots
  { code: "A2", occ: "", start_time: "09:00:33", end_time: "10:55:33", day: "THU" },
  { code: "B2", occ: "", start_time: "09:00:33", end_time: "10:55:33", day: "TUE" },
  { code: "C2", occ: "", start_time: "09:00:33", end_time: "10:55:33", day: "WED" },
  { code: "D2", occ: "", start_time: "10:00:33", end_time: "11:55:33", day: "TUE" },
  { code: "E2", occ: "", start_time: "10:00:33", end_time: "11:55:33", day: "FRI" },
  { code: "F2", occ: "", start_time: "11:00:33", end_time: "12:55:33", day: "THU" },
  { code: "A3", occ: "1,2", start_time: "08:00:33", end_time: "09:55:33", day: "MON" },
  { code: "B3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "TUE" },
  { code: "C3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "WED" },
  { code: "C4", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "WED" },
  { code: "C4", occ: "3,4", start_time: "10:00:33", end_time: "11:55:33", day: "THU" },
  { code: "D3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "TUE" },
  { code: "D4", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "TUE" },
  { code: "E3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "THU" },
  { code: "E4", occ: "3,4", start_time: "10:00:33", end_time: "11:55:33", day: "FRI" },
  { code: "F3", occ: "2,3", start_time: "09:00:33", end_time: "10:55:33", day: "THU" },
  { code: "F4", occ: "3,4", start_time: "10:00:33", end_time: "11:55:33", day: "FRI" },
  { code: "U3", occ: "1,2", start_time: "15:00:33", end_time: "16:55:33", day: "MON" },
  { code: "U3", occ: "3,4", start_time: "15:00:33", end_time: "16:55:33", day: "TUE" },
  { code: "U4", occ: "1,2", start_time: "15:00:33", end_time: "16:55:33", day: "MON" },
  { code: "U4", occ: "3,4", start_time: "15:00:33", end_time: "16:55:33", day: "TUE" },
  { code: "V3", occ: "1,2", start_time: "15:00:33", end_time: "16:55:33", day: "THU" },
  { code: "V4", occ: "1,2", start_time: "15:00:33", end_time: "16:55:33", day: "THU" },
  { code: "V4", occ: "3,4", start_time: "15:00:33", end_time: "16:55:33", day: "FRI" },
  // 4-hour slot
  { code: "D4", occ: "4h", start_time: "09:00:33", end_time: "12:55:33", day: "THU" },
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

// Convert to proper format
const formattedSlots = rawSlots.map(slot => ({
  code: slot.code,
  occ: parseOcc(slot.occ),
  start_time: slot.start_time,
  end_time: slot.end_time,
  day: slot.day,
  is_lab: slot.is_lab || slot.code === 'LAB',
  cluster: getCluster(slot.code, slot.occ)
}))

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
      // Continue anyway as the table might be empty
    }
    
    // Step 1: Delete all existing slots
    console.log('Deleting existing slots...')
    const { error: deleteError } = await supabase
      .from('slot')
      .delete()
      .gte('occ', 0)  // This will delete all slots since occ is always >= 0
    
    if (deleteError) {
      console.error('Error deleting slots:', deleteError)
      return
    }
    
    console.log('Existing slots deleted successfully')
    
    // Step 2: Insert new slots in batches to avoid timeout
    console.log('Inserting new slots...')
    const batchSize = 20
    for (let i = 0; i < formattedSlots.length; i += batchSize) {
      const batch = formattedSlots.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from('slot')
        .insert(batch)
      
      if (insertError) {
        console.error(`Error inserting batch ${i/batchSize + 1}:`, insertError)
        return
      }
      console.log(`Inserted batch ${i/batchSize + 1} (${batch.length} slots)`)
    }
    
    console.log(`Successfully inserted ${formattedSlots.length} slots`)
    
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
    
    // Show sample of inserted data
    console.log('\nSample of inserted slots:')
    verifyData?.slice(0, 5).forEach(slot => {
      console.log(`${slot.code}${slot.occ} - ${slot.day} ${slot.start_time} to ${slot.end_time} ${slot.is_lab ? '(LAB)' : ''}`)
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the update
updateSlots()