import Waveform from './Waveform';

export default function PrecisionTools() {
  return (
    <section className="tools-section" id="analysis">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Precision Tools for Speakers</h2>
        </div>
        
        <div className="tools-grid">
          {/* Waveform Card */}
          <div className="tool-card">
            <span className="tool-tag">In Real-Time</span>
            <h3 className="tool-card-title">Advanced Speech Visualization</h3>
            <p className="tool-card-desc">
              Watch your voice come to life with real-time frequency analysis and sentiment mapping.
            </p>
            <Waveform />
          </div>

          {/* Pacing & Confidence Column */}
          <div className="small-cards-column">
            <div className="tool-card small">
              <div>
                <div className="tool-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <h3 className="tool-card-title">Pacing Analysis</h3>
                <p className="tool-card-desc">Find the perfect tempo for your message.</p>
              </div>
            </div>

            <div className="tool-card small">
              <div>
                <div className="tool-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
                  </svg>
                </div>
                <h3 className="tool-card-title">Confidence Score</h3>
                <p className="tool-card-desc">Quantify your presence and vocal authority.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="tools-grid-bottom">
          <div className="tool-card">
            <div className="tool-icon" style={{ color: 'var(--accent-purple)', marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
            </div>
            <h3 className="tool-card-title">Filler Word Detection</h3>
            <p className="tool-card-desc" style={{ marginBottom: 0 }}>
              Eliminate "um", "ah", and "like" automatically.
            </p>
          </div>

          <div className="tool-card">
            <div className="tool-icon" style={{ color: 'var(--accent-purple)', marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <h3 className="tool-card-title">Multi-Language Support</h3>
            <p className="tool-card-desc" style={{ marginBottom: 0 }}>
              Practice in over 20 languages with high accuracy.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
