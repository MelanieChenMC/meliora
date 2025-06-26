import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { 
  ArrowLeft, 
  MessageSquare, 
  Lightbulb, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Volume2,
  FileText,
  Calendar,
  Timer
} from 'lucide-react';

interface Session {
  id: string;
  scenario_type: 'in_person' | 'call_center' | 'conference';
  status: 'active' | 'completed' | 'paused';
  room_name?: string;
  created_at: string;
  updated_at: string;
  stitched_audio_url?: string;
  full_transcript?: string;
  audio_duration?: number;
  metadata?: {
    title?: string;
    duration?: number;
    transcription_count?: number;
    ai_suggestions_count?: number;
    ended_at?: string;
  };
}

interface Transcription {
  id: string;
  text: string;
  timestamp: string;
  confidence: number;
  duration?: number;
  chunk_index?: number;
  audio_url?: string;
}

interface AISuggestion {
  id: string;
  type: 'followup_question' | 'resource' | 'action_item' | 'concern_flag';
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  acknowledged: boolean;
  created_at: string;
  context?: string;
  confidence?: number;
}

interface AISummary {
  id: string;
  session_id: string;
  key_topics: string[];
  main_concerns: string[];
  progress_notes: string;
  next_steps: string[];
  risk_assessment: string;
  overall_summary: string;
  session_duration_minutes: number;
  transcript_length: number;
  transcription_count: number;
  confidence: number;
  created_at: string;
  updated_at: string;
}

const SessionView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  
  const [session, setSession] = useState<Session | null>(null);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'suggestions'>('overview');

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
    
    // Cleanup audio element on unmount or sessionId change
    return () => {
      if (audioElement) {
        console.log('Cleaning up audio element');
        audioElement.pause();
        audioElement.src = '';
        audioElement.load(); // Reset the audio element completely
      }
    };
  }, [sessionId]);

  useEffect(() => {
    // Cleanup previous audio element when creating a new one
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

      // Fetch session details
      const sessionResponse = await fetch(`${backendUrl}/api/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!sessionResponse.ok) {
        throw new Error('Session not found');
      }
      
      const sessionData = await sessionResponse.json();
      setSession(sessionData.session);

      // Fetch transcriptions
      const transcriptionsResponse = await fetch(`${backendUrl}/api/sessions/${sessionId}/transcriptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (transcriptionsResponse.ok) {
        const transcriptionsData = await transcriptionsResponse.json();
        setTranscriptions(transcriptionsData.transcriptions || []);
      }

      // Fetch AI suggestions
      const suggestionsResponse = await fetch(`${backendUrl}/api/sessions/${sessionId}/suggestions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (suggestionsResponse.ok) {
        const suggestionsData = await suggestionsResponse.json();
        setSuggestions(suggestionsData.suggestions || []);
      }

      // Fetch AI summary
      const summaryResponse = await fetch(`${backendUrl}/api/sessions/${sessionId}/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setAiSummary(summaryData.summary || null);
      }

    } catch (error) {
      console.error('Error fetching session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAudio = async () => {
    if (!sessionId || audioUrl || audioLoading) return;
    
    try {
      setAudioLoading(true);
      console.log('Loading audio for session:', sessionId);
      
      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      const response = await fetch(`${backendUrl}/api/sessions/${sessionId}/post-processing?force_restitch=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Audio API response:', {
          audioUrl: data.audioUrl,
          chunkCount: data.chunkCount,
          cached: data.cached,
          fullResponse: data
        });
        
        // Check if this is actually a stitched file
        console.log('Audio URL analysis:', {
          containsSessionComplete: data.audioUrl.includes('session-complete.webm'),
          urlParts: data.audioUrl.split('/'),
          isSignedUrl: data.audioUrl.includes('supabase.co')
        });
        setAudioUrl(data.audioUrl);
        
        // Ensure we're using the stitched audio URL (should contain 'session-complete.webm')
        if (!data.audioUrl.includes('session-complete.webm')) {
          console.warn('⚠️ Audio URL does not appear to be stitched audio:', data.audioUrl);
        }
        
        // Create audio element
        const audio = new Audio(data.audioUrl);
        
        // Add event listeners
        audio.addEventListener('ended', () => {
          console.log('Audio ended, resetting to beginning');
          audio.currentTime = 0;
          setIsPlaying(false);
        });
        
        audio.addEventListener('error', (e) => {
          console.warn('Audio error:', e);
          setIsPlaying(false);
        });
        
        audio.addEventListener('loadstart', () => {
          console.log('Audio loading started for URL:', data.audioUrl);
        });
        
        audio.addEventListener('loadedmetadata', () => {
          console.log('Audio metadata loaded, duration:', audio.duration);
        });
        
        // Set the audio element first, then try to play
        setAudioElement(audio);
        
        // Try to play immediately after setting the source
        audio.addEventListener('canplay', () => {
          audio.play().then(() => {
            setIsPlaying(true);
            console.log('Auto-play started successfully');
          }).catch((error) => {
            console.warn('Auto-play failed:', error);
            // Auto-play failed, but audio is ready for manual play
          });
        }, { once: true });
      }
    } catch (error) {
      console.error('Error loading audio:', error);
    } finally {
      setAudioLoading(false);
    }
  };

  const toggleAudio = async () => {
    // If no audio element exists, load it first
    if (!audioElement && !audioLoading) {
      await loadAudio();
      return;
    }

    // If audio is loading, don't do anything
    if (audioLoading) {
      return;
    }

    // If we have an audio element, toggle playback
    if (audioElement) {
      if (isPlaying) {
        console.log('Pausing audio');
        audioElement.pause();
        setIsPlaying(false);
      } else {
        console.log('Starting audio playback. Current time:', audioElement.currentTime, 'Duration:', audioElement.duration, 'Ended:', audioElement.ended);
        
        // Always reset to beginning if audio has ended
        if (audioElement.ended || audioElement.currentTime >= audioElement.duration) {
          console.log('Resetting audio to beginning');
          audioElement.currentTime = 0;
        }
        
        // Verify we're using the correct audio source
        console.log('Audio source URL:', audioElement.src);
        console.log('Expected audio URL:', audioUrl);
        
        try {
          await audioElement.play();
          setIsPlaying(true);
          console.log('Audio playback started successfully');
        } catch (error) {
          console.warn('Could not play audio:', error);
          // If playback fails, try reloading the audio
          console.log('Reloading audio due to playback failure');
          setAudioElement(null);
          setAudioUrl(null);
          await loadAudio();
        }
      }
    }
  };

  const acknowledgeSuggestion = async (suggestionId: string) => {
    try {
      // Optimistically update UI
      setSuggestions(prev => 
        prev.map(s => s.id === suggestionId ? { ...s, acknowledged: true } : s)
      );

      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      const response = await fetch(`${backendUrl}/api/sessions/${sessionId}/suggestions`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionId,
          acknowledged: true
        }),
      });

      if (!response.ok) {
        // Revert on failure
        setSuggestions(prev => 
          prev.map(s => s.id === suggestionId ? { ...s, acknowledged: false } : s)
        );
      }
    } catch (error) {
      console.error('Error acknowledging suggestion:', error);
      // Revert on error
      setSuggestions(prev => 
        prev.map(s => s.id === suggestionId ? { ...s, acknowledged: false } : s)
      );
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50 text-red-800';
      case 'high': return 'border-red-300 bg-red-50 text-red-700';
      case 'medium': return 'border-yellow-300 bg-yellow-50 text-yellow-700';
      default: return 'border-blue-300 bg-blue-50 text-blue-700';
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'followup_question': return <MessageSquare className="w-4 h-4" />;
      case 'resource': return <Lightbulb className="w-4 h-4" />;
      case 'action_item': return <CheckCircle className="w-4 h-4" />;
      case 'concern_flag': return <AlertTriangle className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Session not found</p>
        <button 
          onClick={() => navigate('/sessions')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to Sessions
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/sessions')}
              className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {session.metadata?.title || `${session.scenario_type.replace('_', ' ')} Session`}
              </h1>
              <p className="text-gray-600 mt-1">
                {formatDate(session.created_at)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className={`px-4 py-2 text-sm font-medium rounded-full ${
              session.status === 'active' 
                ? 'bg-green-100 text-green-700'
                : session.status === 'completed'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'transcript', label: 'Transcript', icon: MessageSquare },
            { id: 'suggestions', label: 'AI Suggestions', icon: Lightbulb }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Session Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Session Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Timer className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatDuration(session.audio_duration || session.metadata?.duration)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Session Type</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {session.scenario_type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* AI Summary */}
            {aiSummary ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">AI Session Summary</h3>
                
                {/* Key Topics */}
                {aiSummary.key_topics.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {aiSummary.key_topics.map((topic, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main Concerns */}
                {aiSummary.main_concerns.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Main Concerns</h4>
                    <div className="flex flex-wrap gap-2">
                      {aiSummary.main_concerns.map((concern, index) => (
                        <span key={index} className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                          {concern}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overall Summary */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Overview</h4>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    {aiSummary.overall_summary}
                  </p>
                </div>

                {/* Progress Notes */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Progress Notes</h4>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    {aiSummary.progress_notes}
                  </p>
                </div>

                {/* Next Steps */}
                {aiSummary.next_steps.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Next Steps</h4>
                    <ul className="space-y-1">
                      {aiSummary.next_steps.map((step, index) => (
                        <li key={index} className="text-gray-700 text-sm flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risk Assessment */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Risk Assessment</h4>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    {aiSummary.risk_assessment}
                  </p>
                </div>

                {/* Summary metadata */}
                <div className="border-t border-gray-200 pt-4 text-xs text-gray-500">
                  Generated on {new Date(aiSummary.created_at).toLocaleString()} • 
                  {aiSummary.transcription_count} segments analyzed • 
                  {Math.round(aiSummary.confidence * 100)}% confidence
                </div>
              </div>
            ) : session?.full_transcript ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Summary</h3>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-600 text-sm mb-3 italic">
                    AI summary is being generated. Here's a preview of the transcript:
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    {session.full_transcript.length > 500 
                      ? `${session.full_transcript.substring(0, 500)}...`
                      : session.full_transcript
                    }
                  </p>
                  {session.full_transcript.length > 500 && (
                    <button
                      onClick={() => setActiveTab('transcript')}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
                    >
                      View full transcript →
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Recent Suggestions */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent AI Suggestions</h3>
              <div className="space-y-3">
                {suggestions.slice(0, 3).map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className={`p-3 rounded-lg border ${getPriorityColor(suggestion.priority)} ${
                      suggestion.acknowledged ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getSuggestionIcon(suggestion.type)}
                        <span className="text-xs font-medium capitalize">
                          {suggestion.type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-white">
                        {suggestion.priority}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {suggestion.content.length > 100 
                        ? `${suggestion.content.substring(0, 100)}...`
                        : suggestion.content
                      }
                    </p>
                  </div>
                ))}
                {suggestions.length > 3 && (
                  <button
                    onClick={() => setActiveTab('suggestions')}
                    className="w-full text-center text-blue-600 hover:text-blue-800 text-sm font-medium py-2"
                  >
                    View all {suggestions.length} suggestions →
                  </button>
                )}
                {suggestions.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No AI suggestions for this session
                  </p>
                )}
              </div>
            </div>

            {/* Session Timeline */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Timeline</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Session Started</p>
                    <p className="text-xs text-gray-500">
                      {new Date(session.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {session.status === 'completed' && session.metadata?.ended_at && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Session Completed</p>
                      <p className="text-xs text-gray-500">
                        {new Date(session.metadata.ended_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transcript' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Full Transcript</h2>
            <p className="text-gray-600 mt-1">
              Complete conversation transcript ({transcriptions.length} segments)
            </p>
          </div>
          <div className="p-6">
            {session.full_transcript ? (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {session.full_transcript}
                </div>
              </div>
            ) : transcriptions.length > 0 ? (
              <div className="space-y-4">
                {transcriptions.map((transcription, index) => (
                  <div key={transcription.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        Segment {index + 1}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(transcription.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{transcription.text}</p>
                    {transcription.confidence && (
                      <div className="text-xs text-gray-400 mt-2">
                        Confidence: {Math.round(transcription.confidence * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transcript available</h3>
                <p>This session doesn't have any transcription data.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">AI Suggestions</h2>
            <p className="text-gray-600 mt-1">
              Smart recommendations and insights ({suggestions.length} total)
            </p>
          </div>
          <div className="p-6">
            {suggestions.length > 0 ? (
              <div className="space-y-4">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className={`p-6 rounded-lg border ${getPriorityColor(suggestion.priority)} ${
                      suggestion.acknowledged ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                          {getSuggestionIcon(suggestion.type)}
                        </div>
                        <div>
                          <span className="font-medium capitalize">
                            {suggestion.type.replace('_', ' ')}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(suggestion.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          suggestion.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                          suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                          suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {suggestion.priority}
                        </span>
                        {suggestion.acknowledged && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                            Reviewed
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-700 leading-relaxed mb-4">{suggestion.content}</p>
                    
                    {suggestion.context && (
                      <div className="bg-white bg-opacity-50 rounded p-3 mb-4">
                        <p className="text-xs text-gray-500 mb-1">Context:</p>
                        <p className="text-sm text-gray-600">{suggestion.context}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      {suggestion.confidence && (
                        <span className="text-xs text-gray-500">
                          Confidence: {Math.round(suggestion.confidence * 100)}%
                        </span>
                      )}
                      {!suggestion.acknowledged && (
                        <button
                          onClick={() => acknowledgeSuggestion(suggestion.id)}
                          className="text-sm bg-white text-gray-700 px-4 py-2 rounded-md border hover:bg-gray-50 transition-colors font-medium"
                        >
                          Mark as Reviewed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No AI suggestions</h3>
                <p>This session doesn't have any AI-generated suggestions.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionView; 