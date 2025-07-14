import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { BugProvider } from './context/BugContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import BugList from './components/BugList';

const AuthenticatedApp = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const { user, logout } = useAuth();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'bugs':
        return <BugList />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <BugProvider>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="logo">
              <h1>🐛 Bug Tracker</h1>
            </div>
            
            <nav className="nav">
              <button
                className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentView('dashboard')}
              >
                Dashboard
              </button>
              <button
                className={`nav-link ${currentView === 'bugs' ? 'active' : ''}`}
                onClick={() => setCurrentView('bugs')}
              >
                Bugs
              </button>
            </nav>

            <div className="user-menu">
              <div className="user-info">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">{user?.role}</span>
              </div>
              <button
                onClick={logout}
                className="btn btn-outline btn-small"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="app-main">
          <div className="main-content">
            {renderView()}
          </div>
        </main>

        <footer className="app-footer">
          <div className="footer-content">
            <p>&copy; 2024 Bug Tracker. Built for Week 6 Testing & Debugging Assignment.</p>
            <div className="footer-links">
              <span>Version 1.0.0</span>
              {process.env.NODE_ENV === 'development' && (
                <span className="dev-mode">Development Mode</span>
              )}
            </div>
          </div>
        </footer>
      </div>
    </BugProvider>
  );
};

const UnauthenticatedApp = () => {
  const [isLogin, setIsLogin] = useState(true);

  const handleAuthSuccess = () => {
    // The app will automatically re-render when auth state changes
    console.log('Authentication successful');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🐛 Bug Tracker</h1>
          <p>Professional Bug Tracking System</p>
        </div>

        <div className="auth-form">
          {isLogin ? (
            <LoginForm
              onSuccess={handleAuthSuccess}
              switchToRegister={() => setIsLogin(false)}
            />
          ) : (
            <RegisterForm
              onSuccess={handleAuthSuccess}
              switchToLogin={() => setIsLogin(true)}
            />
          )}
        </div>

        <div className="auth-footer">
          <p>
            Week 6 Assignment: Testing and Debugging in MERN Stack Applications
          </p>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>🐛 Bug Tracker</h2>
          <p>Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {isAuthenticated ? <AuthenticatedApp /> : <UnauthenticatedApp />}
    </ErrorBoundary>
  );
};

export default App;
