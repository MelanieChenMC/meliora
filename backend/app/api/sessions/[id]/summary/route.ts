import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { AISummaryService } from '@/lib/ai-summary'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = params.id
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const summary = await AISummaryService.getSessionSummary(sessionId, userId)
    
    if (!summary) {
      return NextResponse.json({ error: 'Summary not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      summary
    })
  } catch (error) {
    console.error('Error fetching session summary:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch summary' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = params.id
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { includeMetadata = true, forceRegenerate = false } = body

    // If not forcing regeneration, check if summary already exists
    if (!forceRegenerate) {
      const existingSummary = await AISummaryService.getSessionSummary(sessionId, userId)
      if (existingSummary) {
        return NextResponse.json({
          success: true,
          summary: existingSummary,
          message: 'Summary already exists',
          metadata: includeMetadata ? {
            isExisting: true,
            sessionId
          } : undefined
        })
      }
    }

    // For direct API calls, we need to fetch transcriptions and build the transcript
    // This is a fallback for when post-processing hasn't run yet
    const { data: transcriptions, error: transcriptionsError } = await supabaseAdmin
      .from('transcriptions')
      .select('text')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true })

    if (transcriptionsError) {
      throw new Error(`Failed to fetch transcriptions: ${transcriptionsError.message}`)
    }

    const fullTranscript = transcriptions
      ?.map((t: { text: string }) => t.text)
      .filter(Boolean)
      .join(' ') || ''

    if (!fullTranscript) {
      throw new Error('No transcriptions available for summary generation')
    }

    const result = await AISummaryService.generateSessionSummaryFromTranscript(
      sessionId,
      userId,
      fullTranscript,
      transcriptions?.length || 0
    )

    return NextResponse.json({
      success: true,
      summary: result
    })
  } catch (error) {
    console.error('Error generating session summary:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = params.id
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { updates } = body

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Updates object required' }, { status: 400 })
    }

    const updatedSummary = await AISummaryService.updateSessionSummary(
      sessionId,
      userId,
      updates
    )

    return NextResponse.json({
      success: true,
      summary: updatedSummary
    })
  } catch (error) {
    console.error('Error updating session summary:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update summary' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = params.id
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const result = await AISummaryService.deleteSessionSummary(sessionId, userId)

    return NextResponse.json({
      success: true,
      message: 'Summary deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting session summary:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete summary' },
      { status: 500 }
    )
  }
} 