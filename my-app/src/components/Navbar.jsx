export default function Navbar({ onNavigateToAuth, onNavigateToWorkspace, user, onLogout }) {
  return (
    <header className="navbar">
      <div className="container nav-container">
        <a href="#" className="logo">
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
        <ul className="nav-links">
          {user && (
            <>
              <li>
                <button 
                  onClick={() => onNavigateToWorkspace('dashboard')} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit' }}
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigateToWorkspace('profile')} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit' }}
                >
                  Profile
                </button>
              </li>
            </>
          )}
          <li><a href="#analysis">Analysis</a></li>
          {/* <li><a href="#pricing">Pricing</a></li> */}
        </ul>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="user-greeting" style={{ marginRight: '16px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
                Hello, {user.name}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="btn-logout"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginRight: '16px' }}
              >
                Logout
              </button>
              <button
                type="button"
                onClick={onNavigateToWorkspace}
                className="btn-primary"
              >
                Workspace
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNavigateToAuth('login')}
                className="btn-login"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Login
              </button>
              <button
                type="button"
                onClick={onNavigateToWorkspace}
                className="btn-primary"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

