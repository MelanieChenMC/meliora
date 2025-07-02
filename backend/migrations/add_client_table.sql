-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id VARCHAR(255) NOT NULL,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    age VARCHAR(10),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    
    -- Additional Fields
    date_of_birth DATE,
    emergency_contact TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_contact_date TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT status_check CHECK (status IN ('active', 'inactive', 'archived'))
);

-- Create indexes for clients table
CREATE INDEX idx_clients_clerk_user_id ON clients(clerk_user_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_name ON clients(name);

-- Add client_id column to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS client_id UUID;

-- Add foreign key constraint
ALTER TABLE sessions
ADD CONSTRAINT fk_sessions_client_id 
FOREIGN KEY (client_id) 
REFERENCES clients(id) 
ON DELETE SET NULL;

-- Create index for client_id in sessions table
CREATE INDEX idx_sessions_client_id ON sessions(client_id);

-- Create updated_at trigger for clients table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();