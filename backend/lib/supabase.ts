import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          scenario_type: 'in_person' | 'call_center' | 'conference'
          clerk_user_id: string
          room_name?: string
          status: 'active' | 'completed' | 'paused'
          metadata: any
          stitched_audio_url?: string
          full_transcript?: string
          audio_duration?: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          scenario_type: 'in_person' | 'call_center' | 'conference'
          clerk_user_id: string
          room_name?: string
          status?: 'active' | 'completed' | 'paused'
          metadata?: any
          stitched_audio_url?: string
          full_transcript?: string
          audio_duration?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          scenario_type?: 'in_person' | 'call_center' | 'conference'
          clerk_user_id?: string
          room_name?: string
          status?: 'active' | 'completed' | 'paused'
          metadata?: any
          stitched_audio_url?: string
          full_transcript?: string
          audio_duration?: number
        }
      }
      transcriptions: {
        Row: {
          id: string
          session_id: string
          text: string
          confidence: number
          timestamp: string
          speaker: string
          duration?: number
          chunk_index?: number
          audio_url?: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          text: string
          confidence?: number
          timestamp?: string
          speaker?: string
          duration?: number
          chunk_index?: number
          audio_url?: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          text?: string
          confidence?: number
          timestamp?: string
          speaker?: string
          duration?: number
          chunk_index?: number
          audio_url?: string
          created_at?: string
        }
      }
      ai_suggestions: {
        Row: {
          id: string
          session_id: string
          type: 'followup_question' | 'resource' | 'action_item' | 'concern_flag'
          content: string
          priority: 'low' | 'medium' | 'high' | 'urgent'
          context?: string
          confidence: number
          acknowledged: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          type: 'followup_question' | 'resource' | 'action_item' | 'concern_flag'
          content: string
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          context?: string
          confidence?: number
          acknowledged?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          type?: 'followup_question' | 'resource' | 'action_item' | 'concern_flag'
          content?: string
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          context?: string
          confidence?: number
          acknowledged?: boolean
          created_at?: string
        }
      }
    }
  }
} 