import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with env variables
const supabaseUrl = 'https://wmgqkkaholdwhmozqmyr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtZ3Fra2Fob2xkd2htb3pxbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDg5NDgsImV4cCI6MjA3ODMyNDk0OH0.iOdG93N_FOnDvhid7Z5bAjU65SivcYLZFETZ9t0WBQw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Parse the slot code to extract base code and occurrence
function parseSlotCode(slotCode: string): { code: string, occ: number } {
  // Handle LAB slots
  if (slotCode.startsWith('LAB-')) {
    const cluster = slotCode.substring(4)
    // Use ASCII code for cluster letters to get unique occ numbers
    return { code: 'LAB', occ: cluster.charCodeAt(0) }
  }
  
  // Handle H2 specifically (no parentheses)
  if (slotCode === 'H2') {
    return { code: 'H2', occ: 1 }
  }
  
  // Handle slots with parentheses like A3(1), A3(1, 2), D4(4h)
  const match = slotCode.match(/^([A-Z]\d+)\(([^)]+)\)$/)
  if (match) {
    const baseCode = match[1]
    const occPart = match[2]
    
    // Handle special cases
    if (occPart === '4h') return { code: baseCode, occ: 99 }
    
    // Handle comma-separated values like "1, 2" -> combine to 12
    if (occPart.includes(',')) {
      const parts = occPart.split(',').map(p => p.trim())
      const combined = parseInt(parts.join(''))
      return { code: baseCode, occ: combined }
    }
    
    // Simple numeric occ
    return { code: baseCode, occ: parseInt(occPart) }
  }
  
  // Fallback for simple codes like A2, B2, etc.
  return { code: slotCode, occ: 1 }
}

// Complete slot data with proper formatting
const slotData = [
  // 1-hour slots
  { slot_code: "A3(1)", time: "08:00:33–08:55:33", type: "1-hour", cluster: "", day: "MON" },
  { slot_code: "A3(2)", time: "09:00:33–09:55:33", type: "1-hour", cluster: "", day: "MON" },
  { slot_code: "A3(3)", time: "12:00:33–12:55:33", type: "1-hour", cluster: "", day: "TUE" },
  { slot_code: "B3(1)", time: "11:00:33–11:55:33", type: "1-hour", cluster: "", day: "MON" },
  { slot_code: "B3(2)", time: "09:00:33–09:55:33", type: "1-hour", cluster: "", day: "TUE" },
  { slot_code: "B3(3)", time: "10:00:33–10:55:33", type: "1-hour", cluster: "", day: "TUE" },
  { slot_code: "C3(1)", time: "10:00:33–10:55:33", type: "1-hour", cluster: "", day: "MON" },
  { slot_code: "C3(2)", time: "10:00:33–10:55:33", type: "1-hour", cluster: "", day: "WED" },
  { slot_code: "C4(1)", time: "10:00:33–10:55:33", type: "1-hour", cluster: "", day: "MON" },
  { slot_code: "C4(2)", time: "10:00:33–10:55:33", type: "1-hour", cluster: "", day: "WED" },
  { slot_code: "C4(3)", time: "11:00:33–11:55:33", type: "1-hour", cluster: "", day: "WED" },
  { slot_code: "C4(4)", time: "11:00:33–11:55:33", type: "1-hour", cluster: "", day: "THU" },
  { slot_code: "D3(1)", time: "12:00:33–12:55:33", type: "1-hour", cluster: "", day: "MON" },
  { slot_code: "D3(2)", time: "10:00:33–10:55:33", type: "1-hour", cluster: "", day: "TUE" },
  { slot_code: "D3(3)", time: "11:00:33–11:55:33", type: "1-hour", cluster: "", day: "TUE" },
  { slot_code: "D4(1)", time: "12:00:33–12:55:33", type: "1-hour", cluster: "", day: "MON" },
  { slot_code: "D4(2)", time: "10:00:33–10:55:33", type: "1-hour", cluster: "", day: "TUE" },
  { slot_code: "D4(3)", time: "11:00:33–11:55:33", type: "1-hour", cluster: "", day: "TUE" },
  { slot_code: "D4(4)", time: "09:00:33–09:55:33", type: "1-hour", cluster: "", day: "THU" },
  { slot_code: "E3(1)", time: "12:00:33–12:55:33", type: "1-hour", cluster: "", day: "WED" },
  { slot_code: "E3(2)", time: "10:00:33–10:55:33", type: "1-hour", cluster: "", day: "THU" },
  { slot_code: "E3(3)", time: "10:00:33–10:55:33", type: "1-hour", cluster: "", day: "FRI" },
  { slot_code: "E4(1)", time: "12:00:33–12:55:33", type: "1-hour", cluster: "", day: "WED" },
  { slot_code: "E4(2)", time: "11:00:33–11:55:33", type: "1-hour", cluster: "", day: "THU" },
  { slot_code: "E4(3)", time: "11:00:33–11:55:33", type: "1-hour", cluster: "", day: "FRI" },
  { slot_code: "F3(1)", time: "10:00:33–10:55:33", type: "1-hour", cluster: "", day: "WED" },
  { slot_code: "F3(2)", time: "10:00:33–10:55:33", type: "1-hour", cluster: "", day: "THU" },
  { slot_code: "F3(3)", time: "11:00:33–11:55:33", type: "1-hour", cluster: "", day: "FRI" },
  { slot_code: "F4(1)", time: "10:00:33–10:55:33", type: "1-hour", cluster: "", day: "WED" },
  { slot_code: "F4(2)", time: "10:00:33–10:55:33", type: "1-hour", cluster: "", day: "THU" },
  { slot_code: "F4(3)", time: "11:00:33–11:55:33", type: "1-hour", cluster: "", day: "FRI" },
  { slot_code: "F4(4)", time: "11:00:33–11:55:33", type: "1-hour", cluster: "", day: "FRI" },
  { slot_code: "G3(1)", time: "11:00:33–11:55:33", type: "1-hour", cluster: "", day: "WED" },
  { slot_code: "G3(2)", time: "12:00:33–12:55:33", type: "1-hour", cluster: "", day: "THU" },
  { slot_code: "G3(3)", time: "08:00:33–08:55:33", type: "1-hour", cluster: "", day: "FRI" },
  { slot_code: "H3(1)", time: "14:00:33–14:55:33", type: "1-hour", cluster: "", day: "MON" },
  { slot_code: "H3(2)", time: "16:00:33–16:55:33", type: "1-hour", cluster: "", day: "TUE" },
  { slot_code: "H3(3)", time: "16:00:33–16:55:33", type: "1-hour", cluster: "", day: "TUE" },
  { slot_code: "H2", time: "16:00:33–16:55:33", type: "1-hour", cluster: "", day: "TUE" },
  { slot_code: "I2(1)", time: "14:00:33–14:55:33", type: "1-hour", cluster: "", day: "THU" },
  { slot_code: "I2(2)", time: "16:00:33–16:55:33", type: "1-hour", cluster: "", day: "FRI" },
  { slot_code: "S3(1)", time: "17:00:33–17:55:33", type: "1-hour", cluster: "", day: "MON" },
  { slot_code: "S3(2)", time: "17:00:33–17:55:33", type: "1-hour", cluster: "", day: "THU" },
  { slot_code: "S3(3)", time: "17:00:33–17:55:33", type: "1-hour", cluster: "", day: "FRI" },
  { slot_code: "X4(1)", time: "14:00:33–14:55:33", type: "1-hour", cluster: "", day: "WED" },
  { slot_code: "X4(2)", time: "15:00:33–15:55:33", type: "1-hour", cluster: "", day: "WED" },
  { slot_code: "X4(3)", time: "16:00:33–16:55:33", type: "1-hour", cluster: "", day: "WED" },
  { slot_code: "X4(4)", time: "17:00:33–17:55:33", type: "1-hour", cluster: "", day: "WED" },
  
  // 2-hour slots
  { slot_code: "A2", time: "09:00:33–10:55:33", type: "2-hour", cluster: "", day: "THU" },
  { slot_code: "B2", time: "09:00:33–10:55:33", type: "2-hour", cluster: "", day: "TUE" },
  { slot_code: "C2", time: "09:00:33–10:55:33", type: "2-hour", cluster: "", day: "WED" },
  { slot_code: "D2", time: "10:00:33–11:55:33", type: "2-hour", cluster: "", day: "TUE" },
  { slot_code: "E2", time: "10:00:33–11:55:33", type: "2-hour", cluster: "", day: "FRI" },
  { slot_code: "F2", time: "11:00:33–12:55:33", type: "2-hour", cluster: "", day: "THU" },
  { slot_code: "A3(1, 2)", time: "08:00:33–09:55:33", type: "2-hour", cluster: "", day: "MON" },
  { slot_code: "B3(2, 3)", time: "09:00:33–10:55:33", type: "2-hour", cluster: "", day: "TUE" },
  { slot_code: "C3(2, 3)", time: "09:00:33–10:55:33", type: "2-hour", cluster: "", day: "WED" },
  { slot_code: "C4(2, 3)", time: "09:00:33–10:55:33", type: "2-hour", cluster: "", day: "WED" },
  { slot_code: "C4(3, 4)", time: "10:00:33–11:55:33", type: "2-hour", cluster: "", day: "THU" },
  { slot_code: "D3(2, 3)", time: "09:00:33–10:55:33", type: "2-hour", cluster: "", day: "TUE" },
  { slot_code: "D4(2, 3)", time: "09:00:33–10:55:33", type: "2-hour", cluster: "", day: "TUE" },
  { slot_code: "E3(2, 3)", time: "09:00:33–10:55:33", type: "2-hour", cluster: "", day: "THU" },
  { slot_code: "E4(3, 4)", time: "10:00:33–11:55:33", type: "2-hour", cluster: "", day: "FRI" },
  { slot_code: "F3(2, 3)", time: "09:00:33–10:55:33", type: "2-hour", cluster: "", day: "THU" },
  { slot_code: "F4(3, 4)", time: "10:00:33–11:55:33", type: "2-hour", cluster: "", day: "FRI" },
  { slot_code: "U3(1, 2)", time: "15:00:33–16:55:33", type: "2-hour", cluster: "", day: "MON" },
  { slot_code: "U3(3, 4)", time: "15:00:33–16:55:33", type: "2-hour", cluster: "", day: "TUE" },
  { slot_code: "U4(1, 2)", time: "15:00:33–16:55:33", type: "2-hour", cluster: "", day: "MON" },
  { slot_code: "U4(3, 4)", time: "15:00:33–16:55:33", type: "2-hour", cluster: "", day: "TUE" },
  { slot_code: "V3(1, 2)", time: "15:00:33–16:55:33", type: "2-hour", cluster: "", day: "THU" },
  { slot_code: "V4(1, 2)", time: "15:00:33–16:55:33", type: "2-hour", cluster: "", day: "THU" },
  { slot_code: "V4(3, 4)", time: "15:00:33–16:55:33", type: "2-hour", cluster: "", day: "FRI" },
  
  // 4-hour slot
  { slot_code: "D4(4h)", time: "09:00:33–12:55:33", type: "4-hour", cluster: "", day: "THU" },
  
  // Lab slots (3-hour)
  { slot_code: "LAB-Q", time: "10:00:33–12:55:33", type: "Lab (3-hour)", cluster: "Q", day: "MON" },
  { slot_code: "LAB-K", time: "10:00:33–12:55:33", type: "Lab (3-hour)", cluster: "K", day: "TUE" },
  { slot_code: "LAB-R", time: "10:00:33–12:55:33", type: "Lab (3-hour)", cluster: "R", day: "WED" },
  { slot_code: "LAB-M", time: "10:00:33–12:55:33", type: "Lab (3-hour)", cluster: "M", day: "THU" },
  { slot_code: "LAB-O", time: "10:00:33–12:55:33", type: "Lab (3-hour)", cluster: "O", day: "FRI" },
  { slot_code: "LAB-J", time: "14:00:33–16:55:33", type: "Lab (3-hour)", cluster: "J", day: "MON" },
  { slot_code: "LAB-L", time: "14:00:33–16:55:33", type: "Lab (3-hour)", cluster: "L", day: "TUE" },
  { slot_code: "LAB-X", time: "14:00:33–16:55:33", type: "Lab (3-hour)", cluster: "X", day: "WED" },
  { slot_code: "LAB-N", time: "14:00:33–16:55:33", type: "Lab (3-hour)", cluster: "N", day: "THU" },
  { slot_code: "LAB-P", time: "14:00:33–16:55:33", type: "Lab (3-hour)", cluster: "P", day: "FRI" },
]

// Convert to database format
const formattedSlots = slotData.map(slot => {
  const [startTime, endTime] = slot.time.split('–')
  const { code, occ } = parseSlotCode(slot.slot_code)
  
  return {
    code: code,
    occ: occ,
    start_time: startTime,
    end_time: endTime,
    day: slot.day || null,
    is_lab: slot.type.includes("Lab"),
    cluster: slot.cluster || null
  }
})

async function updateSlots() {
  console.log('Starting complete slot update...')
  
  try {
    // First, delete all assignments
    console.log('Deleting existing assignments...')
    const { error: deleteAssignmentsError } = await supabase
      .from('assignment')
      .delete()
      .gte('offering_id', '00000000-0000-0000-0000-000000000000')
    
    if (deleteAssignmentsError) {
      console.log('No assignments to delete or error:', deleteAssignmentsError.message)
    }
    
    // Delete all existing slots
    console.log('Deleting existing slots...')
    const { error: deleteError } = await supabase
      .from('slot')
      .delete()
      .gte('occ', 0)
    
    if (deleteError) {
      console.error('Error deleting slots:', deleteError)
      return
    }
    
    console.log('Existing slots deleted successfully')
    
    // Insert new slots in batches
    console.log('Inserting new slots...')
    const batchSize = 20
    let totalInserted = 0
    
    for (let i = 0; i < formattedSlots.length; i += batchSize) {
      const batch = formattedSlots.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from('slot')
        .insert(batch)
      
      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, insertError)
        console.error('Failed batch:', batch)
        return
      }
      
      totalInserted += batch.length
      console.log(`Inserted batch ${Math.floor(i/batchSize) + 1} (${batch.length} slots) - Total: ${totalInserted}`)
    }
    
    console.log(`Successfully inserted ${totalInserted} slots`)
    
    // Verify insertion and check display
    const { data: verifyData, error: verifyError } = await supabase
      .from('slot')
      .select('*')
      .order('day', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(15)
    
    if (verifyError) {
      console.error('Error verifying slots:', verifyError)
      return
    }
    
    console.log(`\nVerification: Database now contains ${verifyData?.length} slots (showing first 15)`)
    console.log('\nSample of inserted slots with display format:')
    verifyData?.forEach(slot => {
      let displayCode = slot.code
      
      // Format display code based on the rules
      if (slot.code === 'LAB' && slot.cluster) {
        displayCode = `LAB-${slot.cluster}`
      } else if (slot.occ === 99) {
        displayCode = `${slot.code}(4h)`
      } else if (slot.occ > 10 && slot.occ < 100) {
        // This is a combined slot like 12, 23, 34
        const first = Math.floor(slot.occ / 10)
        const second = slot.occ % 10
        displayCode = `${slot.code}(${first}, ${second})`
      } else if (slot.occ !== 1) {
        displayCode = `${slot.code}(${slot.occ})`
      }
      
      console.log(`${displayCode} - ${slot.day || 'N/A'} ${slot.start_time} to ${slot.end_time} ${slot.is_lab ? '(LAB)' : ''} ${slot.cluster ? `[Cluster: ${slot.cluster}]` : ''}`)
    })
    
    console.log('\nSlot update completed successfully!')
    console.log('\nNote: To display slots with brackets in the UI, update the frontend components to format the display based on code and occ values.')
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the update
updateSlots()