-- Rollback migration for client table

-- Drop trigger
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;

-- Drop indexes on sessions table
DROP INDEX IF EXISTS idx_sessions_client_id;

-- Drop foreign key constraint
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS fk_sessions_client_id;

-- Remove client_id column from sessions table
ALTER TABLE sessions DROP COLUMN IF EXISTS client_id;

-- Drop indexes on clients table
DROP INDEX IF EXISTS idx_clients_name;
DROP INDEX IF EXISTS idx_clients_status;
DROP INDEX IF EXISTS idx_clients_clerk_user_id;

-- Drop clients table
DROP TABLE IF EXISTS clients;

-- Drop trigger function if no other tables use it
-- Note: Only drop if you're sure no other tables use this function
-- DROP FUNCTION IF EXISTS update_updated_at_column();