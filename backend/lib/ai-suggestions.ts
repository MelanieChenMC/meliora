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
}

interface AISuggestion {
  type: 'followup_question' | 'resource' | 'action_item' | 'concern_flag'
  content: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  context: string
}

export class AISuggestionsService {
  /**
   * Generate AI suggestions based on recent conversation transcriptions
   */
  static async generateSuggestions(
    sessionId: string,
    userId: string,
    options: {
      lookbackMinutes?: number
      maxTranscriptions?: number
    } = {}
  ) {
    const { lookbackMinutes = 10, maxTranscriptions = 20 } = options

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

    // Get recent transcriptions
    const lookbackTime = new Date(Date.now() - lookbackMinutes * 60 * 1000).toISOString()
    const { data: transcriptions, error: transcriptionsError } = await supabaseAdmin
      .from('transcriptions')
      .select('text, timestamp, speaker')
      .eq('session_id', sessionId)
      .gte('timestamp', lookbackTime)
      .order('timestamp', { ascending: true })
      .limit(maxTranscriptions)

    if (transcriptionsError) {
      throw new Error(`Failed to fetch transcriptions: ${transcriptionsError.message}`)
    }

    if (!transcriptions || transcriptions.length === 0) {
      return {
        suggestions: [],
        message: 'No recent transcriptions available for analysis',
        metadata: { transcriptionCount: 0, conversationLength: 0 }
      }
    }

    // Generate suggestions using OpenAI
    const suggestions = await this.callOpenAI(session, transcriptions)

    // Save suggestions to database
    const savedSuggestions = await this.saveSuggestions(sessionId, suggestions)

    console.log(`✅ Generated and saved ${savedSuggestions.length} AI suggestions for session ${sessionId}`)

    return {
      suggestions: savedSuggestions,
      metadata: {
        transcriptionCount: transcriptions.length,
        conversationLength: transcriptions.reduce((total, t) => total + t.text.length, 0),
        generatedCount: savedSuggestions.length
      }
    }
  }

  /**
   * Call OpenAI to generate suggestions based on conversation context
   */
  private static async callOpenAI(
    session: SessionData,
    transcriptions: TranscriptionData[]
  ): Promise<AISuggestion[]> {
    const conversationText = transcriptions
      .map(t => `${t.speaker}: ${t.text}`)
      .join('\n')

    console.log('🤖 Generating AI suggestions for conversation:', conversationText.substring(0, 200))

    const prompt = this.buildPrompt(session.scenario_type, conversationText)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert social work supervisor providing guidance during client sessions. Be helpful, professional, and focused on client wellbeing.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    let parsedResponse
    try {
      parsedResponse = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      throw new Error('Invalid response format from AI')
    }

    return parsedResponse.suggestions || []
  }

  /**
   * Build the prompt for OpenAI based on session type and conversation
   */
  private static buildPrompt(scenarioType: string, conversationText: string): string {
    return `You are an AI assistant helping a social worker during a client session. Based on the following conversation transcript, generate helpful suggestions.

Session Type: ${scenarioType.replace('_', ' ')}
Recent Conversation:
${conversationText}

Please generate 2-3 suggestions that would be helpful for the social worker. For each suggestion, provide:
1. Type: one of "followup_question", "resource", "action_item", or "concern_flag"
2. Content: the actual suggestion text
3. Priority: one of "low", "medium", "high", or "urgent"
4. Context: brief explanation of what triggered this suggestion

Respond in JSON format:
{
  "suggestions": [
    {
      "type": "followup_question",
      "content": "Ask about...",
      "priority": "medium",
      "context": "Based on the client mentioning..."
    }
  ]
}

Focus on:
- Follow-up questions to gather more information
- Resources that might help the client
- Action items for next steps
- Any concerning statements that need attention

Keep suggestions practical and relevant to social work practice.`
  }

  /**
   * Save generated suggestions to the database
   */
  private static async saveSuggestions(
    sessionId: string,
    suggestions: AISuggestion[]
  ): Promise<any[]> {
    const savedSuggestions = []

    for (const suggestion of suggestions) {
      try {
        const { data: savedSuggestion, error: saveError } = await supabaseAdmin
          .from('ai_suggestions')
          .insert({
            session_id: sessionId,
            type: suggestion.type,
            content: suggestion.content,
            priority: suggestion.priority,
            context: suggestion.context,
            confidence: 0.85, // OpenAI suggestions get high confidence
            acknowledged: false
          })
          .select()
          .single()

        if (saveError) {
          console.error('Error saving suggestion:', saveError)
        } else {
          savedSuggestions.push(savedSuggestion)
        }
      } catch (saveError) {
        console.error('Error saving individual suggestion:', saveError)
      }
    }

    return savedSuggestions
  }

  /**
   * Get existing suggestions for a session
   */
  static async getSuggestions(
    sessionId: string,
    userId: string,
    options: {
      acknowledged?: boolean
      limit?: number
    } = {}
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

    let query = supabaseAdmin
      .from('ai_suggestions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })

    if (options.acknowledged !== undefined) {
      query = query.eq('acknowledged', options.acknowledged)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data: suggestions, error } = await query

    if (error) {
      throw new Error(`Failed to fetch suggestions: ${error.message}`)
    }

    return suggestions || []
  }

  /**
   * Update suggestion acknowledgment status
   */
  static async acknowledgeSuggestion(
    sessionId: string,
    suggestionId: string,
    userId: string,
    acknowledged: boolean
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

    const { data: suggestion, error } = await supabaseAdmin
      .from('ai_suggestions')
      .update({ acknowledged })
      .eq('id', suggestionId)
      .eq('session_id', sessionId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update suggestion: ${error.message}`)
    }

    return suggestion
  }
} 