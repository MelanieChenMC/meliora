import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { supabaseAdmin } from '@/lib/supabase'
import { AISummaryService } from '@/lib/ai-summary'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth()
    
    console.log(`🎯 Audio API called for session ${params.id}, user: ${userId}`)
    console.log(`🎯 Request URL: ${request.url}`)
    console.log(`🎯 Force restitch: ${request.nextUrl.searchParams.get('force_restitch')}`)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const sessionId = params.id

    // Verify the session belongs to the user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, status, stitched_audio_url, full_transcript, audio_duration')
      .eq('id', sessionId)
      .eq('clerk_user_id', userId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      )
    }

    // Get all transcriptions with audio URLs for this session, ordered by chunk_index and timestamp
    const { data: transcriptions, error: transcriptionsError } = await supabaseAdmin
      .from('transcriptions')
      .select('audio_url, timestamp, chunk_index, text')
      .eq('session_id', sessionId)
      .not('audio_url', 'is', null)
      .order('chunk_index', { ascending: true })
      .order('timestamp', { ascending: true })

    if (transcriptionsError) {
      console.error('Error fetching transcriptions:', transcriptionsError)
      return NextResponse.json(
        { error: 'Failed to fetch session audio data' },
        { status: 500 }
      )
    }

    if (!transcriptions || transcriptions.length === 0) {
      return NextResponse.json(
        { error: 'No audio recordings found for this session' },
        { status: 404 }
      )
    }

    console.log(`📋 Found ${transcriptions.length} transcriptions for session ${sessionId}`)
    console.log('📋 First few transcriptions:', transcriptions.slice(0, 3).map(t => ({
      chunk_index: t.chunk_index,
      timestamp: t.timestamp,
      audio_url: t.audio_url,
      text_preview: t.text?.substring(0, 50) + '...'
    })))
    console.log('📋 Last few transcriptions:', transcriptions.slice(-3).map(t => ({
      chunk_index: t.chunk_index,
      timestamp: t.timestamp,
      audio_url: t.audio_url,
      text_preview: t.text?.substring(0, 50) + '...'
    })))

    // Check if we already have stitched audio URL in session table
    // Add ?force_restitch=true to URL to bypass cache for debugging
    const forceRestitch = request.nextUrl.searchParams.get('force_restitch') === 'true'
    
    if (session.stitched_audio_url && !forceRestitch) {
      console.log(`📁 Found cached stitched audio URL for session ${sessionId}`)
      
      // Generate fresh signed URL for the cached file
      const { data, error } = await supabaseAdmin.storage
        .from('audio-recordings')
        .createSignedUrl(session.stitched_audio_url, 7200) // 2 hours expiry

      if (error) {
        console.error('Error generating signed URL for cached stitched audio:', error)
        // Fall through to re-stitch if cached URL is invalid
      } else {
        return NextResponse.json({ 
          audioUrl: data.signedUrl,
          chunkCount: transcriptions.length,
          cached: true,
          expiresAt: new Date(Date.now() + 7200 * 1000).toISOString()
        })
      }
    }
    
    if (forceRestitch) {
      console.log(`🔄 Force re-stitching requested for session ${sessionId}`)
    }

    // For long sessions, we need to stitch server-side but more efficiently
    console.log(`🔗 Creating stitched audio for session ${sessionId} (${transcriptions.length} chunks)`)
    
    const stitchedFileName = `${sessionId}/session-complete.webm`
    
    try {
      // Check if this is a very long session that needs special handling
      const isLargeSession = transcriptions.length > 600 // More than 30 minutes
      
      if (isLargeSession) {
        console.log(`🔄 Processing large session with ${transcriptions.length} chunks (${Math.floor(transcriptions.length * 3 / 60)} minutes)`)
        
        // For very large sessions, process in smaller batches to avoid memory issues
        const batchSize = 200 // Process 200 chunks (10 minutes) at a time
        const batches = []
        
        for (let i = 0; i < transcriptions.length; i += batchSize) {
          batches.push(transcriptions.slice(i, i + batchSize))
        }
        
        const batchBuffers: Buffer[] = []
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex]
          console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} chunks)`)
          
          const audioBuffers: Buffer[] = []
          let batchSize = 0
          
          for (const transcription of batch) {
            if (transcription.audio_url) {
              const { data, error } = await supabaseAdmin.storage
                .from('audio-recordings')
                .download(transcription.audio_url)

              if (error) {
                console.warn(`⚠️ Failed to download chunk ${transcription.audio_url}:`, error)
                continue
              }

              if (data) {
                const buffer = Buffer.from(await data.arrayBuffer())
                audioBuffers.push(buffer)
                batchSize += buffer.length
              }
            }
          }
          
          if (audioBuffers.length > 0) {
            const batchBuffer = Buffer.concat(audioBuffers)
            batchBuffers.push(batchBuffer)
            console.log(`✅ Batch ${batchIndex + 1} processed: ${batchSize / 1024 / 1024}MB`)
            
            // Clear batch from memory
            audioBuffers.length = 0
          }
        }
        
        if (batchBuffers.length === 0) {
          return NextResponse.json(
            { error: 'No audio chunks could be processed' },
            { status: 500 }
          )
        }
        
        // Concatenate all batch buffers
        const stitchedBuffer = Buffer.concat(batchBuffers)
        console.log(`📦 Final stitched audio size: ${stitchedBuffer.length / 1024 / 1024}MB`)
        
        // Upload the stitched audio file
        const { error: uploadError } = await supabaseAdmin.storage
          .from('audio-recordings')
          .upload(stitchedFileName, stitchedBuffer, {
            contentType: 'audio/webm',
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) {
          console.error('Error uploading stitched audio:', uploadError)
          return NextResponse.json(
            { error: 'Failed to create session audio file' },
            { status: 500 }
          )
        }
        
      } else {
        // For smaller sessions, use the original approach
        const audioBuffers: Buffer[] = []
        let totalSize = 0
        let processedCount = 0
        
        console.log(`🔄 Processing ${transcriptions.length} audio chunks for stitching`)
        
        for (const transcription of transcriptions) {
          if (transcription.audio_url) {
            console.log(`📥 Downloading chunk ${processedCount + 1}/${transcriptions.length}: ${transcription.audio_url}`)
            
            const { data, error } = await supabaseAdmin.storage
              .from('audio-recordings')
              .download(transcription.audio_url)

            if (error) {
              console.warn(`⚠️ Failed to download chunk ${transcription.audio_url}:`, error)
              console.warn(`⚠️ Error details:`, error)
              continue
            }

            if (data) {
              const buffer = Buffer.from(await data.arrayBuffer())
              audioBuffers.push(buffer)
              totalSize += buffer.length
              processedCount++
              console.log(`✅ Processed chunk ${processedCount}: ${buffer.length} bytes, total buffers: ${audioBuffers.length}`)
            } else {
              console.warn(`⚠️ No data returned for chunk ${transcription.audio_url}`)
            }
          } else {
            console.warn(`⚠️ No audio_url for transcription at index ${processedCount}`)
          }
        }
        
        console.log(`📊 Total chunks processed: ${processedCount}/${transcriptions.length}`)
        console.log(`📊 Total audio buffers: ${audioBuffers.length}`)
        console.log(`📊 Buffer sizes:`, audioBuffers.map((buf, i) => `${i}: ${buf.length} bytes`))

        if (audioBuffers.length === 0) {
          return NextResponse.json(
            { error: 'No audio chunks could be processed' },
            { status: 500 }
          )
        }

        // Concatenate all audio buffers
        console.log(`🔗 Concatenating ${audioBuffers.length} audio buffers...`)
        const stitchedBuffer = Buffer.concat(audioBuffers)
        console.log(`📦 Stitched audio size: ${stitchedBuffer.length / 1024 / 1024}MB`)
        console.log(`📦 Expected vs actual size: ${totalSize} vs ${stitchedBuffer.length} bytes`)

        // Upload the stitched audio file
        const { error: uploadError } = await supabaseAdmin.storage
          .from('audio-recordings')
          .upload(stitchedFileName, stitchedBuffer, {
            contentType: 'audio/webm',
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) {
          console.error('Error uploading stitched audio:', uploadError)
          return NextResponse.json(
            { error: 'Failed to create session audio file' },
            { status: 500 }
          )
        }
      }

      // Generate signed URL for the new stitched file
      const { data, error } = await supabaseAdmin.storage
        .from('audio-recordings')
        .createSignedUrl(stitchedFileName, 7200) // 2 hours expiry

      if (error) {
        console.error('Error generating signed URL for new stitched audio:', error)
        return NextResponse.json(
          { error: 'Failed to generate audio URL' },
          { status: 500 }
        )
      }

      console.log(`✅ Created stitched audio for session ${sessionId}`)

      // Update session table with stitched audio URL and full transcript
      const fullTranscript = transcriptions
        .map(t => t.text)
        .filter(Boolean)
        .join(' ')

      const audioDuration = transcriptions.length * 3 // Approximate duration in seconds

      await supabaseAdmin
        .from('sessions')
        .update({
          stitched_audio_url: stitchedFileName,
          full_transcript: fullTranscript,
          audio_duration: audioDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      // Generate AI summary using the full transcript
      console.log(`🤖 Generating AI summary for session ${sessionId}...`)
      try {
        await AISummaryService.generateSessionSummaryFromTranscript(
          sessionId,
          userId,
          fullTranscript,
          transcriptions.length
        )
        console.log(`✅ AI summary generated successfully for session ${sessionId}`)
      } catch (summaryError) {
        console.error(`❌ Failed to generate AI summary for session ${sessionId}:`, summaryError)
        // Don't fail the post-processing if summary generation fails
      }

      return NextResponse.json({ 
        audioUrl: data.signedUrl,
        chunkCount: transcriptions.length,
        cached: false,
        expiresAt: new Date(Date.now() + 7200 * 1000).toISOString()
      })

    } catch (stitchError) {
      console.error('Error stitching audio files:', stitchError)
      return NextResponse.json(
        { error: 'Failed to stitch audio files together' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error generating session audio:', error)
    return NextResponse.json(
      { error: 'Failed to generate session audio' },
      { status: 500 }
    )
  }
} 