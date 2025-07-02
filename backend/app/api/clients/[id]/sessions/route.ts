import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/clients/[id]/sessions - Get all sessions for a client
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

    // First verify the client belongs to the user
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('clerk_user_id', userId)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Get all sessions for the client
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        *,
        session_summaries (
          id,
          key_topics,
          main_concerns,
          overall_summary,
          created_at
        )
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ 
      sessions: sessions || [],
      total: sessions?.length || 0
    })
  } catch (error) {
    console.error('Error fetching client sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client sessions' },
      { status: 500 }
    )
  }
}