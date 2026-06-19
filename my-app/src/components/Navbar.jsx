export default function Navbar({ onNavigateToWorkspace }) {
  return (
    <header className="navbar">
      <div className="container nav-container">
        <a href="#" className="logo" onClick={() => onNavigateToWorkspace('landing')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 16H13V18H11V16ZM11 6H13V14H11V6Z" fill="url(#logo-grad)" />
            <defs>
              <linearGradient id="logo-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a78bfa" />
                <stop offset="1" stopColor="#7c5dfa" />
              </linearGradient>
            </defs>
          </svg>
          <span>SpeakFlow</span>
        </a>
        <div className="nav-actions">
          <button className="btn-primary" onClick={() => onNavigateToWorkspace('workspace')}>
            Workspace
          </button>
        </div>
      </div>
    </header>
  );
}

