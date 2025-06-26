import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import Dashboard from './components/Dashboard';
import Sessions from './components/Sessions';
import SessionView from './components/SessionView';
import SessionSetup from './components/SessionSetup';
// import SessionRoom from './components/SessionRoom';
import AudioSessionRoom from './components/AudioSessionRoom';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
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
                  <div className="flex-1 flex flex-col min-w-0">
                    <main className="flex-1 overflow-y-auto p-8">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/sessions" element={<Sessions />} />
                        <Route path="/session/:sessionId" element={<SessionView />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              } 
            />
          </Routes>
        </SignedIn>
        
        <SignedOut>
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="max-w-md w-full text-center p-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Social Worker AI
                </h1>
                <p className="text-gray-600">
                  Enhance your practice with AI-powered assistance
                </p>
              </div>
              
              <SignInButton mode="modal">
                <button className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors">
                  Sign In
                </button>
              </SignInButton>
              
              <p className="text-sm text-gray-500 mt-6">
                Real-time transcription • AI suggestions • Session management
              </p>
            </div>
          </div>
        </SignedOut>
      </div>
    </Router>
  );
}

export default App; 