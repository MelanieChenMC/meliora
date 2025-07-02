# Client API Endpoints

## Overview
These endpoints manage client records in the Elora system.

## Endpoints

### List Clients
`GET /api/clients`

Query parameters:
- `search` - Search by name, email, or phone
- `status` - Filter by status (active, inactive, archived, or all)
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)

Response:
```json
{
  "clients": [...],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### Create Client
`POST /api/clients`

Request body:
```json
{
  "name": "John Doe",
  "age": "45",
  "phone": "555-1234",
  "email": "john@example.com",
  "address": "123 Main St",
  "dateOfBirth": "1978-01-01",
  "emergencyContact": "Jane Doe: 555-5678",
  "notes": "Additional notes",
  "tags": ["housing", "employment"]
}
```

### Get Client
`GET /api/clients/[id]`

Returns client with session count.

### Update Client
`PATCH /api/clients/[id]`

Request body: Any client fields to update

Special field:
- `updateLastContact: true` - Updates last_contact_date to now

### Archive Client
`DELETE /api/clients/[id]`

Soft deletes by setting status to 'archived'. 
Cannot archive clients with active sessions.

### Get Client Sessions
`GET /api/clients/[id]/sessions`

Returns all sessions for a specific client with summaries.

## Session Integration

When creating a session, include `client_id`:
```json
POST /api/sessions
{
  "scenario_type": "in_person",
  "client_id": "uuid-here",
  "metadata": {...}
}
```

This will automatically update the client's last_contact_date.