import { useState } from 'react';
import DashboardMock from './DashboardMock';

export default function DeepAnalytics() {
  const [activeAnalysis, setActiveAnalysis] = useState('fluency');

  const analysisData = {
    fluency: {
      score: 85,
      dashoffset: 440 - (440 * 0.85),
      stat1Label: 'Filler Words',
      stat1Value: '12',
      stat2Label: 'Confidence',
      stat2Value: 'High',
    },
    sentiment: {
      score: 94,
      dashoffset: 440 - (440 * 0.94),
      stat1Label: 'Tone Variation',
      stat1Value: 'Optimal',
      stat2Label: 'Sentiment',
      stat2Value: 'Positive',
    },
    transcript: {
      score: 72,
      dashoffset: 440 - (440 * 0.72),
      stat1Label: 'Flagged Issues',
      stat1Value: '6',
      stat2Label: 'Pace Warning',
      stat2Value: 'Too Fast',
    }
  };

  const currentAnalysis = analysisData[activeAnalysis];

  return (
    <section className="analytics-section" id="dashboard">
      <div className="container">
        <div className="analytics-layout">
          
          {/* Left side checklist */}
          <div className="analytics-content">
            <h2>Deep Analytics for Every Word</h2>
            <p>
              Our dashboard gives you a granular breakdown of your performance. See where you excelled and where you need to pause.
            </p>
            <ul className="analytics-list">
              <li 
                className="analytics-list-item" 
                onClick={() => setActiveAnalysis('fluency')}
                style={{ cursor: 'pointer', opacity: activeAnalysis === 'fluency' ? 1 : 0.6, transition: 'opacity 0.2s' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Overall Fluency Tracking</span>
              </li>
              
              <li 
                className="analytics-list-item" 
                onClick={() => setActiveAnalysis('sentiment')}
                style={{ cursor: 'pointer', opacity: activeAnalysis === 'sentiment' ? 1 : 0.6, transition: 'opacity 0.2s' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Sentiment & Emotion Detection</span>
              </li>

              <li 
                className="analytics-list-item" 
                onClick={() => setActiveAnalysis('transcript')}
                style={{ cursor: 'pointer', opacity: activeAnalysis === 'transcript' ? 1 : 0.6, transition: 'opacity 0.2s' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Transcript with Highlighted Issues</span>
              </li>
            </ul>
          </div>

          {/* Right side mock window */}
          <DashboardMock currentAnalysis={currentAnalysis} />

        </div>
      </div>
    </section>
  );
}
