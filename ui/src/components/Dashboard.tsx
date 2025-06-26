import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Users, Phone, Video, Plus } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  const createSession = (scenarioType: string) => {
    // Navigate to session setup page instead of creating immediately
    navigate(`/session/new/${scenarioType}`);
  };

  const scenarioCards = [
    {
      id: 'in_person',
      title: 'In-Person Meeting',
      description: 'Record and analyze face-to-face client meetings',
      icon: Users,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      id: 'call_center',
      title: 'Call Center Support',
      description: 'AI assistance for 800 number coordination calls',
      icon: Phone,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      id: 'conference',
      title: 'Conference Call',
      description: 'Join and analyze multi-party conference calls',
      icon: Video,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
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

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome, {getFirstName()}!
        </h1>
        <p className="text-gray-600">Choose a session type to get started with AI-powered assistance.</p>
      </div>

      {/* Quick Start Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scenarioCards.map((scenario) => {
          const IconComponent = scenario.icon;
          return (
            <div
              key={scenario.id}
              onClick={() => createSession(scenario.id)}
              className="bg-white rounded-xl border border-gray-200 p-6 cursor-pointer hover:shadow-lg hover:border-gray-300 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${scenario.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <Plus className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{scenario.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{scenario.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard; 