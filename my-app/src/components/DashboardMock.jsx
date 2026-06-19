export default function DashboardMock({ currentAnalysis }) {
  return (
    <div className="mock-dashboard">
      <div className="dashboard-header">
        <div className="window-controls">
          <span className="control-dot red"></span>
          <span className="control-dot yellow"></span>
          <span className="control-dot green"></span>
        </div>
        <div className="dashboard-title">Analysis #124 - Impromptu</div>
      </div>
      <div className="dashboard-body">
        
        {/* Circular Score Gauge */}
        <div className="score-circle-wrapper">
          <svg className="score-svg" width="160" height="160" viewBox="0 0 160 160">
            <circle className="score-bg-circle" cx="80" cy="80" r="70" />
            <circle 
              className="score-progress-circle" 
              cx="80" 
              cy="80" 
              r="70"
              style={{ strokeDashoffset: currentAnalysis.dashoffset }} 
            />
            <defs>
              <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c5dfa" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
          </svg>
          <div className="score-text-box">
            <span className="score-number">{currentAnalysis.score}</span>
            <span className="score-label">Overall Score</span>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="dashboard-stats-row">
          <div className="stat-item-box">
            <div className="stat-item-label">{currentAnalysis.stat1Label}</div>
            <div className="stat-item-value">{currentAnalysis.stat1Value}</div>
          </div>
          <div className="stat-item-box">
            <div className="stat-item-label">{currentAnalysis.stat2Label}</div>
            <div className="stat-item-value">{currentAnalysis.stat2Value}</div>
          </div>
        </div>

      </div>
    </div>
  );
}
