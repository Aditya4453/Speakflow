export default function Hero({ onNavigateToAuth, onNavigateToWorkspace, user }) {
  return (
    <section className="hero-section">
      <div className="container hero-content">
        <h1 className="hero-title">
          Become a Better Speaker,<br />
          <span>One Recording at a Time.</span>
        </h1>
        <p className="hero-subtitle">
          SpeakFlow uses advanced AI to analyze your speech patterns, identifying filler words, tone variations, and pacing to make you a more confident communicator.
        </p>
        <div className="hero-buttons">
          <button
            type="button"
            onClick={onNavigateToWorkspace}
            className="btn-primary"
          >
            {user ? 'Go to Workspace' : 'Start Practicing'}
          </button>
          {!user && (
            <button
              type="button"
              onClick={() => onNavigateToAuth('login')}
              className="btn-secondary"
            >
              View Demo
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

