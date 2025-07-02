import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/clients/[id] - Get a single client
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const clientId = params.id

    // Get client with session count
    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .select(`
        *,
        sessions:sessions(count)
      `)
      .eq('id', clientId)
      .eq('clerk_user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

// PATCH /api/clients/[id] - Update a client
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const clientId = params.id
    const updates = await request.json()

    // Remove fields that shouldn't be updated
    delete updates.id
    delete updates.clerk_user_id
    delete updates.created_at
    delete updates.updated_at

    // Update last_contact_date if a session is being created
    if (updates.updateLastContact) {
      updates.last_contact_date = new Date().toISOString()
      delete updates.updateLastContact
    }

    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .update(updates)
      .eq('id', clientId)
      .eq('clerk_user_id', userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id] - Soft delete a client (set status to archived)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const clientId = params.id

    // Check if client has active sessions
    const { data: activeSessions, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .limit(1)

    if (sessionError) throw sessionError

    if (activeSessions && activeSessions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot archive client with active sessions' },
        { status: 400 }
      )
    }

    // Soft delete by setting status to archived
    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .update({ status: 'archived' })
      .eq('id', clientId)
      .eq('clerk_user_id', userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, client })
  } catch (error) {
    console.error('Error archiving client:', error)
    return NextResponse.json(
      { error: 'Failed to archive client' },
      { status: 500 }
    )
  }
}