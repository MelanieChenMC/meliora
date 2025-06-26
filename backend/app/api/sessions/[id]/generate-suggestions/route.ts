import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
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
    const body = await request.json().catch(() => ({}))
    const options = {
      lookbackMinutes: body.lookbackMinutes || 10,
      maxTranscriptions: body.maxTranscriptions || 20
    }

    const result = await AISuggestionsService.generateSuggestions(
      sessionId,
      userId,
      options
    )

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error generating AI suggestions:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate AI suggestions'
    const statusCode = errorMessage.includes('not found') || errorMessage.includes('unauthorized') ? 404 : 500
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
} 