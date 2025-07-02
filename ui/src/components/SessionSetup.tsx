import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { ArrowLeft, Shield, Square, CheckSquare } from 'lucide-react';

interface SessionSetupProps {}

const SessionSetup: React.FC<SessionSetupProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { scenarioType } = useParams<{ scenarioType: string }>();
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasReadConsent, setHasReadConsent] = useState(false);
  const clientId = location.state?.clientId;

  const handleJoinSession = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      
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
          client_id: clientId || null,
          metadata: {
            title: `${scenarioType?.replace('_', ' ')} Session - ${new Date().toLocaleDateString()}`
          }
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const data = await response.json();
      if (data.session) {
        navigate(`/session/${data.session.id}/audio`);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert(`Failed to create session: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-border max-w-2xl w-full p-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mb-8 flex items-center text-text-secondary hover:text-text-primary transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        {/* Consent Section */}
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Please read this to your client:</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-text-primary leading-relaxed mb-4">
                I'm using an app to help me write down what we talk about. The app listens and creates a written version of our conversation so I can focus on you and your needs.
              </p>
              
              <p className="text-text-primary leading-relaxed mb-4">
                The app is HIPAA compliant, which means your information is private, protected, and only accessible to people directly involved in your care.
              </p>
              
              <p className="text-text-primary leading-relaxed mb-4">
                The app will transcribe our conversation. These notes are securely stored and encrypted. You can ask me to stop using the app at any time, and it won't affect the service or care you receive.
              </p>
              
              <p className="text-text-primary leading-relaxed font-medium">
                Do I have your permission to use this app during our conversation today?
              </p>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="mb-8">
            <button
              onClick={() => setHasReadConsent(!hasReadConsent)}
              className="flex items-start space-x-3 w-full text-left"
            >
              {hasReadConsent ? (
                <CheckSquare className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              ) : (
                <Square className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              )}
              <span className="text-sm text-text-primary">
                I have read the consent script to the client and received verbal consent to use Elora today ({new Date().toLocaleDateString()})
              </span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-2 px-4 rounded-md font-medium text-sm text-text-primary bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              I do not consent
            </button>
            
            <button
              onClick={handleJoinSession}
              disabled={isLoading || !hasReadConsent}
              className={`flex-1 py-2 px-4 rounded-md font-medium text-sm text-white transition-colors ${
                isLoading || !hasReadConsent
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-accent hover:bg-accent-dark'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Creating Session...
                </div>
              ) : (
                'I consent to AI scribe use'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionSetup;