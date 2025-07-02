import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { 
  ArrowLeft, Calendar, Clock, Phone, Mail, MapPin, 
  User, FileText, ChevronRight, Tag, Plus, Edit2,
  AlertCircle, CheckCircle, Activity
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  age?: string;
  phone?: string;
  email?: string;
  address?: string;
  date_of_birth?: string;
  emergency_contact?: string;
  notes?: string;
  tags: string[];
  status: string;
  created_at: string;
  updated_at: string;
  last_contact_date?: string;
}

interface Session {
  id: string;
  scenario_type: string;
  status: string;
  created_at: string;
  metadata?: any;
  session_summaries?: Array<{
    id: string;
    key_topics: string[];
    main_concerns: string[];
    overall_summary: string;
    next_steps: string[];
    created_at: string;
  }>;
}

export default function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  
  const [client, setClient] = useState<Client | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions'>('overview');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchClientData();
      fetchClientSessions();
    }
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      const response = await fetch(`${backendUrl}/api/clients/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch client');
      
      const data = await response.json();
      setClient(data.client);
    } catch (error) {
      console.error('Error fetching client:', error);
    }
  };

  const fetchClientSessions = async () => {
    try {
      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      const response = await fetch(`${backendUrl}/api/clients/${clientId}/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch sessions');
      
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSinceLastContact = () => {
    if (!client?.last_contact_date) return 'Never contacted';
    
    const lastContact = new Date(client.last_contact_date);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  const startNewSession = () => {
    // Navigate to dashboard and open new session modal with client pre-selected
    navigate('/', { state: { openNewSession: true, clientId: client?.id } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading client information...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-text-primary mb-4">Client not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-accent hover:text-accent-dark"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-text-primary">{client.name}</h1>
                <p className="text-sm text-text-secondary">Last contact: {getTimeSinceLastContact()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={startNewSession}
                className="bg-accent hover:bg-accent-dark text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Start new session
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'sessions'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Sessions ({sessions.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Client Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-text-secondary">Age</label>
                    <p className="text-text-primary">{client.age || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary">Date of Birth</label>
                    <p className="text-text-primary">
                      {client.date_of_birth 
                        ? new Date(client.date_of_birth).toLocaleDateString()
                        : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary">Phone</label>
                    <p className="text-text-primary flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-text-secondary" />
                      {client.phone || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary">Email</label>
                    <p className="text-text-primary flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-text-secondary" />
                      {client.email || 'Not specified'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-text-secondary">Address</label>
                    <p className="text-text-primary flex items-start">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 text-text-secondary flex-shrink-0" />
                      {client.address || 'Not specified'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-text-secondary">Emergency Contact</label>
                    <p className="text-text-primary">{client.emergency_contact || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {client.notes && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-4">Notes</h2>
                  <p className="text-text-primary whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}

              {/* Next Steps */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Next Steps</h2>
                {(() => {
                  // Collect all next steps from sessions with summaries
                  const allNextSteps: { step: string; sessionId: string; date: string }[] = [];
                  sessions.forEach(session => {
                    if (session.session_summaries?.[0]?.next_steps) {
                      session.session_summaries[0].next_steps.forEach(step => {
                        allNextSteps.push({
                          step,
                          sessionId: session.id,
                          date: session.created_at
                        });
                      });
                    }
                  });

                  if (allNextSteps.length > 0) {
                    return (
                      <div className="space-y-3">
                        {allNextSteps.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="flex items-start space-x-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <p className="text-sm text-text-primary">{item.step}</p>
                              <p className="text-xs text-text-secondary mt-1">
                                From session on {new Date(item.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                        {allNextSteps.length > 5 && (
                          <p className="text-sm text-text-secondary italic">
                            +{allNextSteps.length - 5} more steps
                          </p>
                        )}
                      </div>
                    );
                  } else {
                    return <p className="text-text-secondary">No next steps recorded yet</p>;
                  }
                })()}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status and Tags */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Status & Tags</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-text-secondary">Status</label>
                    <div className="mt-1 flex items-center">
                      {client.status === 'active' ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-gray-400 mr-2" />
                      )}
                      <span className="capitalize">{client.status}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary">Tags</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {client.tags.length > 0 ? (
                        client.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full flex items-center"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-text-secondary text-sm">No tags</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Statistics</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Total Sessions</span>
                    <span className="font-medium">{sessions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Active Sessions</span>
                    <span className="font-medium">
                      {sessions.filter(s => s.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Member Since</span>
                    <span className="font-medium">
                      {new Date(client.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {sessions.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/session/${session.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-text-primary">
                            {session.metadata?.title || `${session.scenario_type.replace('_', ' ')} Session`}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            session.status === 'completed' 
                              ? 'bg-green-100 text-green-700'
                              : session.status === 'active'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary mb-3">
                          {formatDate(session.created_at)}
                        </p>
                        {session.session_summaries?.[0] && (
                          <div className="space-y-2">
                            {session.session_summaries[0].key_topics.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {session.session_summaries[0].key_topics.map((topic, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-sm text-text-secondary line-clamp-2">
                              {session.session_summaries[0].overall_summary}
                            </p>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-secondary ml-4 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-text-secondary mb-4">No sessions recorded yet</p>
                <button
                  onClick={startNewSession}
                  className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Start first session
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}