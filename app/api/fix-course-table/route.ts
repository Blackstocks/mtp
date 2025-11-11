import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function POST() {
  try {
    // First check if the table has the wrong structure
    const { data: tableInfo, error: infoError } = await supabase
      .rpc('get_table_columns', { table_name: 'course' })
      .single()

    if (infoError && !infoError.message.includes('Could not find')) {
      // If the RPC doesn't exist, let's try a different approach
      console.log('RPC not available, checking table structure directly')
    }

    // Drop and recreate the course table with proper structure
    const sqlCommands = [
      'DROP TABLE IF EXISTS course CASCADE',
      `CREATE TABLE course (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code text UNIQUE NOT NULL,
        name text NOT NULL,
        "L" integer DEFAULT 3,
        "T" integer DEFAULT 0,
        "P" integer DEFAULT 0,
        created_at timestamptz DEFAULT now()
      )`,
      'CREATE INDEX idx_course_code ON course(code)',
      `COMMENT ON COLUMN course."L" IS 'Lecture hours per week'`,
      `COMMENT ON COLUMN course."T" IS 'Tutorial hours per week'`,
      `COMMENT ON COLUMN course."P" IS 'Practical/Lab hours per week'`
    ]

    // Execute each command
    for (const sql of sqlCommands) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
      if (error && !error.message.includes('exec_sql')) {
        console.error('Error executing SQL:', error)
      }
    }

    // Verify the table structure
    const { data: testInsert, error: testError } = await supabase
      .from('course')
      .insert({ 
        code: 'TEST001', 
        name: 'Test Course',
        L: 3,
        T: 1,
        P: 0
      })
      .select()
      .single()

    if (testError) {
      throw new Error(`Table structure test failed: ${testError.message}`)
    }

    // Clean up test data
    await supabase.from('course').delete().eq('code', 'TEST001')

    return NextResponse.json({ 
      success: true, 
      message: 'Course table structure fixed successfully',
      testResult: testInsert
    })
  } catch (error: any) {
    console.error('Fix course table error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      suggestion: 'Please run the migration manually in Supabase SQL editor'
    }, { status: 500 })
  }
}