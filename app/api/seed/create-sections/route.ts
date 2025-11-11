import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function POST() {
  try {
    // Define all sections based on the timetable
    const sections = [
      { 
        program: 'FIRST', 
        year: 1, 
        name: 'FIRST-1'
      },
      { 
        program: 'AE', 
        year: 2, 
        name: 'AE-2A'
      },
      { 
        program: 'AE', 
        year: 3, 
        name: 'AE-3A'
      },
      { 
        program: 'AE', 
        year: 4, 
        name: 'AE-4A'
      },
      { 
        program: 'AE-PG', 
        year: 1, 
        name: 'AE-PG-1'
      }
    ]
    
    // First check if sections already exist
    const { data: existingSections } = await supabase
      .from('section')
      .select('name')
    
    const existingNames = new Set(existingSections?.map(s => s.name) || [])
    const sectionsToCreate = sections.filter(s => !existingNames.has(s.name))
    
    if (sectionsToCreate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All sections already exist',
        sections: existingSections
      })
    }
    
    // Insert only new sections
    const { data, error } = await supabase
      .from('section')
      .insert(sectionsToCreate)
      .select()
    
    if (error) {
      throw new Error(`Failed to create sections: ${error.message}`)
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully created ${data?.length || 0} sections`,
      sections: data
    })
    
  } catch (error: any) {
    console.error('Create sections error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}