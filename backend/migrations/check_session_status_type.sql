-- Check if using enum type for session status
SELECT 
    n.nspname as schema,
    t.typname as type_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'SessionStatus'
GROUP BY n.nspname, t.typname;

-- Check constraints on sessions table
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'sessions'::regclass
AND contype = 'c';

-- Check current status values in sessions table
SELECT DISTINCT status, COUNT(*) as count
FROM sessions
GROUP BY status
ORDER BY status;