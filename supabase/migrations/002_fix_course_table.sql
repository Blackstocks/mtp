-- Drop the existing course table if it exists
DROP TABLE IF EXISTS course CASCADE;

-- Recreate the course table with proper columns
CREATE TABLE course (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  "L" integer DEFAULT 3,
  "T" integer DEFAULT 0,
  "P" integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add index for performance
CREATE INDEX idx_course_code ON course(code);

-- Add comment to explain the columns
COMMENT ON COLUMN course."L" IS 'Lecture hours per week';
COMMENT ON COLUMN course."T" IS 'Tutorial hours per week';
COMMENT ON COLUMN course."P" IS 'Practical/Lab hours per week';