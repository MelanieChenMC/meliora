import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { supabaseAdmin } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        *,
        client:clients(id, name, phone, email)
      `)
      .eq('clerk_user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    console.log('Auth context:', { userId, hasUserId: !!userId });
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { scenario_type, metadata, client_id } = await request.json()
    
    // Validate scenario type
    if (!['in_person', 'call_center', 'conference'].includes(scenario_type)) {
      return NextResponse.json(
        { error: 'Invalid scenario type' },
        { status: 400 }
      )
    }

    // If client_id is provided, verify it belongs to the user
    if (client_id) {
      const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('id', client_id)
        .eq('clerk_user_id', userId)
        .single()

      if (clientError || !client) {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        )
      }

      // Update client's last contact date
      await supabaseAdmin
        .from('clients')
        .update({ last_contact_date: new Date().toISOString() })
        .eq('id', client_id)
    }

    const sessionId = uuidv4()

    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .insert({
        id: sessionId,
        scenario_type,
        clerk_user_id: userId,
        client_id: client_id || null,
        status: 'active',
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
} 