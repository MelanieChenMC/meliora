import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { Home, Settings, FileText } from 'lucide-react';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: FileText, label: 'Sessions', path: '/sessions' },
    // { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-64 bg-background flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="p-6 flex-shrink-0">
        <img 
          src="/Elora-logo-H 3.png" 
          alt="Elora" 
          className="h-10 w-auto mb-2"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Main Navigation */}
        <div>
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.path}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded-md text-left transition-colors ${
                      isActive(item.path)
                        ? 'bg-gray-200 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="text-base font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

      </nav>

      {/* User Profile */}
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <UserButton afterSignOutUrl="/" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              Welcome back!
            </p>
            <p className="text-sm text-gray-500">
              Ready to assist
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 