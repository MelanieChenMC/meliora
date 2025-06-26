import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { supabaseAdmin } from '@/lib/supabase'
import { AISuggestionsService } from '@/lib/ai-suggestions'

export async function POST(
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
    
    const sessionId = params.id
    const { type, content, priority, context, confidence } = await request.json()

    // Verify the session belongs to the user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('clerk_user_id', userId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      )
    }

    // Save AI suggestion to database
    const { data: suggestion, error } = await supabaseAdmin
      .from('ai_suggestions')
      .insert({
        session_id: sessionId,
        type,
        content,
        priority: priority || 'medium',
        context,
        confidence: confidence || 0.8,
        acknowledged: false
      })
      .select()
      .single()

    if (error) throw error

    console.log(`✅ AI suggestion saved for session ${sessionId}:`, type, '-', content.substring(0, 50))

    return NextResponse.json({ suggestion })
  } catch (error) {
    console.error('Error saving AI suggestion:', error)
    return NextResponse.json(
      { error: 'Failed to save AI suggestion' },
      { status: 500 }
    )
  }
}

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
    
    const sessionId = params.id
    const { searchParams } = new URL(request.url)
    const acknowledged = searchParams.get('acknowledged')
    const limit = searchParams.get('limit')

    const options: any = {}
    if (acknowledged !== null) {
      options.acknowledged = acknowledged === 'true'
    }
    if (limit) {
      options.limit = parseInt(limit)
    }

    const suggestions = await AISuggestionsService.getSuggestions(
      sessionId,
      userId,
      options
    )

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Error fetching AI suggestions:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch AI suggestions'
    const statusCode = errorMessage.includes('not found') || errorMessage.includes('unauthorized') ? 404 : 500
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}

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
    
    const sessionId = params.id
    const { suggestionId, acknowledged } = await request.json()

    const suggestion = await AISuggestionsService.acknowledgeSuggestion(
      sessionId,
      suggestionId,
      userId,
      acknowledged
    )

    console.log(`✅ AI suggestion ${acknowledged ? 'acknowledged' : 'unacknowledged'} for session ${sessionId}`)

    return NextResponse.json({ suggestion })
  } catch (error) {
    console.error('Error updating AI suggestion:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update AI suggestion'
    const statusCode = errorMessage.includes('not found') || errorMessage.includes('unauthorized') ? 404 : 500
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
} 