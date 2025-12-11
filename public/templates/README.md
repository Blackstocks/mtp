# CSV Import Templates Guide

This folder contains CSV templates for importing data into the Timetable Scheduling System.

## Import Order

**IMPORTANT**: Files must be imported in this specific order to maintain referential integrity:

1. **teachers.csv** - Faculty members
2. **rooms.csv** - Classrooms and labs
3. **courses.csv** - Course definitions
4. **sections.csv** - Student sections
5. **offerings.csv** - Course-teacher-section mappings (requires teachers, courses, and sections)
6. **slots.csv** - Time slots

## File Specifications

### teachers.csv
- **name**: Full name of the teacher (required)
- **email**: Unique email address - used as reference in offerings.csv (required)
- **designation**: Job title (optional)
- **max_hours_per_day**: Maximum teaching hours per day (default: 6)
- **max_hours_per_week**: Maximum teaching hours per week (default: 20)
- **avoid_early_morning**: true/false - preference to avoid 8 AM slot (default: false)

### courses.csv
- **code**: Unique course code, e.g., "CS101" (required)
- **name**: Full course name (required)
- **L**: Lecture hours per week (default: 0)
- **T**: Tutorial hours per week (default: 0)
- **P**: Practical/Lab hours per week in 3-hour blocks (default: 0)
- **credits**: Course credits (optional)

### rooms.csv
- **code**: Unique room identifier, e.g., "L101" (required)
- **capacity**: Maximum student capacity (required)
- **kind**: One of "classroom", "lab", or "tutorial" (required)
- **tags**: Features separated by semicolon, e.g., "projector;ac;whiteboard" (optional)

### sections.csv
- **name**: Section identifier, e.g., "CSE-1A" (required)
- **program**: Department/Program name, e.g., "Computer Science" (required)
- **year**: Academic year - 1, 2, 3, or 4 (required)
- **student_count**: Number of students in the section (default: 60)

### offerings.csv
- **course_code**: Must match a code from courses.csv (required)
- **section_name**: Must match a name from sections.csv (required)
- **teacher_email**: Must match an email from teachers.csv (required)
- **needs**: Special requirements separated by semicolon, e.g., "projector;computers" (optional)

### slots.csv
- **day**: One of MON, TUE, WED, THU, FRI (required)
- **start_time**: 24-hour format HH:MM:SS, e.g., "09:00:00" (required)
- **end_time**: 24-hour format HH:MM:SS, e.g., "09:55:00" (required)
- **is_lab**: true for 3-hour lab slots, false for theory slots (required)

## Tips for Successful Import

1. **Check References**: Ensure all foreign key references match exactly:
   - offerings.csv references emails from teachers.csv
   - offerings.csv references codes from courses.csv
   - offerings.csv references names from sections.csv

2. **Time Format**: Use 24-hour format with seconds (HH:MM:SS) for time fields

3. **Boolean Values**: Use "true" or "false" (lowercase) for boolean fields

4. **Empty Fields**: Leave optional fields empty rather than using "null" or "N/A"

5. **No Headers**: The first row should be the header row with column names

6. **UTF-8 Encoding**: Save all CSV files in UTF-8 encoding to support special characters

7. **Lab Slots**: For practical courses (P > 0), ensure you have 3-hour lab slots available

## Example Data

See the template files for example data that follows the correct format.

## Troubleshooting

- **Import Failed**: Check the error messages for specific row numbers and field issues
- **Foreign Key Errors**: Verify that referenced values exist in the parent tables
- **Time Format Errors**: Ensure times are in HH:MM:SS format
- **Duplicate Key Errors**: Check for duplicate codes, emails, or section names