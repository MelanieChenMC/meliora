import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Users, Phone, Video, Plus, X, User, Clock, Search } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  age?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: string;
  tags: string[];
  last_contact_date?: string;
  created_at: string;
  updated_at: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
    
    // Check if we should open new session modal from navigation
    if (location.state?.openNewSession) {
      setSelectedClient(location.state.clientId || null);
      setShowModal(true);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchClients = async () => {
    try {
      const token = await getToken();
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      const response = await fetch(`${backendUrl}/api/clients?status=active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      // If error, show empty list instead of crashing
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const createSession = (scenarioType: string) => {
    setShowModal(false);
    if (selectedClient) {
      // Pass client ID in state
      navigate(`/session/new/${scenarioType}`, { state: { clientId: selectedClient } });
    } else {
      navigate(`/session/new/${scenarioType}`);
    }
    setSelectedClient(null);
  };

  const sessionTypes = [
    {
      id: 'in_person',
      title: 'In Person',
      description: 'Record and analyze face-to-face client meetings',
      icon: Users,
    },
    {
      id: 'call_center',
      title: 'Telephony',
      description: 'AI assistance for phone calls and support',
      icon: Phone,
    }
  ];

  // Get user's first name, with fallback
  const getFirstName = () => {
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.fullName) {
      return user.fullName.split(' ')[0];
    }
    return 'there'; // Friendly fallback
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Filter clients based on search term
  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return client.name.toLowerCase().includes(searchLower) ||
           (client.email?.toLowerCase().includes(searchLower) || false) ||
           (client.phone?.toLowerCase().includes(searchLower) || false) ||
           client.tags.some(tag => tag.toLowerCase().includes(searchLower));
  });

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Welcome Banner */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-text-primary">
            Welcome, {getFirstName()}!
          </h1>
        </div>

        {/* New Session Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowModal(true)}
            className="bg-accent hover:bg-accent-dark text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            New session
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Clients Table */}
        <div className="flex-1">

          {loadingClients ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          ) : clients.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients yet</h3>
              <p className="text-gray-600">Your clients will appear here once added.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Client</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Last Contact</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Contact Info</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Tags</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client, index) => (
                      <tr
                        key={client.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          index !== filteredClients.length - 1 ? 'border-b border-gray-200' : ''
                        }`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-accent-background rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-accent" />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/client/${client.id}`);
                              }}
                              className="font-medium text-gray-900 hover:text-accent transition-colors text-left"
                            >
                              {client.name}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-900">{formatDate(client.last_contact_date)}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {client.phone && <div>{client.phone}</div>}
                            {client.email && <div className="text-xs">{client.email}</div>}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1">
                            {client.tags.length > 0 ? (
                              client.tags.slice(0, 2).map((tag, idx) => (
                                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">No tags</span>
                            )}
                            {client.tags.length > 2 && (
                              <span className="text-xs text-gray-500">+{client.tags.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClient(client.id);
                              setShowModal(true);
                            }}
                            className="bg-accent hover:bg-accent-dark text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                          >
                            Start Session
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl shadow-large p-6 w-full max-w-2xl mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-text-primary">Create New Session</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-text-secondary hover:text-text-primary transition-colors p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Session Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessionTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => createSession(type.id)}
                    className="p-6 border-2 border-border rounded-xl hover:border-accent hover:bg-gray-50 transition-all group text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-accent-background rounded-lg group-hover:bg-accent group-hover:text-white transition-all">
                        <IconComponent className="w-6 h-6 text-accent group-hover:text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-primary mb-1">{type.title}</h3>
                        <p className="text-sm text-text-secondary">{type.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 text-text-secondary hover:text-text-primary text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;