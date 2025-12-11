-- =====================================================
-- SQL Script to Insert New Timetable Data
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Clear existing data (in order due to foreign keys)
DELETE FROM assignment;
DELETE FROM availability;
DELETE FROM offering;
DELETE FROM course;
DELETE FROM section;
DELETE FROM teacher;

-- Step 2: Insert All Teachers (code + full name)
INSERT INTO teacher (code, name, max_per_day, max_per_week, prefs) VALUES
  ('NKG', 'N.K. Ghosh', 3, 12, '{}'),
  ('SDD', 'S.D. Das', 3, 12, '{}'),
  ('MMB', 'M.M. Barman', 3, 12, '{}'),
  ('AP', 'A. Paul', 3, 12, '{}'),
  ('MRS', 'M.R. Sharma', 3, 12, '{}'),
  ('MS', 'M. Sen', 3, 12, '{}'),
  ('DRC', 'D.R. Chowdhury', 3, 12, '{}'),
  ('PD', 'P. Das', 3, 12, '{}'),
  ('SA', 'S. Adhikari', 3, 12, '{}'),
  ('SPP', 'S.P. Pal', 3, 12, '{}'),
  ('SMD', 'S.M. Dutta', 3, 12, '{}'),
  ('PPC', 'P.P. Chakrabarti', 3, 12, '{}'),
  ('TD', 'T. Das', 3, 12, '{}'),
  ('CSM', 'C.S. Mukherjee', 3, 12, '{}'),
  ('TTD', 'T.T. Dutta', 3, 12, '{}'),
  ('JC', 'J. Chakraborty', 3, 12, '{}'),
  ('JM', 'J. Mukhopadhyay', 3, 12, '{}'),
  ('SKG', 'S.K. Ghoshal', 3, 12, '{}'),
  ('AKD', 'A.K. Das', 3, 12, '{}'),
  ('DR', 'D. Roy', 3, 12, '{}'),
  ('AG', 'A. Ghosh', 3, 12, '{}'),
  ('PRC', 'P.R. Chowdhury', 3, 12, '{}'),
  ('AC', 'A. Chakraborty', 3, 12, '{}'),
  ('SH', 'S. Hazra', 3, 12, '{}'),
  ('MB', 'M. Banerjee', 3, 12, '{}'),
  ('AR', 'A. Roy', 3, 12, '{}'),
  ('HHS', 'H.H. Singh', 3, 12, '{}'),
  ('SKS', 'S.K. Sanyal', 3, 12, '{}'),
  ('PB', 'P. Biswas', 3, 12, '{}'),
  ('AD', 'A. Das', 3, 12, '{}'),
  ('DG', 'D. Goswami', 3, 12, '{}'),
  ('DD', 'D. Das', 3, 12, '{}'),
  ('SD', 'S. Dey', 3, 12, '{}'),
  ('KM', 'K. Mukhopadhyay', 3, 12, '{}'),
  ('RJ', 'R. Jha', 3, 12, '{}'),
  ('SK', 'S. Kumar', 3, 12, '{}'),
  ('HPS', 'H.P. Sudarshan', 3, 12, '{}'),
  ('MK', 'M. Kumar', 3, 12, '{}'),
  ('SM', 'S. Mukhopadhyay', 3, 12, '{}'),
  ('PJ', 'P. Jana', 3, 12, '{}'),
  ('KPS', 'K.P. Sharma', 3, 12, '{}'),
  ('AB', 'A. Bhattacharya', 3, 12, '{}'),
  ('SKP', 'S.K. Patra', 3, 12, '{}'),
  ('KD', 'K. Das', 3, 12, '{}'),
  ('PSB', 'P.S. Bhattacharya', 3, 12, '{}'),
  ('PC', 'P. Chaudhuri', 3, 12, '{}'),
  ('PP', 'P. Pal', 3, 12, '{}'),
  ('MM', 'M. Mondal', 3, 12, '{}'),
  ('SS', 'S. Sarkar', 3, 12, '{}'),
  ('MC', 'M. Chanda', 3, 12, '{}'),
  ('SCP', 'S.C. Prasad', 3, 12, '{}'),
  ('RN', 'R. Nayak', 3, 12, '{}'),
  ('DKM', 'D.K. Maiti', 3, 12, '{}'),
  ('ADG', 'A.D. Gupta', 3, 12, '{}'),
  ('DC', 'D. Chattopadhyay', 3, 12, '{}'),
  ('AH', 'A. Hazra', 3, 12, '{}'),
  ('SB', 'S. Basu', 3, 12, '{}'),
  ('SG', 'S. Ganguly', 3, 12, '{}'),
  ('NKP', 'N.K. Pal', 3, 12, '{}');

-- Step 3: Insert Sections
INSERT INTO section (program, year, name) VALUES
  ('BTech', 1, 'AE-1Y'),
  ('BTech', 2, 'AE-2Y'),
  ('BTech', 3, 'AE-3Y'),
  ('BTech', 4, 'AE-4Y'),
  ('MTech', 1, 'AE-M1'),
  ('MTech', 2, 'AE-M2');

-- Step 4: Insert Courses
INSERT INTO course (code, name, "L", "T", "P") VALUES
  -- 1st Year Courses
  ('ME10001', 'Basic Engineering Mechanics', 3, 1, 0),
  ('CE13001', 'Engg. Drawing & Computer Graphics', 1, 0, 3),
  ('EN19003', '1st Year Engg. Lab', 0, 0, 3),

  -- 2nd Year Courses (BTech)
  ('AE21202', 'Low Speed Aerodynamics', 3, 1, 0),
  ('AE21204', 'Introduction to Aerospace Structures', 3, 1, 0),
  ('AE20202', 'Introduction to Flight Vehicle Controls', 3, 0, 0),
  ('AE29202', 'Aerodynamics Laboratory-I', 0, 0, 3),
  ('AE29204', 'Structures Laboratory-I', 0, 0, 3),

  -- 3rd Year Courses (BTech)
  ('AE39002', 'Systems Laboratory', 0, 0, 3),
  ('AE39004', 'Propulsion Laboratory', 0, 0, 3),
  ('AE31002', 'Aerospace Structural Dynamics', 3, 1, 0),
  ('AE31004', 'Aircraft Stability and Control', 3, 1, 0),
  ('AE31008', 'Theory of Jet Propulsion', 3, 1, 0),

  -- 4th Year Courses (BTech)
  ('AE49012', 'Flight Testing Lab', 0, 0, 3),
  ('AE40026', 'Space Dynamics', 3, 0, 0),
  ('AE49003', 'Aircraft Design Optimization', 1, 0, 3),
  ('AE40018', 'Introduction to Turbulence', 3, 0, 0),
  ('AE40031', 'Computational Fluid Dynamics', 3, 0, 0),
  ('AE40003', 'Finite Element Method', 3, 0, 0),

  -- MTech Courses
  ('AE69006', 'Aerospace Laboratory-II', 0, 0, 3),
  ('AE69208', 'Innovation Lab-II', 0, 0, 3),
  ('AE69002', 'Seminar-II', 0, 0, 3),
  ('AE51003', 'Applied Elasticity and Plasticity', 3, 0, 0),
  ('AE60006', 'Industrial Aerodynamics', 3, 0, 0),
  ('AE61004', 'Design of Compressors and Turbines', 3, 1, 0),
  ('AE61017', 'Hypersonic Aerodynamics', 3, 0, 0),
  ('AE61019', 'Smart Structures', 3, 0, 0),
  ('AE60208', 'Combustion of Solid fuels and Propellants', 3, 0, 0),
  ('AE60028', 'Advanced Propulsion System', 3, 0, 0),
  ('AE60036', 'Fracture Mechanics', 3, 0, 0),
  ('AE60002', 'Principles of Satellite and Inertial Navigation Systems', 3, 0, 0),
  ('AE60204', 'Flight Vehicle Control', 3, 0, 0),
  ('AE61202', 'Aircraft Dynamics', 3, 1, 0),
  ('AE61001', 'Computational Fluid Dynamics (MTech)', 3, 1, 0),
  ('AE61003', 'Finite Element Method (MTech)', 3, 1, 0),
  ('AE60019', 'Applied Elasticity and Plasticity (MTech)', 3, 0, 0),
  ('AE60030', 'Space Dynamics (MTech)', 3, 0, 0),
  ('AE61032', 'Introduction to Turbulence (MTech)', 3, 0, 0);

-- Step 5: Insert Offerings (linking courses to sections and teachers)

-- =====================================================
-- 1st Year Offerings (AE-1Y)
-- =====================================================

-- ME10001 - Basic Engineering Mechanics - Teacher: RJ (R. Jha)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 60, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'ME10001' AND s.name = 'AE-1Y' AND t.code = 'RJ';

-- CE13001 - Engg. Drawing & Computer Graphics - Teacher: MK (M. Kumar)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 60, ARRAY['Drawing Board']::text[]
FROM course c, section s, teacher t
WHERE c.code = 'CE13001' AND s.name = 'AE-1Y' AND t.code = 'MK';

-- EN19003 - 1st Year Engg. Lab - Teacher: SH (S. Hazra)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 60, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'EN19003' AND s.name = 'AE-1Y' AND t.code = 'SH';

-- =====================================================
-- 2nd Year Offerings (AE-2Y)
-- =====================================================

-- AE21202 - Low Speed Aerodynamics - Teacher: SG (S. Ganguly)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 60, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE21202' AND s.name = 'AE-2Y' AND t.code = 'SG';

-- AE21204 - Introduction to Aerospace Structures - Teacher: PJ (P. Jana)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 60, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE21204' AND s.name = 'AE-2Y' AND t.code = 'PJ';

-- AE20202 - Introduction to Flight Vehicle Controls - Teacher: SH (S. Hazra)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 60, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE20202' AND s.name = 'AE-2Y' AND t.code = 'SH';

-- AE29202 - Aerodynamics Laboratory-I - Teacher: SMD (S.M. Dutta)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 60, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE29202' AND s.name = 'AE-2Y' AND t.code = 'SMD';

-- AE29204 - Structures Laboratory-I - Teacher: MM (M. Mondal)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 60, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE29204' AND s.name = 'AE-2Y' AND t.code = 'MM';

-- =====================================================
-- 3rd Year Offerings (AE-3Y)
-- =====================================================

-- AE39002 - Systems Laboratory - Teacher: NKP (N.K. Pal)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 60, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE39002' AND s.name = 'AE-3Y' AND t.code = 'NKP';

-- AE39004 - Propulsion Laboratory - Teacher: SK (S. Kumar)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 60, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE39004' AND s.name = 'AE-3Y' AND t.code = 'SK';

-- AE31002 - Aerospace Structural Dynamics - Teacher: DKM (D.K. Maiti)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 60, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE31002' AND s.name = 'AE-3Y' AND t.code = 'DKM';

-- AE31004 - Aircraft Stability and Control - Teacher: MS (M. Sen)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 60, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE31004' AND s.name = 'AE-3Y' AND t.code = 'MS';

-- AE31008 - Theory of Jet Propulsion - Teacher: ADG (A.D. Gupta)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 60, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE31008' AND s.name = 'AE-3Y' AND t.code = 'ADG';

-- =====================================================
-- 4th Year Offerings (AE-4Y)
-- =====================================================

-- AE49012 - Flight Testing Lab - Teacher: SS (S. Sarkar)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 40, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE49012' AND s.name = 'AE-4Y' AND t.code = 'SS';

-- AE40026 - Space Dynamics - Teacher: MS (M. Sen)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 40, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE40026' AND s.name = 'AE-4Y' AND t.code = 'MS';

-- AE49003 - Aircraft Design Optimization - Teacher: AG (A. Ghosh)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 40, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE49003' AND s.name = 'AE-4Y' AND t.code = 'AG';

-- AE40018 - Introduction to Turbulence - Teacher: SG (S. Ganguly)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 40, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE40018' AND s.name = 'AE-4Y' AND t.code = 'SG';

-- AE40031 - Computational Fluid Dynamics - Teacher: AR (A. Roy)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 40, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE40031' AND s.name = 'AE-4Y' AND t.code = 'AR';

-- AE40003 - Finite Element Method - Teacher: MRS (M.R. Sharma)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 40, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE40003' AND s.name = 'AE-4Y' AND t.code = 'MRS';

-- =====================================================
-- MTech 1st Year Offerings (AE-M1)
-- =====================================================

-- AE51003 - Applied Elasticity and Plasticity - Teacher: PJ (P. Jana)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 30, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE51003' AND s.name = 'AE-M1' AND t.code = 'PJ';

-- AE60006 - Industrial Aerodynamics - Teacher: SMD (S.M. Dutta)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 30, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE60006' AND s.name = 'AE-M1' AND t.code = 'SMD';

-- AE61004 - Design of Compressors and Turbines - Teacher: CSM (C.S. Mukherjee)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 30, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE61004' AND s.name = 'AE-M1' AND t.code = 'CSM';

-- AE61017 - Hypersonic Aerodynamics - Teacher: KPS (K.P. Sharma)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 30, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE61017' AND s.name = 'AE-M1' AND t.code = 'KPS';

-- AE61019 - Smart Structures - Teacher: MM (M. Mondal)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 30, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE61019' AND s.name = 'AE-M1' AND t.code = 'MM';

-- AE60208 - Combustion of Solid fuels and Propellants - Teacher: SK (S. Kumar)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 30, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE60208' AND s.name = 'AE-M1' AND t.code = 'SK';

-- AE60028 - Advanced Propulsion System - Teacher: ADG (A.D. Gupta)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 30, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE60028' AND s.name = 'AE-M1' AND t.code = 'ADG';

-- AE60036 - Fracture Mechanics - Teacher: SCP (S.C. Prasad)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 30, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE60036' AND s.name = 'AE-M1' AND t.code = 'SCP';

-- AE60002 - Principles of Satellite and Inertial Navigation Systems - Teacher: SB (S. Basu)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 30, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE60002' AND s.name = 'AE-M1' AND t.code = 'SB';

-- AE60204 - Flight Vehicle Control - Teacher: SH (S. Hazra)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 30, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE60204' AND s.name = 'AE-M1' AND t.code = 'SH';

-- =====================================================
-- MTech 2nd Year Offerings (AE-M2)
-- =====================================================

-- AE69006 - Aerospace Laboratory-II - Teacher: SS (S. Sarkar)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 20, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE69006' AND s.name = 'AE-M2' AND t.code = 'SS';

-- AE69208 - Innovation Lab-II - Teacher: ADG (A.D. Gupta)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 20, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE69208' AND s.name = 'AE-M2' AND t.code = 'ADG';

-- AE69002 - Seminar-II - Teacher: AG (A. Ghosh)
INSERT INTO offering (course_id, section_id, teacher_id, expected_size, needs)
SELECT c.id, s.id, t.id, 20, ARRAY[]::text[]
FROM course c, section s, teacher t
WHERE c.code = 'AE69002' AND s.name = 'AE-M2' AND t.code = 'AG';

-- =====================================================
-- Verification Queries (uncomment to run after insert)
-- =====================================================

-- Check teacher count and names
-- SELECT code, name FROM teacher ORDER BY code;

-- Check offerings with full teacher names
-- SELECT
--   c.code as course_code,
--   c.name as course_name,
--   c."L", c."T", c."P",
--   s.name as section,
--   t.code as teacher_code,
--   t.name as teacher_name,
--   o.expected_size
-- FROM offering o
-- JOIN course c ON o.course_id = c.id
-- JOIN section s ON o.section_id = s.id
-- LEFT JOIN teacher t ON o.teacher_id = t.id
-- ORDER BY s.year, s.name, c.code;
