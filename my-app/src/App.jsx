import { useState } from 'react';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import WorkspacePage from './pages/WorkspacePage';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [authMode, setAuthMode] = useState('login');

  // Authentication states
  const [token, setToken] = useState(() => localStorage.getItem('speakflow_token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('speakflow_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleNavigateToAuth = (mode) => {
    setAuthMode(mode);
    setCurrentPage('auth');
  };

  const [workspaceView, setWorkspaceView] = useState('dashboard');

  const handleNavigateToWorkspace = (view = 'dashboard') => {
    setWorkspaceView(view);
    if (token) {
      setCurrentPage('workspace');
    } else {
      setAuthMode('login');
      setCurrentPage('auth');
    }
  };

  const handleBackToHome = () => {
    setCurrentPage('landing');
  };

  const handleAuthSuccess = (newToken, newUser) => {
    localStorage.setItem('speakflow_token', newToken);
    localStorage.setItem('speakflow_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setCurrentPage('workspace');
  };

  const handleLogout = () => {
    localStorage.removeItem('speakflow_token');
    localStorage.removeItem('speakflow_user');
    setToken('');
    setUser(null);
    setCurrentPage('landing');
  };

  return (
    <>
      {currentPage === 'landing' && (
        <LandingPage 
          onNavigateToAuth={handleNavigateToAuth} 
          onNavigateToWorkspace={handleNavigateToWorkspace} 
          user={user}
          onLogout={handleLogout}
        />
      )}
      {currentPage === 'auth' && (
        <AuthPage 
          initialMode={authMode} 
          onBackToHome={handleBackToHome} 
          onAuthSuccess={handleAuthSuccess}
        />
      )}
      {currentPage === 'workspace' && (
        <WorkspacePage 
          user={user}
          token={token}
          initialView={workspaceView}
          onLogout={handleLogout}
          onBackToHome={handleBackToHome} 
        />
      )}
    </>
  );
}

export default App;

