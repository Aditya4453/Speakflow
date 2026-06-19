export default function Features() {
  return (
    <section className="features-row">
      <div className="container">
        <div className="features-grid">
          <div className="feature-step-card">
            <div className="feature-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" x2="12" y1="19" y2="22"/>
              </svg>
              <div className="feature-badge">1</div>
            </div>
            <h3 className="feature-step-title">Record Your Session</h3>
            <p className="feature-step-desc">
              Simply hit record and practice your speech or presentation naturally.
            </p>
          </div>
          
          <div className="feature-step-card">
            <div className="feature-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <div className="feature-badge">2</div>
            </div>
            <h3 className="feature-step-title">AI Processing</h3>
            <p className="feature-step-desc">
              Our AI runs analysis on every speech, detecting filler words, pacing, and more.
            </p>
          </div>

          <div className="feature-step-card">
            <div className="feature-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18"/>
                <path d="m19 9-5 5-4-4-3 3"/>
              </svg>
              <div className="feature-badge">3</div>
            </div>
            <h3 className="feature-step-title">Get Actionable Insights</h3>
            <p className="feature-step-desc">
              Receive a detailed scorecard and specific tips to improve your delivery.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
