#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { parse } = require('csv-parse/sync')

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
}

function validateCSVFiles() {
  console.log(`${colors.blue}CSV Validation Tool for Timetable System${colors.reset}\n`)
  
  const errors = []
  const warnings = []
  const success = []
  
  // Check if files exist
  const requiredFiles = [
    'teachers.csv',
    'courses.csv',
    'rooms.csv',
    'sections.csv',
    'offerings.csv',
    'slots.csv'
  ]
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file))
  if (missingFiles.length > 0) {
    console.log(`${colors.red}Missing required files:${colors.reset}`)
    missingFiles.forEach(file => console.log(`  - ${file}`))
    console.log('\nPlease ensure all CSV files are in the current directory.')
    process.exit(1)
  }
  
  // Validate Teachers
  console.log(`\n${colors.blue}Validating teachers.csv...${colors.reset}`)
  try {
    const content = fs.readFileSync('teachers.csv', 'utf-8')
    const records = parse(content, { columns: true, skip_empty_lines: true })
    
    const emails = new Set()
    records.forEach((record, index) => {
      const row = index + 2
      
      if (!record.name?.trim()) {
        errors.push(`teachers.csv row ${row}: Missing name`)
      }
      
      if (!record.email?.trim()) {
        errors.push(`teachers.csv row ${row}: Missing email`)
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
        errors.push(`teachers.csv row ${row}: Invalid email format: ${record.email}`)
      } else if (emails.has(record.email)) {
        errors.push(`teachers.csv row ${row}: Duplicate email: ${record.email}`)
      } else {
        emails.add(record.email)
      }
      
      if (record.max_hours_per_day && isNaN(parseInt(record.max_hours_per_day))) {
        errors.push(`teachers.csv row ${row}: max_hours_per_day must be a number`)
      }
      
      if (record.max_hours_per_week && isNaN(parseInt(record.max_hours_per_week))) {
        errors.push(`teachers.csv row ${row}: max_hours_per_week must be a number`)
      }
      
      if (record.avoid_early_morning && !['true', 'false'].includes(record.avoid_early_morning.toLowerCase())) {
        errors.push(`teachers.csv row ${row}: avoid_early_morning must be true or false`)
      }
    })
    
    success.push(`teachers.csv: ${records.length} records validated`)
  } catch (e) {
    errors.push(`teachers.csv: ${e.message}`)
  }
  
  // Validate Courses
  console.log(`\n${colors.blue}Validating courses.csv...${colors.reset}`)
  try {
    const content = fs.readFileSync('courses.csv', 'utf-8')
    const records = parse(content, { columns: true, skip_empty_lines: true })
    
    const codes = new Set()
    records.forEach((record, index) => {
      const row = index + 2
      
      if (!record.code?.trim()) {
        errors.push(`courses.csv row ${row}: Missing code`)
      } else if (codes.has(record.code)) {
        errors.push(`courses.csv row ${row}: Duplicate code: ${record.code}`)
      } else {
        codes.add(record.code)
      }
      
      if (!record.name?.trim()) {
        errors.push(`courses.csv row ${row}: Missing name`)
      }
      
      ['L', 'T', 'P'].forEach(field => {
        if (record[field] && isNaN(parseInt(record[field]))) {
          errors.push(`courses.csv row ${row}: ${field} must be a number`)
        }
      })
      
      if (record.credits && isNaN(parseFloat(record.credits))) {
        errors.push(`courses.csv row ${row}: credits must be a number`)
      }
    })
    
    success.push(`courses.csv: ${records.length} records validated`)
  } catch (e) {
    errors.push(`courses.csv: ${e.message}`)
  }
  
  // Validate Rooms
  console.log(`\n${colors.blue}Validating rooms.csv...${colors.reset}`)
  try {
    const content = fs.readFileSync('rooms.csv', 'utf-8')
    const records = parse(content, { columns: true, skip_empty_lines: true })
    
    const roomCodes = new Set()
    records.forEach((record, index) => {
      const row = index + 2
      
      if (!record.code?.trim()) {
        errors.push(`rooms.csv row ${row}: Missing code`)
      } else if (roomCodes.has(record.code)) {
        errors.push(`rooms.csv row ${row}: Duplicate code: ${record.code}`)
      } else {
        roomCodes.add(record.code)
      }
      
      if (!record.capacity || isNaN(parseInt(record.capacity))) {
        errors.push(`rooms.csv row ${row}: capacity must be a number`)
      }
      
      const validKinds = ['classroom', 'lab', 'tutorial']
      if (!record.kind || !validKinds.includes(record.kind.toLowerCase())) {
        errors.push(`rooms.csv row ${row}: kind must be one of: ${validKinds.join(', ')}`)
      }
    })
    
    success.push(`rooms.csv: ${records.length} records validated`)
  } catch (e) {
    errors.push(`rooms.csv: ${e.message}`)
  }
  
  // Validate Sections
  console.log(`\n${colors.blue}Validating sections.csv...${colors.reset}`)
  try {
    const content = fs.readFileSync('sections.csv', 'utf-8')
    const records = parse(content, { columns: true, skip_empty_lines: true })
    
    const sectionNames = new Set()
    records.forEach((record, index) => {
      const row = index + 2
      
      if (!record.name?.trim()) {
        errors.push(`sections.csv row ${row}: Missing name`)
      } else if (sectionNames.has(record.name)) {
        errors.push(`sections.csv row ${row}: Duplicate name: ${record.name}`)
      } else {
        sectionNames.add(record.name)
      }
      
      if (!record.program?.trim()) {
        errors.push(`sections.csv row ${row}: Missing program`)
      }
      
      if (!record.year || isNaN(parseInt(record.year))) {
        errors.push(`sections.csv row ${row}: year must be a number`)
      } else {
        const year = parseInt(record.year)
        if (year < 1 || year > 4) {
          errors.push(`sections.csv row ${row}: year must be between 1 and 4`)
        }
      }
      
      if (record.student_count && isNaN(parseInt(record.student_count))) {
        errors.push(`sections.csv row ${row}: student_count must be a number`)
      }
    })
    
    success.push(`sections.csv: ${records.length} records validated`)
  } catch (e) {
    errors.push(`sections.csv: ${e.message}`)
  }
  
  // Validate Slots
  console.log(`\n${colors.blue}Validating slots.csv...${colors.reset}`)
  try {
    const content = fs.readFileSync('slots.csv', 'utf-8')
    const records = parse(content, { columns: true, skip_empty_lines: true })
    
    const slotKeys = new Set()
    records.forEach((record, index) => {
      const row = index + 2
      
      const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI']
      if (!record.day || !validDays.includes(record.day)) {
        errors.push(`slots.csv row ${row}: day must be one of: ${validDays.join(', ')}`)
      }
      
      const timeRegex = /^\d{2}:\d{2}:\d{2}$/
      if (!record.start_time || !timeRegex.test(record.start_time)) {
        errors.push(`slots.csv row ${row}: start_time must be in HH:MM:SS format`)
      }
      
      if (!record.end_time || !timeRegex.test(record.end_time)) {
        errors.push(`slots.csv row ${row}: end_time must be in HH:MM:SS format`)
      }
      
      if (!['true', 'false'].includes(record.is_lab?.toLowerCase())) {
        errors.push(`slots.csv row ${row}: is_lab must be true or false`)
      }
      
      const slotKey = `${record.day}-${record.start_time}`
      if (slotKeys.has(slotKey)) {
        warnings.push(`slots.csv row ${row}: Duplicate slot at ${record.day} ${record.start_time}`)
      } else {
        slotKeys.add(slotKey)
      }
    })
    
    success.push(`slots.csv: ${records.length} records validated`)
  } catch (e) {
    errors.push(`slots.csv: ${e.message}`)
  }
  
  // Validate Offerings (with reference checks)
  console.log(`\n${colors.blue}Validating offerings.csv...${colors.reset}`)
  try {
    const content = fs.readFileSync('offerings.csv', 'utf-8')
    const records = parse(content, { columns: true, skip_empty_lines: true })
    
    // Load reference data
    const teacherEmails = new Set()
    const courseCodes = new Set()
    const sectionNames = new Set()
    
    try {
      const teachers = parse(fs.readFileSync('teachers.csv', 'utf-8'), { columns: true })
      teachers.forEach(t => teacherEmails.add(t.email))
      
      const courses = parse(fs.readFileSync('courses.csv', 'utf-8'), { columns: true })
      courses.forEach(c => courseCodes.add(c.code))
      
      const sections = parse(fs.readFileSync('sections.csv', 'utf-8'), { columns: true })
      sections.forEach(s => sectionNames.add(s.name))
    } catch (e) {
      warnings.push(`Could not load reference data for offerings validation: ${e.message}`)
    }
    
    const offeringKeys = new Set()
    records.forEach((record, index) => {
      const row = index + 2
      
      if (!record.course_code?.trim()) {
        errors.push(`offerings.csv row ${row}: Missing course_code`)
      } else if (courseCodes.size > 0 && !courseCodes.has(record.course_code)) {
        errors.push(`offerings.csv row ${row}: course_code "${record.course_code}" not found in courses.csv`)
      }
      
      if (!record.section_name?.trim()) {
        errors.push(`offerings.csv row ${row}: Missing section_name`)
      } else if (sectionNames.size > 0 && !sectionNames.has(record.section_name)) {
        errors.push(`offerings.csv row ${row}: section_name "${record.section_name}" not found in sections.csv`)
      }
      
      if (!record.teacher_email?.trim()) {
        errors.push(`offerings.csv row ${row}: Missing teacher_email`)
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.teacher_email)) {
        errors.push(`offerings.csv row ${row}: Invalid email format: ${record.teacher_email}`)
      } else if (teacherEmails.size > 0 && !teacherEmails.has(record.teacher_email)) {
        errors.push(`offerings.csv row ${row}: teacher_email "${record.teacher_email}" not found in teachers.csv`)
      }
      
      const offeringKey = `${record.course_code}-${record.section_name}`
      if (offeringKeys.has(offeringKey)) {
        warnings.push(`offerings.csv row ${row}: Duplicate offering for ${record.course_code} in ${record.section_name}`)
      } else {
        offeringKeys.add(offeringKey)
      }
    })
    
    success.push(`offerings.csv: ${records.length} records validated`)
  } catch (e) {
    errors.push(`offerings.csv: ${e.message}`)
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log(`${colors.blue}Validation Summary${colors.reset}`)
  console.log('='.repeat(50))
  
  if (success.length > 0) {
    console.log(`\n${colors.green}✓ Successful validations:${colors.reset}`)
    success.forEach(msg => console.log(`  ${msg}`))
  }
  
  if (warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠ Warnings:${colors.reset}`)
    warnings.forEach(msg => console.log(`  ${msg}`))
  }
  
  if (errors.length > 0) {
    console.log(`\n${colors.red}✗ Errors found:${colors.reset}`)
    errors.forEach(msg => console.log(`  ${msg}`))
    console.log(`\n${colors.red}Please fix the errors above before importing.${colors.reset}`)
    process.exit(1)
  } else {
    console.log(`\n${colors.green}✓ All validations passed! Your CSV files are ready for import.${colors.reset}`)
  }
}

// Run validation
validateCSVFiles()