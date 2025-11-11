import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

const aerospaceCourses = [
  // 2nd Year Courses
  { code: "AE20202", name: "INTRODUCTION TO FLIGHT VEHICLE CONTROLS", L: 3, T: 0, P: 0 },
  { code: "AE21202", name: "LOW SPEED AERODYNAMICS", L: 3, T: 1, P: 0 },
  { code: "AE21204", name: "INTRODUCTION TO AEROSPACE STRUCTURES", L: 3, T: 1, P: 0 },
  { code: "AE29202", name: "AERODYNAMICS LABORATORY - I", L: 0, T: 0, P: 3 },
  { code: "AE29204", name: "STRUCTURES LABORATORY - I", L: 0, T: 0, P: 3 },
  
  // 3rd Year Courses
  { code: "AE31002", name: "AEROSPACE STRUCTURAL DYNAMICS", L: 3, T: 1, P: 0 },
  { code: "AE31004", name: "AIRCRAFT STABILITY AND CONTROL", L: 3, T: 1, P: 0 },
  { code: "AE31008", name: "THEORY OF JET PROPULSION", L: 3, T: 1, P: 0 },
  { code: "AE39002", name: "SYSTEM LABORATORY", L: 0, T: 0, P: 3 },
  { code: "AE39004", name: "PROPULSION LABORATORY", L: 0, T: 0, P: 3 },
  
  // 4th Year Courses
  { code: "AE40018", name: "INTRODUCTION TO TURBULENCE", L: 3, T: 0, P: 0 },
  { code: "AE40023", name: "INTRODUCTION TO AVIONICS", L: 3, T: 0, P: 0 },
  { code: "AE40026", name: "SPACE DYNAMICS", L: 3, T: 0, P: 0 },
  { code: "AE40031", name: "COMPUTATIONAL FLUID DYNAMICS", L: 3, T: 0, P: 0 },
  { code: "AE40033", name: "FINITE ELEMENT METHODS", L: 3, T: 0, P: 0 },
  { code: "AE49003", name: "AIRCRAFT DESIGN & OPTIMISATION", L: 1, T: 0, P: 3 },
  { code: "AE49012", name: "FLIGHT TESTING LABORATORY", L: 1, T: 0, P: 3 },
  
  // PG/Elective Courses
  { code: "AE60006", name: "INDUSTRIAL AERODYNAMICS", L: 3, T: 0, P: 0 },
  { code: "AE60028", name: "ADVANCED PROPULSION SYSTEMS", L: 3, T: 0, P: 0 },
  { code: "AE60036", name: "FRACTURE MECHANICS", L: 3, T: 0, P: 0 },
  { code: "AE60206", name: "AVIONICS", L: 3, T: 0, P: 0 },
  { code: "AE60208", name: "COMBUSTION OF SOLID FUELS AND PROPELLANTS", L: 3, T: 0, P: 0 },
  { code: "AE61001", name: "COMPUTATIONAL FLUID DYNAMICS", L: 3, T: 1, P: 0 },
  { code: "AE61003", name: "FINITE ELEMENT METHODS", L: 3, T: 1, P: 0 },
  { code: "AE61004", name: "DESIGN OF COMPRESSORS AND TURBINES", L: 3, T: 1, P: 0 },
  { code: "AE61019", name: "SMART STRUCTURES", L: 3, T: 0, P: 0 },
  { code: "AE61026", name: "HYPERSONIC AERODYNAMICS", L: 3, T: 0, P: 0 },
  { code: "AE61032", name: "INTRODUCTION TO TURBULENCE", L: 3, T: 0, P: 0 },
  { code: "AE69006", name: "AEROSPACE LABORATORY II", L: 0, T: 0, P: 3 },
  { code: "AE69208", name: "INNOVATION LABORATORY II", L: 0, T: 0, P: 3 },
  
  // Other Department Core Courses
  { code: "CE13003", name: "ENGINEERING DRAWING AND COMPUTER GRAPHICS", L: 1, T: 0, P: 3 },
  { code: "CS10003", name: "PROGRAMMING AND DATA STRUCTURES", L: 3, T: 0, P: 0 },
  { code: "CS19003", name: "PROGRAMMING AND DATA STRUCTURES LABORATORY", L: 0, T: 0, P: 3 },
  { code: "EE11003", name: "ELECTRICAL TECHNOLOGY", L: 3, T: 1, P: 0 },
  { code: "MA11004", name: "LINEAR ALGEBRA, NUMERICAL", L: 3, T: 1, P: 0 },
  { code: "MA20202", name: "TRANSFORM CALCULUS", L: 3, T: 0, P: 0 },
  { code: "PH11003", name: "PHYSICS OF WAVES", L: 3, T: 1, P: 0 },
  { code: "PH19003", name: "PHYSICS LABORATORY", L: 0, T: 0, P: 3 }
]

export async function POST() {
  try {
    // First check the table structure
    const { data: testData, error: testError } = await supabase
      .from('course')
      .select('*')
      .limit(1)
    
    console.log('Table structure test:', { testData, testError })
    
    // Check if L, T, P columns exist by trying to insert a test record
    const testCourse = {
      code: 'TEST_STRUCT',
      name: 'Structure Test',
      L: 1,
      T: 1,
      P: 1
    }
    
    const { data: structTest, error: structError } = await supabase
      .from('course')
      .upsert(testCourse)
      .select()
      .single()
    
    if (structError && structError.message.includes("column")) {
      // Table structure is wrong, provide instructions
      return NextResponse.json({
        success: false,
        error: 'Course table structure is incorrect',
        message: 'Please run the following SQL in Supabase SQL editor to fix the table structure',
        sql: `
-- Drop the existing course table
DROP TABLE IF EXISTS course CASCADE;

-- Recreate with proper columns
CREATE TABLE course (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  "L" integer DEFAULT 3,
  "T" integer DEFAULT 0,
  "P" integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add index
CREATE INDEX idx_course_code ON course(code);`
      }, { status: 400 })
    }
    
    // Clean up test record if it was created
    if (structTest) {
      await supabase.from('course').delete().eq('code', 'TEST_STRUCT')
    }
    
    // Insert aerospace courses using upsert to handle duplicates
    const { data, error } = await supabase
      .from('course')
      .upsert(aerospaceCourses, { 
        onConflict: 'code',
        ignoreDuplicates: false 
      })
      .select()
    
    if (error) {
      console.error('Error upserting courses:', error)
      throw error
    }
    
    // Count how many were actually inserted/updated
    const courseCount = data?.length || 0
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully loaded ${courseCount} aerospace courses`,
      courses: courseCount,
      details: {
        total: aerospaceCourses.length,
        processed: courseCount
      }
    })
    
  } catch (error: any) {
    console.error('Aerospace courses error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error occurred',
      details: error
    }, { status: 500 })
  }
}