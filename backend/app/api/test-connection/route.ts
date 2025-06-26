import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { roomService } from '@/lib/livekit'

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    services: {} as any
  }

  // Test Supabase connection
  try {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('count')
      .limit(1)
    
    results.services.supabase = error ? `Error: ${error.message}` : 'Connected ✅'
  } catch (error) {
    results.services.supabase = `Error: ${error}`
  }

  // Test LiveKit connection
  try {
    await roomService.listRooms()
    results.services.livekit = 'Connected ✅'
  } catch (error) {
    results.services.livekit = `Error: ${error}`
  }

  // Check environment variables
  results.services.clerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'Configured ✅' : 'Missing env vars ❌'
  results.services.openai = process.env.OPENAI_API_KEY ? 'Configured ✅' : 'Missing env vars ❌'

  return NextResponse.json(results)
} 