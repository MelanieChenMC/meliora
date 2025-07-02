import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, UserButton } from '@clerk/clerk-react';
import Dashboard from './components/Dashboard';
import Sessions from './components/Sessions';
import SessionView from './components/SessionView';
import SessionSetup from './components/SessionSetup';
// import SessionRoom from './components/SessionRoom';
import AudioSessionRoom from './components/AudioSessionRoom';
import ClientDetail from './components/ClientDetail';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <SignedIn>
          <Routes>
            {/* Full-screen routes without sidebar */}
            <Route path="/session/new/:scenarioType" element={<SessionSetup />} />
            {/* <Route path="/session/:sessionId/room" element={<SessionRoom />} /> */}
            <Route path="/session/:sessionId/audio" element={<AudioSessionRoom />} />
            
            {/* Dashboard routes with sidebar */}
            <Route 
              path="/*" 
              element={
                <div className="flex h-screen">
                  <Sidebar />
                  <div className="flex-1 flex flex-col min-w-0 bg-background">
                    <main className="flex-1 overflow-y-auto p-8">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-full p-8">
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/sessions" element={<Sessions />} />
                          <Route path="/session/:sessionId" element={<SessionView />} />
                          <Route path="/client/:clientId" element={<ClientDetail />} />
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </div>
                    </main>
                  </div>
                </div>
              } 
            />
          </Routes>
        </SignedIn>
        
        <SignedOut>
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center">
              <div className="mb-8 text-center">
                <img 
                  src="/Elora-logo-H 3.png" 
                  alt="Elora" 
                  className="h-16 w-auto mx-auto mb-6"
                />
                <p className="text-gray-600 mb-2">
                  AI-powered assistance for social workers
                </p>
                <p className="text-sm text-gray-500">
                  Real-time transcription • AI suggestions • Session management
                </p>
              </div>
              
              <SignIn 
                appearance={{
                  elements: {
                    rootBox: "mx-auto",
                    card: "shadow-soft border border-border rounded-2xl",
                    formButtonPrimary: "bg-accent hover:bg-accent-dark text-white transition-colors",
                    formButtonPrimary__loading: "bg-accent",
                    footerActionLink: "text-accent hover:text-accent-dark"
                  },
                  variables: {
                    colorPrimary: "#7A4988"
                  }
                }}
                redirectUrl="/"
                signUpUrl="/sign-up"
              />
            </div>
          </div>
        </SignedOut>
      </div>
    </Router>
  );
}

export default App; 