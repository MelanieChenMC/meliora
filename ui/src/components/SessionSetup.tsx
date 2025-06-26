import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { ArrowLeft, Mic, Shield, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';

interface SessionSetupProps {}

const SessionSetup: React.FC<SessionSetupProps> = () => {
  const navigate = useNavigate();
  const { scenarioType } = useParams<{ scenarioType: string }>();
  const { getToken, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const scenarioConfig = {
    in_person: {
      title: 'In-Person Meeting',
      description: 'AI-assisted face-to-face client session',
      icon: Users,
      duration: '30-90 minutes',
      features: ['Live transcription', 'AI suggestions', 'Session summary']
    },
    call_center: {
      title: 'Call Center Support',
      description: 'AI assistance for coordination calls',
      icon: Mic,
      duration: '15-45 minutes',
      features: ['Call transcription', 'Resource suggestions', 'Follow-up items']
    },
    conference: {
      title: 'Conference Call',
      description: 'Multi-party meeting with AI support',
      icon: Users,
      duration: '30-120 minutes',
      features: ['Multi-speaker detection', 'Meeting summary', 'Action items']
    }
  };

  const config = scenarioConfig[scenarioType as keyof typeof scenarioConfig];
  const IconComponent = config?.icon || Users;

  const checkAuthStatus = async () => {
    try {
      const token = await getToken();
      setDebugInfo({
        isSignedIn,
        userId,
        userEmail: user?.emailAddresses?.[0]?.emailAddress,
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : null
      });
    } catch (error) {
      setDebugInfo({
        isSignedIn,
        userId,
        userEmail: user?.emailAddresses?.[0]?.emailAddress,
        hasToken: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const handleJoinSession = async () => {
    if (!sessionTitle.trim()) {
      alert('Please enter a session title');
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      console.log('Auth Debug:', { isSignedIn, userId, hasToken: !!token });
      
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          scenario_type: scenarioType,
          metadata: {
            title: sessionTitle,
            expected_duration: config?.duration
          }
        }),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const data = await response.json();
      if (data.session) {
        // Navigate to appropriate session room based on scenario type
        if (scenarioType === 'in_person') {
          navigate(`/session/${data.session.id}/audio`);
        } else {
          navigate(`/session/${data.session.id}/room`);
        }
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert(`Failed to create session: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Session Type</h2>
          <button 
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel - Session Info */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16">
        <div className="max-w-md">
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="mb-8 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>

          {/* Session Type */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                <IconComponent className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
                <p className="text-gray-600">{config.description}</p>
              </div>
            </div>
          </div>

          {/* Session Details */}
          <div className="mb-8 space-y-4">
            <div className="flex items-center text-gray-600">
              <Clock className="w-5 h-5 mr-3" />
              <span>Expected duration: {config.duration}</span>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium text-gray-900">This session includes:</p>
              {config.features.map((feature, index) => (
                <div key={index} className="flex items-center text-gray-600">
                  <CheckCircle className="w-4 h-4 mr-3 text-green-600" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Auth Debug Panel */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center mb-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              <h3 className="font-medium text-yellow-800">Authentication Debug</h3>
              <button
                onClick={checkAuthStatus}
                className="ml-auto text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200"
              >
                Check Status
              </button>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Signed In:</span>
                <span className={`font-medium ${isSignedIn ? 'text-green-600' : 'text-red-600'}`}>
                  {isSignedIn ? '✓ Yes' : '✗ No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">User ID:</span>
                <span className="font-mono text-xs">
                  {userId ? `${userId.substring(0, 16)}...` : 'Not available'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="text-xs">
                  {user?.emailAddresses?.[0]?.emailAddress || 'Not available'}
                </span>
              </div>
              
              {debugInfo && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <div className="text-xs font-mono">
                    <div>Has Token: {debugInfo.hasToken ? '✓' : '✗'}</div>
                    {debugInfo.tokenPreview && (
                      <div>Token: {debugInfo.tokenPreview}</div>
                    )}
                    {debugInfo.error && (
                      <div className="text-red-600">Error: {debugInfo.error}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Session Title Input */}
          <div className="mb-8">
            <label htmlFor="sessionTitle" className="block text-sm font-medium text-gray-700 mb-2">
              Session Title
            </label>
            <input
              type="text"
              id="sessionTitle"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="e.g., Housing Assessment with Client"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Consent & Privacy */}
      <div className="flex-1 bg-white flex flex-col justify-center px-8 lg:px-16">
        <div className="max-w-md">
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Shield className="w-8 h-8 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Recording Consent</h2>
            </div>
            <p className="text-gray-600">
              This session will use AI to enhance your practice while maintaining privacy and security.
            </p>
          </div>

          {/* What We Do */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">✅ This session will:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Record audio for real-time transcription</li>
              <li>• Analyze conversation for helpful suggestions</li>
              <li>• Store transcription securely in your account</li>
              <li>• Generate session summary and action items</li>
            </ul>
          </div>

          {/* What We Don't Do */}
          <div className="mb-8">
            <h3 className="font-medium text-gray-900 mb-3">❌ We will NOT:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Share audio with third parties</li>
              <li>• Store raw audio files permanently</li>
              <li>• Use your data for AI training</li>
              <li>• Access recordings outside your organization</li>
            </ul>
          </div>

          {/* Privacy Notice */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Privacy Notice:</strong> All recordings are processed securely and comply with healthcare privacy standards. 
              You can end recording at any time during the session.
            </p>
          </div>

          {/* Join Button */}
          <button
            onClick={handleJoinSession}
            disabled={isLoading || !sessionTitle.trim()}
            className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-colors ${
              isLoading || !sessionTitle.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Creating Session...
              </div>
            ) : (
              'Join Session & Start Recording'
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            By clicking "Join Session", you consent to recording and AI analysis.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionSetup; 