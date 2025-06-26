import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const sessionId = formData.get('sessionId') as string

    if (!audioFile || !sessionId) {
      return NextResponse.json(
        { error: 'Audio file and session ID are required' },
        { status: 400 }
      )
    }

    console.log(`🎤 Transcribing audio for session ${sessionId}...`)
    console.log(`📊 Audio file details:`, {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      lastModified: audioFile.lastModified
    })

    // 💾 Save the audio file to Supabase Storage
    const audioBuffer = await audioFile.arrayBuffer()
    const timestamp = Date.now()
    const audioFileName = `${sessionId}/audio-${timestamp}.webm`
    let audioUrl = null
    
    try {
      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from('audio-recordings')
        .upload(audioFileName, audioBuffer, {
          contentType: 'audio/webm',
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.warn('⚠️ Could not save audio file to storage:', error)
      } else {
        // Store the file path (not a public URL) for secure access
        audioUrl = audioFileName // Store the file path, not a public URL
        console.log(`💾 Audio saved to private Supabase Storage: ${audioFileName}`)
      }
    } catch (storageError) {
      console.warn('⚠️ Error saving audio file to storage:', storageError)
    }

    // Convert audio to transcription using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['word']
    })

    // 🚫 Enhanced filter for known Whisper hallucinations
    const hallucinations = [
      'thank you',
      'thanks for watching', 
      'bye',
      'bye-bye',
      'transcribed by',
      'otter.ai',
      'thanks',
      'thank you very much',
      'goodbye',
      'see you later',
      'have a great day',
      'take care',
      'beadaholique.com',
      'beading supplies',
      'go to beadaholique',
      'for all of your',
      'supplies needs'
    ]
    
    const transcriptionLower = transcription.text.toLowerCase().trim()
    
    // Check if the entire transcription is just hallucinated phrases
    const isLikelyHallucination = (
      // Short transcriptions that are mostly common phrases
      (transcription.text.length < 100 && 
       hallucinations.some(phrase => transcriptionLower.includes(phrase.toLowerCase()))) ||
      
      // Repetitive "thank you" patterns
      (transcriptionLower.match(/thank you/gi) || []).length >= 3 ||
      
      // Contains "otter.ai" reference (definite hallucination)
      transcriptionLower.includes('otter.ai') ||
      transcriptionLower.includes('transcribed by') ||
      
      // Advertising/promotional content patterns
      (transcriptionLower.includes('.com') && transcriptionLower.includes('for all')) ||
      transcriptionLower.includes('beadaholique') ||
      (transcriptionLower.includes('go to') && transcriptionLower.includes('.com')) ||
      transcriptionLower.includes('supplies needs')
    )
    
    if (isLikelyHallucination) {
      console.log(`🚫 Detected likely hallucination: "${transcription.text}"`)
      console.log(`📊 Hallucination analysis:`, {
        length: transcription.text.length,
        thankYouCount: (transcriptionLower.match(/thank you/gi) || []).length,
        containsOtter: transcriptionLower.includes('otter.ai'),
        containsTranscribedBy: transcriptionLower.includes('transcribed by'),
        containsWebsite: transcriptionLower.includes('.com'),
        containsAdvertising: transcriptionLower.includes('beadaholique') || transcriptionLower.includes('supplies needs'),
        detectedPatterns: hallucinations.filter(phrase => transcriptionLower.includes(phrase.toLowerCase()))
      })
      
      return NextResponse.json({
        text: '',
        confidence: 0,
        timestamp: new Date().toISOString(),
        duration: transcription.duration,
        words: [],
        debug: { 
          skipped: 'hallucination_detected', 
          originalText: transcription.text,
          audioSize: audioFile.size,
          savedAs: audioFileName,
          audioUrl: audioUrl,
          analysis: {
            length: transcription.text.length,
            thankYouCount: (transcriptionLower.match(/thank you/gi) || []).length,
            containsOtter: transcriptionLower.includes('otter.ai')
          }
        }
      })
    }

    const result = {
      text: transcription.text,
      confidence: 0.95, // Whisper doesn't provide confidence, so we'll use a high default
      timestamp: new Date().toISOString(),
      duration: transcription.duration,
      words: transcription.words || [],
      // Add debug info
      debug: {
        audioSize: audioFile.size,
        audioType: audioFile.type,
        savedAs: audioFileName,
        audioUrl: audioUrl
      }
    }

    console.log(`✅ Transcription complete: "${result.text.substring(0, 100)}..."`)
    console.log(`�� Full transcription: "${result.text}"`)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error transcribing audio:', error)
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
} 