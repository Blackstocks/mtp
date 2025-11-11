# Teacher-Centric Timetable Scheduler

## Overview

This is a comprehensive timetable scheduling system designed for educational institutions, with a focus on teacher availability and preferences. The system uses constraint programming (Google OR-Tools) to generate optimal schedules while respecting hard constraints and minimizing soft constraint violations.

## Architecture

- **Frontend**: Next.js 14 (App Router) with TypeScript, Tailwind CSS, and shadcn/ui
- **Database**: Supabase/PostgreSQL
- **Solver**: Python FastAPI microservice using Google OR-Tools CP-SAT
- **State Management**: @tanstack/react-query
- **Drag & Drop**: @dnd-kit/core

## Features

### Core Functionality
- **Teacher Availability Management**: Visual grid editor for marking available time slots
- **Smart Scheduling**: AI-powered constraint solver that respects:
  - Teacher availability and preferences
  - Room capacity and type requirements
  - Section conflicts (no double-booking)
  - Lab session contiguity (2-3 hour blocks)
  - Maximum classes per day/week limits
  
### Interactive Features
- **Drag & Drop Editor**: Move classes between time slots with automatic re-optimization
- **Lock/Unlock**: Pin specific assignments that shouldn't be moved
- **Recommendations Panel**: Get ranked alternative placements for any class
- **Multi-View**: Switch between section-wise and teacher-wise views

### Administrative Tools
- Full CRUD for teachers, rooms, courses, and offerings
- Slot matrix configuration (IIT KGP style or custom)
- CSV import/export for bulk data management
- PDF export for printed timetables

## Installation

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker (optional)
- Supabase account

### Setup Steps

1. **Clone and install dependencies**
```bash
npm install
cd solver && pip install -r requirements.txt && cd ..
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

3. **Run database migrations**
```bash
# In Supabase dashboard, run the SQL from supabase/migrations/001_create_tables.sql
```

4. **Start services**

Option A: Local development
```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start solver
npm run dev:solver
```

Option B: Using Docker
```bash
docker-compose up
```

## Usage Guide

### Initial Setup

1. **Import Base Data**
   - Navigate to `/admin/slot-matrix`
   - Click "Load Default IIT KGP Grid" or create custom slots
   - Upload CSV files at `/api/seed/import` endpoint

2. **Configure Teachers**
   - Add teachers at `/admin/teachers`
   - Set max classes per day/week
   - Configure preferences (avoid 8am, preferred days)
   - Click calendar icon to set availability

3. **Create Offerings**
   - Add courses with L-T-P structure
   - Create sections (BTech 1st Year, etc.)
   - Link courses to sections with teacher assignments

### Generating Timetables

1. Navigate to `/admin/timetable`
2. Click "Generate Schedule" for initial creation
3. Select view type (By Section or By Teacher)
4. Choose specific section/teacher from dropdown

### Manual Adjustments

1. **Drag & Drop**
   - Click and drag any unlocked class to a new slot
   - System automatically re-optimizes remaining classes

2. **Using Recommendations**
   - Click on any class to select it
   - View ranked alternatives in right panel
   - Click "Apply This Option" to move

3. **Locking Classes**
   - Click lock icon to prevent changes
   - Locked classes stay fixed during re-optimization

## API Endpoints

### Seed Data Import
- `POST /api/seed/import` - Import CSV files (multipart/form-data)

### Solver Integration
- `POST /api/solver/generate` - Generate complete timetable
- `POST /api/solver/reoptimize` - Re-optimize with locked assignments
- `POST /api/recommendations` - Get placement recommendations

### Export
- `GET /api/export/section/:id.csv` - Export section timetable
- `GET /api/export/teacher/:id.csv` - Export teacher timetable

## Database Schema

Key tables:
- `teacher` - Faculty members with preferences
- `room` - Classrooms and labs with capacity
- `course` - Course definitions with L-T-P hours
- `section` - Student groups (e.g., BTech-AE-1Y)
- `offering` - Links courses to sections with teachers
- `slot` - Time slots in weekly schedule
- `availability` - Teacher availability matrix
- `assignment` - Final timetable entries

## Constraint Model

### Hard Constraints (Must Satisfy)
1. Teacher can only teach when available
2. No teacher/room/section double-booking
3. Room capacity ≥ expected class size
4. Room type matches requirement (CLASS/LAB)
5. All L-T-P hours must be covered
6. Lab sessions use contiguous slot clusters

### Soft Constraints (Minimized)
1. Teacher preferences (avoid 8am, preferred days)
2. Max classes per day/week limits
3. Minimize gaps in section schedules
4. Spread lectures across the week

## Development

### Running Tests
```bash
npm test              # Unit tests
npm run test:e2e     # End-to-end tests with Playwright
```

### Solver Development
```bash
cd solver
pytest               # Run solver tests
python main.py       # Start solver in debug mode
```

## Troubleshooting

### Common Issues

1. **Solver connection failed**
   - Ensure solver is running on port 8001
   - Check SOLVER_URL in .env

2. **No valid schedule found**
   - Check teacher availability is sufficient
   - Verify room capacity constraints
   - Review slot matrix configuration

3. **Drag & drop not working**
   - Ensure assignment is not locked
   - Check for conflicts in target slot

## Screenshots

[Add screenshots here showing:
1. Teacher availability editor
2. Timetable grid with drag & drop
3. Recommendations panel
4. Section and teacher views]

## License

MIT License - See LICENSE file for details