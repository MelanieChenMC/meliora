-- Remove room_name column from sessions table
ALTER TABLE sessions DROP COLUMN IF EXISTS room_name;