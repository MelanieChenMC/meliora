import OpenAI from 'openai'
import { supabaseAdmin } from './supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface TranscriptionData {
  text: string
  timestamp: string
  speaker: string
}

interface SessionData {
  id: string
  scenario_type: string
  clerk_user_id: string
  client_name?: string
  session_date?: string
}

interface AISummary {
  key_topics: string[]
  main_concerns: string[]
  progress_notes: string
  next_steps: string[]
  risk_assessment: string
  overall_summary: string
  session_duration_minutes: number
  transcript_length: number
}

export class AISummaryService {
  /**
   * Generate AI summary from a full transcript string
   */
  static async generateSessionSummaryFromTranscript(
    sessionId: string,
    userId: string,
    fullTranscript: string,
    transcriptionCount: number = 0
  ) {
    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('clerk_user_id', userId)
      .single()

    if (sessionError || !session) {
      throw new Error('Session not found or unauthorized')
    }

    // Check if summary already exists
    const { data: existingSummary } = await supabaseAdmin
      .from('session_summaries')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (existingSummary) {
      console.log(`📋 Summary already exists for session ${sessionId}`)
      return existingSummary
    }

    console.log(`📋 Generating summary for session ${sessionId} from full transcript`)

    // Generate summary using OpenAI
    const aiSummary = await this.callOpenAIWithTranscript(session, fullTranscript)

    // Save summary to database
    const savedSummary = await this.saveSummary(sessionId, aiSummary, transcriptionCount)

    console.log(`✅ Generated and saved AI summary for session ${sessionId}`)

    return savedSummary
  }

  /**
   * Call OpenAI to generate session summary from transcript string
   */
  private static async callOpenAIWithTranscript(
    session: SessionData,
    fullTranscript: string
  ): Promise<AISummary> {
    console.log('🤖 Generating AI summary for full session transcript')

    const prompt = this.buildSummaryPrompt(session.scenario_type, fullTranscript, 0)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert social work supervisor creating comprehensive session summaries. Provide detailed, professional, and actionable summaries that will help with case management and continuity of care.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent summaries
      max_tokens: 2000,
    })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    let parsedResponse
    try {
      // First try to parse as-is
      parsedResponse = JSON.parse(aiResponse)
    } catch (parseError) {
      try {
        // If that fails, try to extract JSON from markdown code blocks
        const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch && jsonMatch[1]) {
          parsedResponse = JSON.parse(jsonMatch[1])
        } else {
          // Try to find JSON-like content between { and }
          const jsonStart = aiResponse.indexOf('{')
          const jsonEnd = aiResponse.lastIndexOf('}')
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const jsonContent = aiResponse.slice(jsonStart, jsonEnd + 1)
            parsedResponse = JSON.parse(jsonContent)
          } else {
            throw new Error('No valid JSON found in response')
          }
        }
      } catch (secondParseError) {
        console.error('Failed to parse AI response:', aiResponse)
        console.error('Parse errors:', parseError, secondParseError)
        throw new Error('Invalid response format from AI')
      }
    }

    // Add metadata
    parsedResponse.session_duration_minutes = 0 // Will be set from session metadata
    parsedResponse.transcript_length = fullTranscript.length

    return parsedResponse as AISummary
  }

  /**
   * Build the prompt for OpenAI session summary
   */
  private static buildSummaryPrompt(scenarioType: string, fullTranscript: string, durationMinutes: number): string {
    return `You are creating a comprehensive session summary for a social work case. Analyze the following complete session transcript and provide a detailed summary.

Session Type: ${scenarioType.replace('_', ' ')}
Session Duration: ${durationMinutes} minutes
Full Transcript:
${fullTranscript}

IMPORTANT: Respond with ONLY the JSON object. Do not include any explanatory text, markdown formatting, or code blocks. Return only the raw JSON.

Provide a comprehensive summary in this exact JSON format:
{
  "key_topics": ["topic1", "topic2", "topic3"],
  "main_concerns": ["concern1", "concern2"],
  "progress_notes": "Detailed progress notes covering client's current state, changes since last session, and notable developments",
  "next_steps": ["action1", "action2", "action3"],
  "risk_assessment": "Assessment of any risks or safety concerns identified during the session",
  "overall_summary": "A comprehensive 2-3 paragraph summary of the entire session covering key discussion points, client engagement, and outcomes"
}

Focus on:
- Key topics and themes discussed
- Client's main concerns and presenting issues
- Progress made or challenges encountered
- Specific action items and next steps
- Any risk factors or safety concerns
- Overall assessment of the session

Keep the summary professional, objective, and suitable for case documentation. Ensure confidentiality by focusing on clinical observations rather than personal details.

Return ONLY the JSON object, nothing else.`
  }

  /**
   * Calculate session duration from transcriptions
   */
  private static calculateSessionDuration(transcriptions: TranscriptionData[]): number {
    if (transcriptions.length === 0) return 0
    
    const firstTimestamp = new Date(transcriptions[0].timestamp)
    const lastTimestamp = new Date(transcriptions[transcriptions.length - 1].timestamp)
    
    return Math.round((lastTimestamp.getTime() - firstTimestamp.getTime()) / (1000 * 60))
  }

  /**
   * Save generated summary to the database
   */
  private static async saveSummary(
    sessionId: string,
    summary: AISummary,
    transcriptionCount: number
  ): Promise<any> {
    const { data: savedSummary, error: saveError } = await supabaseAdmin
      .from('session_summaries')
      .insert({
        session_id: sessionId,
        key_topics: summary.key_topics,
        main_concerns: summary.main_concerns,
        progress_notes: summary.progress_notes,
        next_steps: summary.next_steps,
        risk_assessment: summary.risk_assessment,
        overall_summary: summary.overall_summary,
        session_duration_minutes: summary.session_duration_minutes,
        transcript_length: summary.transcript_length,
        transcription_count: transcriptionCount,
        confidence: 0.90, // High confidence for full transcript analysis
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving summary:', saveError)
      throw new Error(`Failed to save summary: ${saveError.message}`)
    }

    return savedSummary
  }

  /**
   * Get existing summary for a session
   */
  static async getSessionSummary(sessionId: string, userId: string) {
    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('clerk_user_id', userId)
      .single()

    if (sessionError || !session) {
      throw new Error('Session not found or unauthorized')
    }

    const { data: summary, error } = await supabaseAdmin
      .from('session_summaries')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to fetch summary: ${error.message}`)
    }

    return summary
  }

  /**
   * Update an existing summary (for manual edits)
   */
  static async updateSessionSummary(
    sessionId: string,
    userId: string,
    updates: Partial<Omit<AISummary, 'session_duration_minutes' | 'transcript_length'>>
  ) {
    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('clerk_user_id', userId)
      .single()

    if (sessionError || !session) {
      throw new Error('Session not found or unauthorized')
    }

    const { data: updatedSummary, error } = await supabaseAdmin
      .from('session_summaries')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update summary: ${error.message}`)
    }

    return updatedSummary
  }

  /**
   * Delete a session summary
   */
  static async deleteSessionSummary(sessionId: string, userId: string) {
    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('clerk_user_id', userId)
      .single()

    if (sessionError || !session) {
      throw new Error('Session not found or unauthorized')
    }

    const { error } = await supabaseAdmin
      .from('session_summaries')
      .delete()
      .eq('session_id', sessionId)

    if (error) {
      throw new Error(`Failed to delete summary: ${error.message}`)
    }

    return { success: true }
  }
} 