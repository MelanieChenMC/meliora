import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useRealTimeTranscription } from '../hooks/useRealTimeTranscription';
import { 
  Mic, MicOff, MessageSquare, Lightbulb, Timer, 
  Save, FileText, Link, Phone, Mail, MapPin,
  ChevronDown, ChevronRight, X, Plus, Minus, User, Check, Search
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

interface Resource {
  id: string;
  title: string;
  type: 'phone' | 'website' | 'document' | 'email';
  link: string;
  description: string;
  relevance: number;
}

interface ClientInfo {
  name: string;
  age: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  needs: string[];
}

export default function AudioSessionRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: '',
    age: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    needs: []
  });
  const [clientId, setClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(true);
  const [expandedSections, setExpandedSections] = useState<{
    clientInfo: boolean;
    previousConversations: boolean;
    myNotes: boolean;
  }>({
    clientInfo: true,
    previousConversations: false,
    myNotes: false
  });
  const [myNotes, setMyNotes] = useState('');
  const [showValidationError, setShowValidationError] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const sessionStartTime = useRef<Date>(new Date());
  const sessionInterval = useRef<NodeJS.Timeout | null>(null);

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

  // Mock resources - in production these would come from AI analysis
  const mockResources: Resource[] = [
    {
      id: '1',
      title: 'Housing Assistance Program',
      type: 'phone',
      link: 'tel:1-800-HOUSING',
      description: 'Emergency housing support and shelter services',
      relevance: 0.95
    },
    {
      id: '2',
      title: 'Food Bank Network',
      type: 'website',
      link: 'https://foodbank.org',
      description: 'Local food assistance programs and pantries',
      relevance: 0.87
    },
    {
      id: '3',
      title: 'Mental Health Services',
      type: 'document',
      link: '/resources/mental-health.pdf',
      description: 'Free counseling and therapy resources',
      relevance: 0.82
    }
  ];

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      setResources(mockResources);
      const timer = startSessionTimer();
      
      return () => {
        if (timer) {
          clearInterval(timer);
        }
      };
    }
  }, [sessionId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchClients(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
      
      // If session has a client, load their info
      if (data.session.client) {
        selectClient(data.session.client);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };

  const startSessionTimer = () => {
    const timer = setInterval(() => {
      const now = new Date();
      const duration = Math.floor((now.getTime() - sessionStartTime.current.getTime()) / 1000);
      setSessionDuration(duration);
    }, 1000);
    sessionInterval.current = timer;
    return timer;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      await stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const endSession = async () => {
    if (isRecording) {
      await handleStopRecording();
    }
    
    // Update session status to completed
    try {
      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      const response = await fetch(`${backendUrl}/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed'
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to update session status');
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
    
    navigate('/');
  };

  const searchClients = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      const response = await fetch(
        `${backendUrl}/api/clients?search=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.clients || []);
      }
    } catch (error) {
      console.error('Error searching clients:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectClient = async (client: any) => {
    setClientId(client.id);
    setClientInfo({
      name: client.name || '',
      age: client.age || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || '',
      needs: []
    });
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setIsNewClient(false);
    
    // Immediately update the session with this client
    await updateSessionClient(client.id);
  };

  const startNewClient = () => {
    setClientId(null);
    setClientInfo({
      name: '',
      age: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      needs: []
    });
    setShowSearch(false);
    setIsNewClient(true);
  };

  const saveClientInfo = async () => {
    // Check if all fields are filled
    if (!clientInfo.name || !clientInfo.age || !clientInfo.phone || !clientInfo.email || !clientInfo.address) {
      setShowValidationError(true);
      return;
    }
    
    // Hide validation error if shown
    setShowValidationError(false);
    
    try {
      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      if (isNewClient && !clientId) {
        // Create new client
        const response = await fetch(`${backendUrl}/api/clients`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(clientInfo),
        });
        
        if (response.ok) {
          const data = await response.json();
          setClientId(data.client.id);
          setIsNewClient(false);
          
          // Update session with client ID
          await updateSessionClient(data.client.id);
        }
      } else if (clientId) {
        // Update existing client
        await fetch(`${backendUrl}/api/clients/${clientId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(clientInfo),
        });
        
        // Also ensure the session is linked to this client
        await updateSessionClient(clientId);
      }
      
      // Collapse the section after saving
      setExpandedSections(prev => ({
        ...prev,
        clientInfo: false
      }));
    } catch (error) {
      console.error('Error saving client info:', error);
      alert('Failed to save client information');
    }
  };

  const updateSessionClient = async (newClientId: string) => {
    try {
      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      const response = await fetch(`${backendUrl}/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: newClientId,
          metadata: session?.metadata || {}
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to update session client:', response.status);
      } else {
        console.log('Successfully linked client to session');
      }
    } catch (error) {
      console.error('Error updating session client:', error);
    }
  };


  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'phone': return Phone;
      case 'website': return Link;
      case 'email': return Mail;
      case 'document': return FileText;
      default: return FileText;
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
    // Clear validation error when toggling sections
    if (section === 'clientInfo') {
      setShowValidationError(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header - No border, blends with background */}
      <div className="bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-text-primary">
            {session?.metadata?.title || 'In-Person Session'}
          </h1>
          <div className="flex items-center space-x-2 text-sm text-text-secondary">
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
            className={`p-1.5 rounded-md transition-colors ${
              isMuted ? 'bg-red-100 hover:bg-red-200 text-red-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`px-3 py-1.5 rounded-md transition-colors font-medium text-sm ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-accent hover:bg-accent-dark text-white'
            }`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          
          <button
            onClick={endSession}
            className="text-text-secondary hover:text-text-primary transition-colors text-sm px-3 py-1.5"
          >
            End Session
          </button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex gap-6 px-6 pb-6 min-h-0">
        {/* Left Column - Client Information and Transcript */}
        <div className="w-1/2 flex flex-col gap-6 min-w-0">
          {/* Collapsible Sections */}
          <div className="bg-white shadow-sm border border-border overflow-y-auto">
            {/* Client Information Section */}
            <div className="border-b border-gray-200">
              <button
                onClick={() => toggleSection('clientInfo')}
                className="w-full px-4 py-2 flex items-center hover:bg-gray-50 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                  {expandedSections.clientInfo ? 
                    <Minus className="h-3 w-3 text-gray-600" /> : 
                    <Plus className="h-3 w-3 text-gray-600" />
                  }
                </div>
                <h3 className="font-medium text-lg text-text-primary flex-1 text-left">Client Information</h3>
                {/* Show green check if client is selected or all fields are filled */}
                {!expandedSections.clientInfo && (clientId || (clientInfo.name && clientInfo.age && clientInfo.phone && clientInfo.email && clientInfo.address)) && (
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                )}
                {expandedSections.clientInfo && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      saveClientInfo();
                    }}
                    className="text-accent hover:text-accent-dark transition-colors"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                )}
              </button>
              {expandedSections.clientInfo && (
                <div className="px-4 pb-4 space-y-3">
            {showValidationError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                Please fill in all required fields
              </div>
            )}
            
            {/* Client Search */}
            {showSearch && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search existing client by name, phone, or email..."
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
                </div>
                
                {/* Search Results */}
                {(searchResults.length > 0 || searchQuery.length >= 2) && (
                  <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => selectClient(client)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-sm">{client.name}</div>
                          <div className="text-xs text-gray-500">
                            {client.phone} • {client.email}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center">
                        <p className="text-sm text-gray-500">No clients found</p>
                        <button
                          onClick={startNewClient}
                          className="mt-2 text-sm text-accent hover:text-accent-dark font-medium"
                        >
                          Create new client
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={startNewClient}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                >
                  + Add new client
                </button>
              </div>
            )}
            
            {/* Client Form */}
            {!showSearch && (
              <>
                {!isNewClient && clientId && (
                  <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md">
                    <span className="text-sm text-green-700">Existing client selected</span>
                    <button
                      onClick={() => {
                        setShowSearch(true);
                        setClientId(null);
                      }}
                      className="text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                      Change
                    </button>
                  </div>
                )}
                
                <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
              <input
                type="text"
                value={clientInfo.name}
                onChange={(e) => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                placeholder="Enter client name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Age</label>
                <input
                  type="text"
                  value={clientInfo.age}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, age: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  placeholder="Enter age"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={clientInfo.phone}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={clientInfo.email}
                onChange={(e) => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                placeholder="Enter email address"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Address</label>
              <input
                type="text"
                value={clientInfo.address}
                onChange={(e) => setClientInfo(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                placeholder="Enter home address"
                required
              />
            </div>
              </>
            )}
                </div>
              )}
            </div>

            {/* Previous Conversations Section */}
            <div className="border-b border-gray-200">
              <button
                onClick={() => toggleSection('previousConversations')}
                className="w-full px-4 py-2 flex items-center hover:bg-gray-50 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                  {expandedSections.previousConversations ? 
                    <Minus className="h-3 w-3 text-gray-600" /> : 
                    <Plus className="h-3 w-3 text-gray-600" />
                  }
                </div>
                <h3 className="font-medium text-lg text-text-primary flex-1 text-left">Previous Conversations</h3>
              </button>
              {expandedSections.previousConversations && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-gray-500 italic">No previous conversations found</p>
                </div>
              )}
            </div>

            {/* My Notes Section */}
            <div>
              <button
                onClick={() => toggleSection('myNotes')}
                className="w-full px-4 py-2 flex items-center hover:bg-gray-50 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                  {expandedSections.myNotes ? 
                    <Minus className="h-3 w-3 text-gray-600" /> : 
                    <Plus className="h-3 w-3 text-gray-600" />
                  }
                </div>
                <h3 className="font-medium text-lg text-text-primary flex-1 text-left">My Notes</h3>
              </button>
              {expandedSections.myNotes && (
                <div className="px-4 pb-4">
                  <textarea
                    value={myNotes}
                    onChange={(e) => setMyNotes(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors resize-none"
                    rows={6}
                    placeholder="Add your notes here..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Live Transcript */}
          <div className="bg-white shadow-sm border border-border flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-text-primary">Live Transcript</h2>
          </div>

          <div ref={transcriptionRef} className="flex-1 overflow-y-auto p-4 min-h-0">
            {transcriptions.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Real-time transcription will appear here when you start recording</p>
                <p className="text-xs mt-2 text-gray-400">Powered by OpenAI Whisper</p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <p className="text-text-primary leading-relaxed">
                  {transcriptions.map((transcription) => transcription.text).join(' ')}
                </p>
              </div>
            )}
          </div>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div className="border-t border-gray-100 p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Lightbulb className="h-5 w-5 text-accent" />
                <h3 className="font-medium text-text-primary">AI Suggestions</h3>
              </div>
              <div className="space-y-2">
                {suggestions.slice(-3).map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="bg-accent-background border border-accent/20 p-3 text-sm"
                  >
                    <p className="text-text-primary">{suggestion.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Right Column - Resources */}
        <div className="w-1/2 bg-white shadow-sm border border-border p-4 flex flex-col">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Relevant Resources</h2>
          
          <div className="flex-1 overflow-y-auto space-y-3">
            {resources.map((resource) => {
              const IconComponent = getResourceIcon(resource.type);
              return (
                <a
                  key={resource.id}
                  href={resource.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-accent-background rounded-lg flex items-center justify-center flex-shrink-0">
                      <IconComponent className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-text-primary">{resource.title}</h4>
                      <p className="text-sm text-text-secondary mt-1">{resource.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-text-muted">Relevance:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-accent rounded-full h-1.5"
                            style={{ width: `${resource.relevance * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">{Math.round(resource.relevance * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}