import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { supabaseAdmin } from '@/lib/supabase'

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
    const { text, confidence, timestamp, speaker, duration, chunkIndex, audioUrl } = await request.json()

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

    // Save transcription to database
    const { data: transcription, error } = await supabaseAdmin
      .from('transcriptions')
      .insert({
        session_id: sessionId,
        text,
        confidence: confidence || 0.95,
        timestamp: timestamp || new Date().toISOString(),
        speaker: speaker || 'user',
        duration,
        chunk_index: chunkIndex,
        audio_url: audioUrl
      })
      .select()
      .single()

    if (error) throw error

    console.log(`✅ Transcription saved for session ${sessionId}:`, text.substring(0, 100))

    return NextResponse.json({ transcription })
  } catch (error) {
    console.error('Error saving transcription:', error)
    return NextResponse.json(
      { error: 'Failed to save transcription' },
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

    // Get all transcriptions for the session
    const { data: transcriptions, error } = await supabaseAdmin
      .from('transcriptions')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true })

    if (error) throw error

    // Verify the session belongs to the user
    if (transcriptions.length > 0) {
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
    }

    return NextResponse.json({ transcriptions })
  } catch (error) {
    console.error('Error fetching transcriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transcriptions' },
      { status: 500 }
    )
  }
} 