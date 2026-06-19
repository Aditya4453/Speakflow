import { useState } from 'react';

export default function WatchGrowth() {
  const [activeWeek, setActiveWeek] = useState(5);

  const weeks = [
    { num: 1, height: '40%', value: '62%' },
    { num: 2, height: '50%', value: '68%' },
    { num: 3, height: '45%', value: '65%' },
    { num: 4, height: '65%', value: '74%' },
    { num: 5, height: '85%', value: '85%' },
    { num: 6, height: '70%', value: '78%' },
    { num: 7, height: '90%', value: '92%' }
  ];

  return (
    <section className="growth-section">
      <div className="container">
        <div className="growth-content">
          <h2 className="section-title">Watch Your Growth</h2>
          <p className="growth-subtitle">
            Stay motivated with visual progress reports. See your confidence grow and your filler word count drop over weeks of practice.
          </p>
        </div>

        <div className="growth-chart-box">
          <div className="bar-chart-container">
            {weeks.map((week) => (
              <div key={week.num} className="chart-bar-col" onClick={() => setActiveWeek(week.num)}>
                <div 
                  className={`chart-bar-pillar ${activeWeek === week.num ? 'highlighted' : ''}`}
                  style={{ height: week.height }}
                  title={`Week ${week.num}: ${week.value}`}
                ></div>
                <span className="chart-bar-label">Week {week.num}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
