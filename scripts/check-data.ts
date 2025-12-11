import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wmgqkkaholdwhmozqmyr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtZ3Fra2Fob2xkd2htb3pxbXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDg5NDgsImV4cCI6MjA3ODMyNDk0OH0.iOdG93N_FOnDvhid7Z5bAjU65SivcYLZFETZ9t0WBQw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkData() {
  // Check teachers
  const { data: teachers } = await supabase.from('teacher').select('*')
  console.log('Teachers:', teachers?.length || 0)
  
  // Check courses
  const { data: courses } = await supabase.from('course').select('*')
  console.log('Courses:', courses?.length || 0)
  
  // Check sections
  const { data: sections } = await supabase.from('section').select('*')
  console.log('Sections:', sections?.length || 0)
  
  // Check offerings
  const { data: offerings } = await supabase.from('offering').select('*')
  console.log('Offerings:', offerings?.length || 0)
  
  // Check rooms
  const { data: rooms } = await supabase.from('room').select('*')
  console.log('Rooms:', rooms?.length || 0)
  
  // Check slots
  const { data: slots } = await supabase.from('slot').select('*')
  console.log('Slots:', slots?.length || 0)
  
  // Check assignments
  const { data: assignments } = await supabase.from('assignment').select('*')
  console.log('Assignments:', assignments?.length || 0)
  
  if (offerings && offerings.length > 0) {
    console.log('\nSample offering:', offerings[0])
  }
}

checkData()