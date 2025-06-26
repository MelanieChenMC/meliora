import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useRealTimeTranscription } from '../hooks/useRealTimeTranscription';
import { 
  Mic, MicOff, Settings, Phone, PhoneOff,
  MessageSquare, Lightbulb, Timer, Wifi, Activity
} from 'lucide-react';

interface Session {
  id: string;
  scenario_type: 'in_person' | 'call_center' | 'conference';
  status: 'active' | 'completed' | 'paused';
  room_name?: string;
  created_at: string;
  metadata: any;
}

interface Transcription {
  id: string;
  text: string;
  timestamp: string;
  confidence: number;
  duration?: number;
  audio_url?: string;
}

interface AISuggestion {
  id: string;
  type: 'followup_question' | 'resource' | 'action_item' | 'concern_flag';
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  acknowledged: boolean;
}

export default function AudioSessionRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [activeTab, setActiveTab] = useState<'transcription' | 'suggestions'>('transcription');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionInterval, setSessionInterval] = useState<NodeJS.Timeout | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [volume, setVolume] = useState(1);
  const [viewMode, setViewMode] = useState<'stream' | 'messages'>('stream');
  
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const sessionStartTime = useRef<Date>(new Date());

  // Add audio debugging state
  const [audioDebugInfo, setAudioDebugInfo] = useState<{
    devices: MediaDeviceInfo[];
    currentStream: MediaStreamTrack | null;
    systemInfo: any;
  }>({
    devices: [],
    currentStream: null,
    systemInfo: null
  });

  // Real-time transcription hook
  const {
    startRecording,
    stopRecording,
    isRecording,
    isProcessing,
    error: transcriptionError
  } = useRealTimeTranscription({
    sessionId: sessionId || '',
    onTranscription: (transcription) => {
      setTranscriptions(prev => [...prev, {
        id: transcription.id,
        text: transcription.text,
        timestamp: transcription.timestamp,
        confidence: transcription.confidence,
        duration: transcription.duration
      }]);
    }
  });

  // AI suggestion generation interval
  const aiGenerationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      loadExistingSuggestions();
      const timer = startSessionTimer();
      
      return () => {
        if (timer) {
          clearInterval(timer);
        }
        if (aiGenerationInterval.current) {
          clearInterval(aiGenerationInterval.current);
        }
      };
    }
  }, [sessionId]);

  // Set up periodic AI suggestion generation when recording starts
  useEffect(() => {
    if (isRecording) {
      console.log('🤖 Starting periodic AI suggestion generation (every 30 seconds)');
      aiGenerationInterval.current = setInterval(() => {
        generateAISuggestion();
      }, 30000); // 30 seconds
    } else {
      if (aiGenerationInterval.current) {
        console.log('🛑 Stopping periodic AI suggestion generation');
        clearInterval(aiGenerationInterval.current);
        aiGenerationInterval.current = null;
      }
    }

    return () => {
      if (aiGenerationInterval.current) {
        clearInterval(aiGenerationInterval.current);
        aiGenerationInterval.current = null;
      }
    };
  }, [isRecording]);

  // Auto-scroll transcription
  useEffect(() => {
    if (transcriptionRef.current) {
      transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight;
    }
  }, [transcriptions]);

  const fetchSession = async () => {
    try {
      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setSession(data.session);
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingSuggestions = async () => {
    try {
      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

      // Load existing AI suggestions only
      const suggestionsResponse = await fetch(`${backendUrl}/api/sessions/${sessionId}/suggestions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (suggestionsResponse.ok) {
        const suggestionsData = await suggestionsResponse.json();
        if (suggestionsData.suggestions && suggestionsData.suggestions.length > 0) {
          console.log(`💡 Loaded ${suggestionsData.suggestions.length} existing AI suggestions`);
          const formattedSuggestions = suggestionsData.suggestions.map((s: any) => ({
            id: s.id,
            type: s.type,
            content: s.content,
            priority: s.priority,
            acknowledged: s.acknowledged
          }));
          setSuggestions(formattedSuggestions);
        }
      }
    } catch (error) {
      console.error('Error loading existing suggestions:', error);
    }
  };

  const startSessionTimer = () => {
    const interval = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - sessionStartTime.current.getTime()) / 1000));
    }, 1000);
    setSessionInterval(interval);
    return interval;
  };

  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const generateAISuggestion = async () => {
    try {
      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      console.log('🤖 Generating AI suggestions...');
      
      const response = await fetch(`${backendUrl}/api/sessions/${sessionId}/generate-suggestions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('⚠️ Failed to generate AI suggestions:', errorText);
        return;
      }

      const result = await response.json();
      
      if (result.suggestions && result.suggestions.length > 0) {
        console.log(`✅ Generated ${result.suggestions.length} AI suggestions`);
        
        // Add the new suggestions to the UI
        const newSuggestions: AISuggestion[] = result.suggestions.map((s: any) => ({
          id: s.id,
          type: s.type,
          content: s.content,
          priority: s.priority,
          acknowledged: s.acknowledged
        }));
        
        setSuggestions(prev => [...prev, ...newSuggestions]);
      } else {
        console.log('ℹ️ No AI suggestions generated:', result.message || 'No recent conversation');
      }
    } catch (error) {
      console.error('❌ Error generating AI suggestions:', error);
    }
  };

  const acknowledgeSuggestion = async (id: string) => {
    try {
      // Optimistically update the UI
      setSuggestions(prev => 
        prev.map(s => s.id === id ? { ...s, acknowledged: true } : s)
      );

      // Save to database
      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      const response = await fetch(`${backendUrl}/api/sessions/${sessionId}/suggestions`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionId: id,
          acknowledged: true
        }),
      });

      if (!response.ok) {
        console.warn('⚠️ Failed to save suggestion acknowledgment:', await response.text());
        // Revert the optimistic update
        setSuggestions(prev => 
          prev.map(s => s.id === id ? { ...s, acknowledged: false } : s)
        );
      } else {
        console.log('✅ Suggestion acknowledgment saved');
      }
    } catch (error) {
      console.error('❌ Error acknowledging suggestion:', error);
      // Revert the optimistic update
      setSuggestions(prev => 
        prev.map(s => s.id === id ? { ...s, acknowledged: false } : s)
      );
    }
  };

  const endSession = async () => {
    if (window.confirm('Are you sure you want to end this session?')) {
      try {
        stopRecording();
        
        const token = await getToken();
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
        
        // Calculate final session duration
        const finalDuration = Math.floor((Date.now() - sessionStartTime.current.getTime()) / 1000);
        
        // Update session with completion data
        const updateData = {
          status: 'completed',
          metadata: {
            ...session?.metadata,
            duration: finalDuration,
            transcription_count: transcriptions.length,
            ai_suggestions_count: suggestions.length,
            ended_at: new Date().toISOString()
          }
        };
        
        console.log('🏁 Ending session with data:', updateData);
        
        const response = await fetch(`${backendUrl}/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update session: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Session ended successfully:', result);
        
        // Trigger post-processing (audio stitching + AI summary) in the background
        if (transcriptions.length > 0) {
          console.log('🔗 Triggering background post-processing...');
          fetch(`${backendUrl}/api/sessions/${sessionId}/post-processing`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }).then(postProcessResponse => {
            if (postProcessResponse.ok) {
              console.log('✅ Post-processing completed successfully');
            } else {
              console.warn('⚠️ Post-processing failed, will retry on first play');
            }
          }).catch(postProcessError => {
            console.warn('⚠️ Post-processing error:', postProcessError);
          });
        }
        
        // Navigate to sessions page to see the completed session
        navigate('/sessions');
      } catch (error) {
        console.error('Error ending session:', error);
        // Still navigate even if update failed
        navigate('/sessions');
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio debugging function
  const debugAudioDevices = async () => {
    try {
      console.log('🔍 Debugging audio devices...');
      
      // Get all devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      console.log('📱 All audio input devices:', audioInputs);
      
      // Get system information
      const systemInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled
      };
      
      // Test different audio constraints
      const constraints = [
        { audio: true }, // Default
        { audio: { deviceId: 'default' } }, // Explicit default
        { audio: { deviceId: { exact: 'default' } } }, // Exact default
      ];
      
      console.log('🎤 Testing different audio constraints...');
      
      for (let i = 0; i < constraints.length; i++) {
        try {
          console.log(`Testing constraint ${i + 1}:`, constraints[i]);
          const stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
          const tracks = stream.getAudioTracks();
          
          console.log(`✅ Constraint ${i + 1} worked:`, tracks.map(track => ({
            label: track.label,
            kind: track.kind,
            enabled: track.enabled,
            muted: track.muted,
            settings: track.getSettings(),
            capabilities: track.getCapabilities()
          })));
          
          // Stop the stream
          stream.getTracks().forEach(track => track.stop());
          
          // Use the first working stream info for debugging
          if (i === 0) {
            setAudioDebugInfo({
              devices: audioInputs,
              currentStream: tracks[0] || null,
              systemInfo
            });
          }
          
        } catch (error) {
          console.error(`❌ Constraint ${i + 1} failed:`, error);
        }
      }
      
    } catch (error) {
      console.error('Error debugging audio:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white text-gray-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-800">
            {session?.metadata?.title || 'In-Person Session'}
          </h1>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Timer className="h-4 w-4" />
            <span>{formatDuration(sessionDuration)}</span>
          </div>
          {isRecording && (
            <div className="flex items-center space-x-2 text-sm text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>Recording</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg transition-colors ${
              isMuted ? 'bg-red-100 hover:bg-red-200 text-red-700' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isRecording 
                ? 'bg-red-100 hover:bg-red-200 text-red-700' 
                : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
            }`}
          >
            {isRecording ? 'Stop' : 'Start'}
          </button>
          
          <button
            onClick={endSession}
            className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg transition-colors"
          >
            End Session
          </button>
          
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg transition-colors text-xs"
          >
            🔧 Debug
          </button>
          
          <button
            onClick={debugAudioDevices}
            className="bg-blue-200 hover:bg-blue-300 text-blue-700 px-3 py-2 rounded-lg transition-colors text-xs"
          >
            🎤 Test Mic
          </button>
        </div>
      </div>

      {/* Error Messages */}
      {transcriptionError && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 px-6 py-3">
          <p>Error: {transcriptionError}</p>
        </div>
      )}

      {showDebug && (
        <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 px-6 py-4">
          <h3 className="font-semibold mb-2">🔧 Audio Debug Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Recording Status:</strong> {isRecording ? '🔴 Recording' : '⚫ Stopped'}</p>
              <p><strong>Processing:</strong> {isProcessing ? '⏳ Processing' : '✅ Ready'}</p>
              <p><strong>Transcriptions:</strong> {transcriptions.length} segments</p>
              <p><strong>Last transcription:</strong> {transcriptions.length > 0 ? `"${transcriptions[transcriptions.length - 1].text.substring(0, 50)}..."` : 'None'}</p>
            </div>
            <div>
              <p><strong>🚨 Audio Source Problem Detected!</strong></p>
              <p className="text-xs mt-1">The transcription shows generic phrases like "Thank you for watching" or "Bye bye" - this means your browser is picking up audio from:</p>
              <ul className="text-xs mt-2 space-y-1">
                <li>• <strong>Other browser tabs</strong> (YouTube, Netflix, etc.)</li>
                <li>• <strong>Background apps</strong> (Spotify, podcasts, etc.)</li>
                <li>• <strong>Other transcription services</strong> (Otter.ai, etc.)</li>
                <li>• <strong>System audio sharing</strong> (screen recording apps)</li>
              </ul>
              <p className="text-xs mt-2 font-semibold">Quick Fix: Close all other audio sources and try again!</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Transcriptions */}
        <div className="flex-1 bg-gray-50 border-r border-gray-200 flex flex-col min-w-0">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-800">Transcription</h2>

          </div>

          <div ref={transcriptionRef} className="flex-1 overflow-y-auto p-4 min-h-0">
            {transcriptions.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Real-time transcription will appear here when you start recording</p>
                <p className="text-xs mt-2 text-gray-400">Powered by OpenAI Whisper</p>
              </div>
            ) : (
              <div className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                {transcriptions.map((t, index) => (
                  <span key={t.id}>
                    {t.text}
                    {index < transcriptions.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - AI Suggestions */}
        <div className="w-96 bg-white flex flex-col min-w-0 flex-shrink-0">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">AI Suggestions</h2>
              {suggestions.some(s => !s.acknowledged) && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {suggestions.filter(s => !s.acknowledged).length}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {suggestions.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>AI suggestions will appear here during the conversation</p>
                <p className="text-xs mt-2 text-gray-400">Powered by conversation analysis</p>
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    suggestion.acknowledged
                      ? 'bg-gray-100 border-gray-300 opacity-60'
                      : suggestion.priority === 'high'
                      ? 'bg-red-50 border-red-400'
                      : suggestion.priority === 'medium'
                      ? 'bg-yellow-50 border-yellow-400'
                      : 'bg-blue-50 border-blue-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      suggestion.type === 'followup_question'
                        ? 'bg-blue-100 text-blue-800'
                        : suggestion.type === 'resource'
                        ? 'bg-green-100 text-green-800'
                        : suggestion.type === 'action_item'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-red-100 text-red-800' // concern_flag
                    }`}>
                      {suggestion.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      suggestion.priority === 'urgent'
                        ? 'bg-red-100 text-red-800'
                        : suggestion.priority === 'high'
                        ? 'bg-orange-100 text-orange-800'
                        : suggestion.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {suggestion.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{suggestion.content}</p>
                  {!suggestion.acknowledged && (
                    <button
                      onClick={() => acknowledgeSuggestion(suggestion.id)}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}