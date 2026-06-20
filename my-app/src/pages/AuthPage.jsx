import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function AuthPage({ initialMode = 'login', onBackToHome, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sync mode if the initialMode prop changes while mounted
  useEffect(() => {
    setIsSignUp(initialMode === 'signup');
  }, [initialMode]);

  // Reset form inputs and errors when toggling between sign-up and sign-in
  useEffect(() => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
  }, [isSignUp]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const url = isSignUp 
      ? `${API_BASE}/api/auth/signup` 
      : `${API_BASE}/api/auth/login`;
      
    const payload = isSignUp 
      ? { name, email, password } 
      : { email, password };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed. Please check your credentials.');
      }

      if (onAuthSuccess) {
        onAuthSuccess(data.token, data.user);
      }
    } catch (err) {
      console.error('Authentication request failed:', err);
      setError(err.message || 'Failed to connect to backend server. Ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      {/* Back button */}
      <button onClick={onBackToHome} className="auth-back-btn" disabled={isLoading}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Home
      </button>

      {/* Main Container Card */}
      <div className={`auth-container ${isSignUp ? 'right-panel-active' : ''}`} id="auth-card">
        
        {/* Sign Up Form Container */}
        <div className="form-container sign-up-container">
          <form className="auth-form" onSubmit={handleSubmit}>
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-subtitle">Elevate your speech practice today</p>
            
            {error && <div className="api-key-error-text" style={{ marginBottom: '12px', fontSize: '13px' }}>{error}</div>}

            <div className="auth-input-group">
              <input 
                type="text" 
                placeholder="Full Name" 
                required 
                className="auth-input" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="auth-input-group">
              <input 
                type="email" 
                placeholder="Email Address" 
                required 
                className="auth-input" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="auth-input-group">
              <input 
                type="password" 
                placeholder="Password" 
                required 
                className="auth-input" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Sign Up'}
            </button>

            {/* Mobile-only toggle fallback */}
            <button 
              type="button" 
              className="auth-mobile-toggle" 
              onClick={() => setIsSignUp(false)}
              disabled={isLoading}
            >
              Already have an account? Sign In
            </button>
          </form>
        </div>

        {/* Sign In Form Container */}
        <div className="form-container sign-in-container">
          <form className="auth-form" onSubmit={handleSubmit}>
            <h2 className="auth-title">Welcome Back</h2>
            <p className="auth-subtitle">Analyze your recordings and monitor your growth</p>
            
            {error && <div className="api-key-error-text" style={{ marginBottom: '12px', fontSize: '13px' }}>{error}</div>}

            <div className="auth-input-group">
              <input 
                type="email" 
                placeholder="Email Address" 
                required 
                className="auth-input" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="auth-input-group">
              <input 
                type="password" 
                placeholder="Password" 
                required 
                className="auth-input" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <a href="#forgot" className="auth-link">Forgot password?</a>

            {/* Mobile-only toggle fallback */}
            <button 
              type="button" 
              className="auth-mobile-toggle" 
              onClick={() => setIsSignUp(true)}
              disabled={isLoading}
            >
              Don't have an account yet? Sign Up
            </button>
          </form>
        </div>

        {/* Sliding Overlay Container */}
        <div className="overlay-container">
          <div className="overlay">
            
            {/* Left side panel (visible in Sign Up state) */}
            <div className="overlay-panel overlay-left">
              <h2 className="overlay-title">Ready to improve?</h2>
              <p className="overlay-desc">
                Log in to keep track of your metrics, filler word counts, and confidence progress charts.
              </p>
              <button 
                type="button"
                className="btn-ghost" 
                id="signInBtn"
                onClick={() => setIsSignUp(false)}
                disabled={isLoading}
              >
                Sign In
              </button>
            </div>

            {/* Right side panel (visible in Sign In state) */}
            <div className="overlay-panel overlay-right">
              <h2 className="overlay-title">New to SpeakFlow?</h2>
              <p className="overlay-desc">
                Register a new account and begin recording and getting real-time insights on your speech patterns.
              </p>
              <button 
                type="button"
                className="btn-ghost" 
                id="signUpBtn"
                onClick={() => setIsSignUp(true)}
                disabled={isLoading}
              >
                Sign Up
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
