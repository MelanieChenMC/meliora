-- Add 'processing' status to sessions table
ALTER TYPE "SessionStatus" ADD VALUE 'processing';

-- Or if using a check constraint instead of enum:
-- ALTER TABLE sessions DROP CONSTRAINT IF EXISTS status_check;
-- ALTER TABLE sessions ADD CONSTRAINT status_check 
-- CHECK (status IN ('active', 'completed', 'paused', 'processing'));