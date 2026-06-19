export default function Testimonials() {
  return (
    <section className="testimonials-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Loved by Professionals</h2>
        </div>

        <div className="testimonials-grid">
          <div className="testimonial-card">
            <p className="testimonial-quote">
              "SpeakFlow completely changed how I prepare for my quarterly reviews. The pacing analysis is a game-changer."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">JD</div>
              <div className="author-info">
                <span className="author-name">Jane Doe</span>
                <span className="author-title">Product Lead, Tech Corp</span>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <p className="testimonial-quote">
              "As a public speaker, pacing is everything. SpeakFlow's real-time dashboard is like having a coach in my laptop."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(239, 68, 68, 0.3) 100%)' }}>MS</div>
              <div className="author-info">
                <span className="author-name">Marcus Smith</span>
                <span className="author-title">TEDx Speaker</span>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <p className="testimonial-quote">
              "Clean, efficient, and incredibly accurate. It caught filler words I didn't even realize I was saying!"
            </p>
            <div className="testimonial-author">
              <div className="author-avatar" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)' }}>AJ</div>
              <div className="author-info">
                <span className="author-name">Anita Ji</span>
                <span className="author-title">Marketing Director</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
