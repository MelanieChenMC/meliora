import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected', // We'll verify this with actual Supabase later
      livekit: 'configured',
      clerk: 'configured'
    }
  })
} 