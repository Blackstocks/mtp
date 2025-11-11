-- Create teacher table
create table teacher(
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  max_per_day int default 3,
  max_per_week int default 12,
  prefs jsonb default '{}' -- e.g. {"avoid_8am": true, "prefer_days": ["TUE","THU"]}
);

-- Create room table
create table room(
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  capacity int not null,
  kind text not null check (kind in ('CLASS','LAB','DRAWING')),
  tags text[]
);

-- Create course table
create table course(
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  L int default 3, 
  T int default 0, 
  P int default 0
);

-- Create section table
create table section(
  id uuid primary key default gen_random_uuid(),
  program text not null,  -- e.g. 'BTech'
  year int not null,      -- 1..4
  name text not null      -- e.g. 'AE-2Y'
);

-- Create offering table
create table offering(
  id uuid primary key default gen_random_uuid(),
  course_id uuid references course(id) on delete cascade,
  section_id uuid references section(id) on delete cascade,
  teacher_id uuid references teacher(id) on delete set null,
  expected_size int,
  needs text[] -- e.g. {'PC','Projector'}
);

-- Create slot table for concrete weekly slots from the institute matrix
create table slot(
  id uuid primary key default gen_random_uuid(),
  code text not null,          -- 'A','B','C','J'...
  occ int not null,            -- 1,2,3 -> A1/A2...
  day text not null,           -- 'MON'..'FRI'
  start_time time not null,
  end_time time not null,
  cluster text,                -- e.g. 'LAB_J','LAB_M' to group contiguous lab windows
  is_lab boolean default false
);

-- Create availability table
create table availability(
  teacher_id uuid references teacher(id) on delete cascade,
  slot_id uuid references slot(id) on delete cascade,
  can_teach boolean not null,
  primary key (teacher_id, slot_id)
);

-- Create assignment table
create table assignment(
  offering_id uuid references offering(id) on delete cascade,
  slot_id uuid references slot(id) on delete cascade,
  room_id uuid references room(id),
  kind text not null check (kind in ('L','T','P')),
  is_locked boolean default false,  -- facad pins this placement
  primary key (offering_id, kind, slot_id)
);

-- Create indexes for performance
create index idx_offering_teacher on offering(teacher_id);
create index idx_offering_section on offering(section_id);
create index idx_offering_course on offering(course_id);
create index idx_assignment_offering on assignment(offering_id);
create index idx_assignment_slot on assignment(slot_id);
create index idx_assignment_room on assignment(room_id);
create index idx_availability_teacher on availability(teacher_id);
create index idx_availability_slot on availability(slot_id);
create index idx_slot_day on slot(day);
create index idx_slot_cluster on slot(cluster);