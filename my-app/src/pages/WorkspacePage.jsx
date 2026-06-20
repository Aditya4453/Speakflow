import { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const BASIC_TOPICS = [
  "The impact of social media on mental health",
  "How remote work is shaping the future of offices",
  "The importance of physical exercise for longevity",
  "Should artificial intelligence be regulated?",
  "My favorite travel experience and what I learned",
  "The role of climate change in global weather patterns",
  "How to manage stress in a fast-paced world",
  "The benefits of learning a second language",
  "Why coding should be taught in primary schools",
  "A memorable book or movie that changed my perspective"
];

export default function WorkspacePage({ user, token, onLogout, onBackToHome, initialView = 'dashboard' }) {
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('speakflow_gemini_api_key') || '';
  });
  const [activeView, setActiveView] = useState(initialView);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  const [topicMode, setTopicMode] = useState('free'); // 'free' or 'topic'
  const [currentTopic, setCurrentTopic] = useState('');
  const [inputKey, setInputKey] = useState('');
  
  // Validation and UI states
  const [isKeyValid, setIsKeyValid] = useState(null); // null = validating, true = working, false = invalid
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isBackendKeyConfigured, setIsBackendKeyConfigured] = useState(false);

  // Recording and analysis states
  const [isRecording, setIsRecording] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [recordings, setRecordings] = useState([]);
  const [activeRecordingId, setActiveRecordingId] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Refs to manage media streams and timers
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIdRef = useRef(null);
  const streamRef = useRef(null);
  const recordingStartTimeRef = useRef(null);

  const validateApiKey = async (key) => {
    if (!key) return false;
    if (key === 'mock-gemini-key' || key === 'backend-key') return true;
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
      );
      if (!response.ok) return false;
      const data = await response.json();
      if (!data.models || !Array.isArray(data.models)) return false;
      
      // Check if a flash model is supported and available
      const hasFlashModel = data.models.some(model => 
        model.name && model.name.toLowerCase().includes('flash')
      );
      return hasFlashModel;
    } catch (err) {
      console.error('Gemini Key validation request failed', err);
      return false;
    }
  };

  // Check backend health for config status & load recordings history on mount
  useEffect(() => {
    // 1. Check if backend has Gemini API key pre-configured
    fetch(`${API_BASE}/api/health`)
      .then(res => res.json())
      .then(data => {
        if (data.gemini_configured) {
          setIsBackendKeyConfigured(true);
          // Set a default string so the key input view doesn't block the user
          if (!apiKey) {
            setApiKey('backend-key');
            setIsKeyValid(true);
          }
        }
      })
      .catch(err => console.error('Error fetching backend configuration status:', err));

    // 2. Fetch history of recordings from DB
    if (token) {
      fetch(`${API_BASE}/api/recordings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          if (!res.ok) throw new Error('Could not retrieve recordings from DB');
          return res.json();
        })
        .then(data => {
          setRecordings(data);
          if (data.length > 0) {
            setActiveRecordingId(data[0].id);
          }
        })
        .catch(err => console.error('Error loading recordings history from DB:', err));
    }
  }, [token]);

  // Run validation on mount / when key changes
  useEffect(() => {
    if (apiKey) {
      if (apiKey === 'backend-key') {
        setIsKeyValid(true);
        return;
      }
      setIsKeyValid(null);
      validateApiKey(apiKey).then((isValid) => {
        setIsKeyValid(isValid);
      });
    } else {
      setIsKeyValid(false);
    }
  }, [apiKey]);

  // Clean up timer and streams on unmount
  useEffect(() => {
    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSaveKey = async (e) => {
    e.preventDefault();
    setValidationError('');
    setIsValidating(true);

    const keyToTest = inputKey.trim();
    if (!keyToTest) {
      setValidationError('Please enter a key.');
      setIsValidating(false);
      return;
    }

    const isValid = await validateApiKey(keyToTest);
    setIsValidating(false);

    if (isValid) {
      localStorage.setItem('speakflow_gemini_api_key', keyToTest);
      setApiKey(keyToTest);
      setIsKeyValid(true);
    } else {
      setValidationError('Invalid Gemini API Key. Please verify your credentials.');
      setIsKeyValid(false);
    }
  };

  const handleResetKey = () => {
    localStorage.removeItem('speakflow_gemini_api_key');
    setApiKey(isBackendKeyConfigured ? 'backend-key' : '');
    setInputKey('');
    setIsKeyValid(isBackendKeyConfigured ? true : false);
    setValidationError('');
    setActiveRecordingId(null);
  };

  const handleGenerateTopic = () => {
    const randomIndex = Math.floor(Math.random() * BASIC_TOPICS.length);
    setCurrentTopic(BASIC_TOPICS[randomIndex]);
  };

  const startRecording = async () => {
    if (!isKeyValid) return; // Prevent recording if key is invalid
    if (topicMode === 'topic' && !currentTopic) {
      alert('Please generate a topic first, or switch to Speak Freely mode.');
      return;
    }

    audioChunksRef.current = [];
    setSecondsLeft(60);
    
    try {
      // Request audio capture stream from browser microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Build recording audio details
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Calculate duration of the recording
        const durationSec = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
        
        // Release the microphone stream tracks immediately
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Post audio file to Python backend for Gemini evaluation
        setIsAnalyzing(true);
        try {
          const formData = new FormData();
          // We label the file as speech.webm so the server parses it correctly
          formData.append('file', audioBlob, 'speech.webm');
          formData.append('topic', topicMode === 'topic' ? currentTopic : '');

          const backendResponse = await fetch(`${API_BASE}/api/analyze`, {
            method: 'POST',
            headers: {
              'X-Gemini-API-Key': apiKey,
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (!backendResponse.ok) {
            const errorDetails = await backendResponse.text();
            throw new Error(errorDetails || 'Failed to communicate with Python backend.');
          }

          const parsedData = await backendResponse.json();
          
          // Map to standard recording representation
          const newRecord = {
            id: parsedData.id,
            url: parsedData.url,
            name: parsedData.name,
            topic: parsedData.topic,
            timestamp: parsedData.timestamp,
            duration: parsedData.duration,
            analysis: parsedData.analysis
          };

          setRecordings(prev => [newRecord, ...prev]);
          setActiveRecordingId(newRecord.id);

        } catch (apiErr) {
          console.error('Gemini speech analysis failed', apiErr);
          alert(`Analysis Error: ${apiErr.message || 'The backend could not analyze the audio.'}`);
        } finally {
          setIsAnalyzing(false);
        }
      };

      // Start recording
      mediaRecorder.start();
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);

      // Start countdown timer
      timerIdRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Microphone capture failed', err);
      alert('Could not access microphone. Please check permissions and try again.');
    }
  };

  const stopRecording = () => {
    // Clear timer
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleDeleteRecording = async (id, url) => {
    try {
      const response = await fetch(`${API_BASE}/api/recordings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to delete recording from the server.');
      }
      
      setRecordings(prev => prev.filter(rec => rec.id !== id));
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      if (activeRecordingId === id) {
        setActiveRecordingId(null);
      }
    } catch (err) {
      console.error('Error deleting recording:', err);
      alert(err.message || 'Could not delete recording.');
    }
  };

  const formatTimer = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const renderApiKeyStatus = () => {
    if (apiKey === 'backend-key') {
      return (
        <span className="api-key-status success" style={{ cursor: 'default' }}>
          Gemini Coach: Active
        </span>
      );
    }
    if (apiKey === 'mock-gemini-key') {
      return (
        <button onClick={handleResetKey} className="api-key-status success">
          Gemini: Mock Mode
        </button>
      );
    }
    if (isKeyValid === null) {
      return (
        <span className="api-key-status loading">
          Gemini Key: Validating...
        </span>
      );
    }
    if (isKeyValid === true) {
      return (
        <button onClick={handleResetKey} className="api-key-status success">
          Gemini Key: Active
        </button>
      );
    }
    return (
      <button onClick={handleResetKey} className="api-key-status error">
        Gemini Key: Invalid (Reset)
      </button>
    );
  };

  // Find currently active recording details
  const activeRecord = recordings.find(r => r.id === activeRecordingId);
  const activeAnalysis = activeRecord ? activeRecord.analysis : null;

  return (
    <div className="workspace-page-wrapper">
      {/* Header Bar */}
      <header className="workspace-header">
        <div className="container workspace-header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onBackToHome} className="btn-icon-back" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Home
          </button>
          
          <div className="workspace-logo-center" style={{ display: 'flex', gap: '8px' }}>
            {apiKey ? (
              <>
                <button 
                  type="button" 
                  onClick={() => setActiveView('dashboard')}
                  className={`tab-btn ${activeView === 'dashboard' ? 'active' : ''}`}
                  style={{
                    background: activeView === 'dashboard' ? 'rgba(124, 93, 250, 0.1)' : 'transparent',
                    border: '1px solid',
                    borderColor: activeView === 'dashboard' ? 'var(--primary)' : 'transparent',
                    color: activeView === 'dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Dashboard
                </button>
                <button 
                  type="button" 
                  onClick={() => setActiveView('profile')}
                  className={`tab-btn ${activeView === 'profile' ? 'active' : ''}`}
                  style={{
                    background: activeView === 'profile' ? 'rgba(124, 93, 250, 0.1)' : 'transparent',
                    border: '1px solid',
                    borderColor: activeView === 'profile' ? 'var(--primary)' : 'transparent',
                    color: activeView === 'profile' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Profile & Analytics
                </button>
              </>
            ) : (
              <span>SpeakFlow Workspace</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {user && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
                {user.name}
              </span>
            )}
            {apiKey && renderApiKeyStatus()}
            {onLogout && (
              <button 
                onClick={onLogout} 
                className="btn-ghost" 
                style={{ 
                  fontSize: '13px', 
                  padding: '6px 12px', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  color: 'var(--text-primary)'
                }}
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="workspace-content" style={{ display: 'block' }}>
        
        {!apiKey ? (
          /* Step 1: Input API Key */
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div className="api-key-card">
              <div className="api-key-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h2 className="api-key-title">Enter Gemini API Key</h2>
              <p className="api-key-desc">
                Please enter your Gemini API Key to activate advanced analysis features. 
                The key is stored locally in your browser.
              </p>
              
              <div className="api-key-instructions">
                <strong>How to get a free API Key:</strong>
                <ol>
                  <li>Go to the <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">Google AI Studio console</a>.</li>
                  <li>Sign in with your Google account.</li>
                  <li>Click on the <strong>"Get API key"</strong> button in the left sidebar.</li>
                  <li>Click <strong>"Create API key"</strong>, copy it, and paste it below.</li>
                </ol>
              </div>

              <form onSubmit={handleSaveKey} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input 
                  type="password" 
                  placeholder="AIzaSy..." 
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  required 
                  disabled={isValidating}
                  className="auth-input" 
                  style={{ textAlign: 'center' }}
                />
                {validationError && (
                  <div className="api-key-error-text">
                    {validationError}
                  </div>
                )}
                <button 
                  type="submit" 
                  disabled={isValidating}
                  className="btn-primary" 
                  style={{ width: '100%' }}
                >
                  {isValidating ? 'Validating Key...' : 'Enter Workspace'}
                </button>
              </form>
            </div>
          </div>
        ) : activeView === 'profile' ? (
          /* Step 3: Profile Analytics View */
          <div className="profile-view-container" style={{ padding: '24px 0', color: 'var(--text-primary)' }}>
            <div className="profile-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '32px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #a78bfa, #7c5dfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', color: '#fff', boxShadow: '0 8px 16px rgba(124,93,250,0.3)' }}>
                  {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                </div>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0' }}>{user?.name || 'User Profile'}</h2>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Aggregated Analytics Stats Grid */}
            <div className="dashboard-metrics-grid" style={{ marginBottom: '40px', gap: '20px' }}>
              <div className="metric-card" style={{ padding: '20px 24px' }}>
                <div className="metric-card-label" style={{ fontSize: '13px', marginBottom: '8px' }}>Total Sessions</div>
                <div className="metric-card-value" style={{ fontSize: '36px' }}>{recordings.length}</div>
              </div>
              <div className="metric-card" style={{ padding: '20px 24px' }}>
                <div className="metric-card-label" style={{ fontSize: '13px', marginBottom: '8px' }}>Average Overall Score</div>
                <div className="metric-card-value" style={{ fontSize: '36px', color: 'var(--primary)' }}>
                  {recordings.length > 0 
                    ? (recordings.reduce((sum, r) => sum + (r.analysis?.overall_score || 0), 0) / recordings.length).toFixed(1)
                    : 'N/A'}
                  <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '4px' }}>/10</span>
                </div>
              </div>
              <div className="metric-card" style={{ padding: '20px 24px' }}>
                <div className="metric-card-label" style={{ fontSize: '13px', marginBottom: '8px' }}>Highest Overall Score</div>
                <div className="metric-card-value" style={{ fontSize: '36px', color: '#10b981' }}>
                  {recordings.length > 0 
                    ? Math.max(...recordings.map(r => r.analysis?.overall_score || 0))
                    : 'N/A'}
                  <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '4px' }}>/10</span>
                </div>
              </div>
            </div>

            {/* Session wise report table */}
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>Session-Wise Reports</h3>
            {recordings.length === 0 ? (
              <div className="empty-state-text" style={{ padding: '40px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px' }}>
                No session reports available. Complete a recording to see your analysis history!
              </div>
            ) : (
              <div style={{ overflowX: 'auto', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
                      <th style={{ padding: '16px 20px' }}>Date & Name</th>
                      <th style={{ padding: '16px 20px' }}>Target Topic</th>
                      <th style={{ padding: '16px 20px', textAlign: 'center' }}>Score</th>
                      <th style={{ padding: '16px 20px' }}>Primary Strength</th>
                      <th style={{ padding: '16px 20px' }}>Area to Improve</th>
                      <th style={{ padding: '16px 20px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recordings.map((rec) => {
                      const analysis = rec.analysis || {};
                      return (
                        <tr key={rec.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '13.5px', transition: 'background 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{rec.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rec.timestamp}</div>
                          </td>
                          <td style={{ padding: '16px 20px', color: rec.topic && rec.topic !== 'General Speech' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                            {rec.topic || 'General Speech'}
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', background: 'rgba(124,93,250,0.1)', color: 'var(--primary)', fontWeight: 700, fontSize: '12.5px' }}>
                              {analysis.overall_score || 0}/10
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={analysis.top_strength || 'N/A'}>
                            {analysis.top_strength || 'N/A'}
                          </td>
                          <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={analysis.top_weakness || 'N/A'}>
                            {analysis.top_weakness || 'N/A'}
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                            <button
                              onClick={() => {
                                setActiveRecordingId(rec.id);
                                setActiveView('dashboard');
                              }}
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                              onMouseOver={(e) => e.target.style.background = 'var(--primary)'}
                              onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Two-Column Workspace Layout */
          <div className="workspace-two-col">
            
            {/* Left side: Recorder controls & Recordings List */}
            <div className="workspace-side-col">
              <div className="recorder-card">
                <div className="recorder-header">
                  <h2>Record Session</h2>
                  <p>Speak naturally, AI will analyze delivery metrics</p>
                </div>

                {/* Topic Mode Selector & Generator */}
                <div style={{ padding: '0 16px', marginBottom: '16px' }}>
                  <div className="topic-mode-selector" style={{ display: 'flex', gap: '8px', marginBottom: '12px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <button 
                      type="button" 
                      onClick={() => !isRecording && !isAnalyzing && setTopicMode('free')} 
                      style={{ 
                        flex: 1, 
                        padding: '8px 12px', 
                        border: 'none', 
                        borderRadius: '6px', 
                        background: topicMode === 'free' ? 'var(--primary)' : 'transparent', 
                        color: 'var(--text-primary)', 
                        cursor: isRecording || isAnalyzing ? 'not-allowed' : 'pointer', 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        opacity: isRecording || isAnalyzing ? 0.5 : 1,
                        transition: 'all 0.2s ease' 
                      }}
                    >
                      Speak Freely
                    </button>
                    <button 
                      type="button" 
                      onClick={() => !isRecording && !isAnalyzing && setTopicMode('topic')} 
                      style={{ 
                        flex: 1, 
                        padding: '8px 12px', 
                        border: 'none', 
                        borderRadius: '6px', 
                        background: topicMode === 'topic' ? 'var(--primary)' : 'transparent', 
                        color: 'var(--text-primary)', 
                        cursor: isRecording || isAnalyzing ? 'not-allowed' : 'pointer', 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        opacity: isRecording || isAnalyzing ? 0.5 : 1,
                        transition: 'all 0.2s ease' 
                      }}
                    >
                      Guided Topic
                    </button>
                  </div>

                  {topicMode === 'topic' && (
                    <div className="topic-generator-box" style={{ padding: '12px', borderRadius: '8px', background: 'rgba(124, 93, 250, 0.05)', border: '1px solid rgba(124, 93, 250, 0.2)', textAlign: 'center', transition: 'all 0.3s ease' }}>
                      {currentTopic ? (
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, lineHeight: '1.4', marginBottom: '10px' }}>
                          "{currentTopic}"
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontStyle: 'italic' }}>
                          No topic generated yet. Click below to get a prompt.
                        </div>
                      )}
                      <button 
                        type="button" 
                        onClick={handleGenerateTopic} 
                        disabled={isRecording || isAnalyzing}
                        style={{ 
                          background: 'rgba(124, 93, 250, 0.15)', 
                          border: '1px solid var(--primary)', 
                          color: 'var(--text-primary)', 
                          padding: '6px 12px', 
                          borderRadius: '6px', 
                          cursor: isRecording || isAnalyzing ? 'not-allowed' : 'pointer', 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          transition: 'all 0.2s ease' 
                        }}
                      >
                        🎲 Generate Random Topic
                      </button>
                    </div>
                  )}
                </div>

                <div className="record-btn-container">
                  <button 
                    type="button" 
                    onClick={toggleRecording} 
                    disabled={!isKeyValid || isAnalyzing}
                    className={`record-btn ${isRecording ? 'recording' : ''}`}
                    style={{ opacity: (!isKeyValid || isAnalyzing) ? 0.6 : 1 }}
                    title={!isKeyValid ? 'Recording Disabled (Invalid API Key)' : isRecording ? 'Stop Recording' : 'Start Recording'}
                  >
                    {isRecording ? (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                      </svg>
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" x2="12" y1="19" y2="22"/>
                      </svg>
                    )}
                  </button>
                  {isRecording && <div className="record-btn-ring"></div>}
                </div>

                <div className={`timer-display ${isRecording ? 'recording' : ''}`}>
                  {formatTimer(secondsLeft)}
                </div>

                <div className="record-hint" style={{ fontSize: '12px' }}>
                  {!isKeyValid ? (
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>
                      Recording disabled. Please check your API Key.
                    </span>
                  ) : isAnalyzing ? (
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      Processing audio analysis...
                    </span>
                  ) : isRecording ? (
                    'Recording speech... Limit 60 seconds.'
                  ) : (
                    'Click to begin recording.'
                  )}
                </div>
              </div>

              {/* History list */}
              <h3 className="recordings-section-title">Recordings History</h3>
              <div className="recordings-list-wrapper">
                {recordings.length === 0 ? (
                  <div className="empty-state-text">
                    No recordings captured yet.
                  </div>
                ) : (
                  recordings.map((rec) => (
                    <div 
                      key={rec.id} 
                      className="audio-item-card" 
                      onClick={() => !isAnalyzing && setActiveRecordingId(rec.id)}
                      style={{ 
                        cursor: 'pointer',
                        borderColor: activeRecordingId === rec.id ? 'var(--primary)' : 'var(--card-border)',
                        background: activeRecordingId === rec.id ? 'rgba(124, 93, 250, 0.05)' : 'var(--card-bg)'
                      }}
                    >
                      <div className="audio-item-info">
                        <span className="audio-item-title">{rec.name}</span>
                        {rec.topic && rec.topic !== 'General Speech' && rec.topic !== 'Speak Freely' && (
                          <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, margin: '2px 0' }}>
                            🎯 {rec.topic}
                          </div>
                        )}
                        <span className="audio-item-meta">{rec.timestamp} • {rec.duration}</span>
                      </div>
                      
                      <div className="audio-item-player" onClick={(e) => e.stopPropagation()}>
                        <audio src={rec.url} controls />
                        <button 
                          type="button" 
                          onClick={() => handleDeleteRecording(rec.id, rec.url)} 
                          className="delete-btn"
                          title="Delete Recording"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right side: Detailed Analysis Dashboard */}
            <div className="analysis-dashboard-panel">
              {isAnalyzing ? (
                /* State A: Analyzing loading view */
                <div className="analysis-loading">
                  <div className="spinner"></div>
                  <p>Analyzing speech patterns with Gemini...</p>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Evaluating pace metrics, filler word frequency, clarity, and grammatical structure.
                  </span>
                </div>
              ) : activeAnalysis ? (
                /* State B: Renders active recording Gemini metrics */
                <div>
                  {/* Dashboard Header */}
                  <div className="dashboard-analysis-header">
                    <div className="dashboard-title-area">
                      <h2>{activeRecord.name} Analysis</h2>
                      <p style={{ margin: '4px 0 0 0' }}>
                        Completed on {activeRecord.timestamp} • duration: {activeRecord.duration}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>
                        Target Topic: {activeRecord.topic || 'General Speech'}
                      </p>
                    </div>
                    <div className="api-key-status success" style={{ cursor: 'default' }}>
                      Level: {activeAnalysis.speaker_level}
                    </div>
                  </div>

                  {/* Overall Score Circle & Summary */}
                  <div className="dashboard-overall-score-section">
                    <div className="score-circle-wrapper" style={{ margin: 0, width: '120px', height: '120px' }}>
                      <svg width="120" height="120" viewBox="0 0 160 160">
                        <circle className="score-bg-circle" cx="80" cy="80" r="70" strokeWidth="14" />
                        <circle 
                          className="score-progress-circle" 
                          cx="80" 
                          cy="80" 
                          r="70"
                          strokeWidth="14"
                          style={{ 
                            strokeDasharray: 440,
                            strokeDashoffset: 440 - (440 * (activeAnalysis.overall_score / 10)) 
                          }} 
                        />
                      </svg>
                      <div className="score-text-box">
                        <span className="score-number" style={{ fontSize: '28px' }}>{activeAnalysis.overall_score}</span>
                        <span className="score-label" style={{ fontSize: '7px' }}>Overall</span>
                      </div>
                    </div>
                    <div className="dashboard-score-summary">
                      <h3>Speech Coach Evaluation</h3>
                      <p>{activeAnalysis.summary}</p>
                    </div>
                  </div>

                  {/* Quantitative Metrics Grid */}
                  <div className="dashboard-metrics-grid">
                    <div className="metric-card">
                      <div className="metric-card-label">Estimated Duration</div>
                      <div className="metric-card-value">{activeAnalysis.metrics.estimated_speaking_duration_seconds}s</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-card-label">Total Words</div>
                      <div className="metric-card-value">{activeAnalysis.metrics.estimated_total_words}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-card-label">Pacing Rate (WPM)</div>
                      <div className="metric-card-value">{activeAnalysis.metrics.estimated_words_per_minute}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-card-label">Filler Count</div>
                      <div className="metric-card-value" style={{ color: activeAnalysis.metrics.total_fillers > 5 ? '#ef4444' : '#10b981' }}>
                        {activeAnalysis.metrics.total_fillers}
                      </div>
                    </div>
                  </div>

                  {/* Sub-Score progress bars */}
                  <h3 className="dashboard-section-subtitle">Evaluation Breakdown</h3>
                  <div className="scores-progress-wrapper">
                    {Object.entries(activeAnalysis.scores).map(([key, item]) => (
                      <div key={key} className="score-progress-row" title={item.reason}>
                        <span className="score-label-col">{key.replace('_', ' ')}</span>
                        <div className="score-bar-bg">
                          <div 
                            className="score-bar-fill"
                            style={{ width: `${item.score * 10}%` }}
                          ></div>
                        </div>
                        <span className="score-val-col">{item.score}</span>
                      </div>
                    ))}
                  </div>

                  {/* Strengths and Weaknesses Split */}
                  <div className="dashboard-details-split">
                    <div className="details-card">
                      <h4 className="strength-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Top Strengths
                      </h4>
                      <ul className="bullets-list strengths-list">
                        {activeAnalysis.strengths.map((str, i) => (
                          <li key={i}>{str}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="details-card">
                      <h4 className="weakness-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        Areas to Improve
                      </h4>
                      <ul className="bullets-list weaknesses-list">
                        {activeAnalysis.weaknesses.map((weak, i) => (
                          <li key={i}>{weak}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Filler Words Breakdown */}
                  {activeAnalysis.filler_words && activeAnalysis.filler_words.length > 0 && activeAnalysis.filler_words[0].word && (
                    <div style={{ marginBottom: '32px' }}>
                      <h3 className="dashboard-section-subtitle">Filler Words Breakdown</h3>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {activeAnalysis.filler_words.map((fw, idx) => (
                          <span 
                            key={idx} 
                            style={{ 
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#f87171',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: 600
                            }}
                          >
                            "{fw.word}": {fw.count} times
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actionable prioritized improvements list */}
                  <h3 className="dashboard-section-subtitle">Prioritized Action Items</h3>
                  <div className="improvements-list">
                    {activeAnalysis.improvements.map((item, idx) => (
                      <div key={idx} className={`improvement-item ${item.priority}`}>
                        <div className="improvement-item-header">
                          <span className="improvement-item-title">{item.issue}</span>
                          <span className="improvement-item-priority">{item.priority} Priority</span>
                        </div>
                        <p className="improvement-item-why">
                          <strong>Why it matters:</strong> {item.why_it_matters}
                        </p>
                        <p className="improvement-item-suggest">
                          <strong>Coach Recommendation:</strong> {item.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Transcript Comparator */}
                  {activeAnalysis.improved_response && (
                    <div className="improvements-box">
                      <h3 className="dashboard-section-subtitle">Coach's Improved Version</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        Here is a restructured phrasing showing how you can convey the same concepts with more visual presence:
                      </p>
                      <div className="improved-text-card">
                        "{activeAnalysis.improved_response}"
                      </div>
                    </div>
                  )}

                  {/* Practice Exercises */}
                  {activeAnalysis.practice_exercises && activeAnalysis.practice_exercises.length > 0 && (
                    <div>
                      <h3 className="dashboard-section-subtitle">Recommended Practice Exercises</h3>
                      <ul className="bullets-list strengths-list">
                        {activeAnalysis.practice_exercises.map((exe, i) => (
                          <li key={i} style={{ color: 'var(--text-secondary)' }}>{exe}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              ) : (
                /* State C: Placeholder view */
                <div className="analysis-placeholder">
                  <div style={{ color: 'var(--primary)', opacity: 0.3, marginBottom: '8px' }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <h3 className="analysis-placeholder-title">Speech Analysis Dashboard</h3>
                  <p className="analysis-placeholder-desc">
                    Record a practice session or select a recording from the history to view detailed, AI-powered communication metrics and coaching guidelines.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
