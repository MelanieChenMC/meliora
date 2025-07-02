import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Clock, CheckCircle, Pause, Search, Filter, Plus, Users, Phone, Video, Play, Square, Trash2 } from 'lucide-react';

interface Session {
  id: string;
  scenario_type: 'in_person' | 'call_center' | 'conference';
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  room_name?: string;
  stitched_audio_url?: string;
  full_transcript?: string;
  audio_duration?: number;
  client?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  metadata?: {
    title?: string;
    duration?: number;
    recording_url?: string;
  };
}

const Sessions: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [playingSession, setPlayingSession] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const navigate = useNavigate();
  const { getToken } = useAuth();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Audio player functions
  const handlePlayPause = async (sessionId: string, recordingUrl?: string) => {
    if (!recordingUrl) {
      // Fetch the stitched session audio from the backend
      setLoadingAudio(sessionId);
      try {
        const token = await getToken();
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
        
        // Add timeout for very large sessions (up to 5 minutes)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes
        
        const response = await fetch(`${backendUrl}/api/sessions/${sessionId}/post-processing`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          recordingUrl = data.audioUrl;
          
          const statusMsg = data.cached ? 'Loaded cached session audio' : 'Created stitched session audio';
          console.log(`🎵 ${statusMsg} for session ${sessionId} (${data.chunkCount} chunks)`);
        } else {
          const errorData = await response.json();
          console.warn('Could not fetch session audio:', errorData.error);
          alert(`Could not load session audio: ${errorData.error}`);
          setLoadingAudio(null);
          return;
        }
      } catch (error) {
        console.warn('Error fetching session audio:', error);
        if (error instanceof Error && error.name === 'AbortError') {
          alert('Audio processing is taking longer than expected. This may be a very long session. Please try again later.');
        } else {
          alert('Error loading session audio. Please try again.');
        }
        setLoadingAudio(null);
        return;
      } finally {
        setLoadingAudio(null);
      }
    }

    if (playingSession === sessionId) {
      // Pause current audio
      const audio = audioElements[sessionId];
      if (audio) {
        audio.pause();
      }
      setPlayingSession(null);
    } else {
      // Stop any currently playing audio
      if (playingSession && audioElements[playingSession]) {
        audioElements[playingSession].pause();
      }

      // Start new audio
      let audio = audioElements[sessionId];
      if (!audio) {
        audio = new Audio(recordingUrl);
        audio.addEventListener('ended', () => {
          setPlayingSession(null);
        });
        audio.addEventListener('error', () => {
          console.warn(`Could not load recording for session ${sessionId}`);
          setPlayingSession(null);
        });
        setAudioElements(prev => ({ ...prev, [sessionId]: audio }));
      }
      
      audio.play().catch(error => {
        console.warn('Could not play audio:', error);
        setPlayingSession(null);
      });
      setPlayingSession(sessionId);
    }
  };

  // Delete session function
  const deleteSession = async (sessionId: string, sessionTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${sessionTitle}"? This action cannot be undone.`)) {
      try {
        const token = await getToken();
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
        
        const response = await fetch(`${backendUrl}/api/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to delete session: ${response.statusText}`);
        }

        // Remove the session from local state
        setSessions(prev => prev.filter(session => session.id !== sessionId));
        
        console.log('✅ Session deleted successfully');
      } catch (error) {
        console.error('❌ Error deleting session:', error);
        alert('Failed to delete session. Please try again.');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'in_person':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'call_center':
        return <Phone className="w-4 h-4 text-green-500" />;
      case 'conference':
        return <Video className="w-4 h-4 text-purple-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 2592000) { // 30 days
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else {
      // For older dates, show the actual date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter sessions based on search and filters
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = searchTerm === '' || 
      session.scenario_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.metadata?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesType = typeFilter === 'all' || session.scenario_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sessions</h1>
          <p className="text-gray-600">Manage and review your AI-assisted sessions.</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Session</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="in_person">In-Person</option>
            <option value="call_center">Call Center</option>
            <option value="conference">Conference</option>
          </select>
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {sessions.length === 0 ? 'No sessions yet' : 'No sessions match your filters'}
          </h3>
          <p className="text-gray-600 mb-6">
            {sessions.length === 0 
              ? 'Start your first session from the dashboard.' 
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Create New Session
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Session</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Type</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Started</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Duration</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Recording</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session, index) => (
                  <tr
                    key={session.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      index !== filteredSessions.length - 1 ? 'border-b border-gray-200' : ''
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-medium text-gray-900">
                          {session.metadata?.title || `${session.scenario_type.replace('_', ' ')} Session`}
                        </div>
                        {session.client && (
                          <div className="text-sm text-gray-500 mt-1">
                            Client: <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/client/${session.client?.id}`);
                              }}
                              className="text-accent hover:text-accent-dark"
                            >
                              {session.client?.name}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(session.scenario_type)}
                        <span className="text-sm text-gray-900 capitalize">
                          {session.scenario_type.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-900">
                        {formatDate(session.created_at)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-900">
                        {session.status === 'active' 
                          ? 'Ongoing' 
                          : formatDuration(session.audio_duration || session.metadata?.duration)
                        }
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        {session.status === 'active' ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-red-600">Recording</span>
                          </div>
                        ) : session.status === 'completed' ? (
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (session.stitched_audio_url || session.metadata?.recording_url) {
                                  handlePlayPause(session.id, session.metadata?.recording_url);
                                }
                              }}
                              className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                                session.stitched_audio_url || session.metadata?.recording_url
                                  ? 'bg-blue-100 hover:bg-blue-200 cursor-pointer'
                                  : 'bg-gray-100 cursor-not-allowed'
                              }`}
                              title={
                                !(session.stitched_audio_url || session.metadata?.recording_url)
                                  ? 'No audio recording available'
                                  : loadingAudio === session.id 
                                    ? session.audio_duration && session.audio_duration > 1800 // 30+ minutes
                                      ? 'Processing large session (this may take a few minutes)...' 
                                      : 'Preparing audio...'
                                    : playingSession === session.id 
                                      ? 'Pause recording' 
                                      : 'Play complete session recording'
                              }
                              disabled={loadingAudio === session.id || !(session.stitched_audio_url || session.metadata?.recording_url)}
                            >
                              {loadingAudio === session.id ? (
                                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                              ) : playingSession === session.id ? (
                                <Square className="w-3 h-3 text-blue-600 fill-current" />
                              ) : (
                                <Play className={`w-3 h-3 fill-current ml-0.5 ${
                                  session.stitched_audio_url || session.metadata?.recording_url
                                    ? 'text-blue-600'
                                    : 'text-gray-400'
                                }`} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span className="text-sm text-yellow-600">Paused</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => navigate(`/session/${session.id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id, session.metadata?.title || `${session.scenario_type.replace('_', ' ')} Session`);
                          }}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 text-sm font-medium transition-all duration-200 flex items-center space-x-1 px-2 py-1 rounded"
                          title="Delete session"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sessions; 