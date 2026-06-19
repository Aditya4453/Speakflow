import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import PrecisionTools from '../components/PrecisionTools';
import DeepAnalytics from '../components/DeepAnalytics';
import WatchGrowth from '../components/WatchGrowth';
import Testimonials from '../components/Testimonials';
import Footer from '../components/Footer';

export default function LandingPage({ onNavigateToAuth, onNavigateToWorkspace, user, onLogout }) {
  return (
    <>
      <Navbar
        onNavigateToAuth={onNavigateToAuth}
        onNavigateToWorkspace={onNavigateToWorkspace}
        user={user}
        onLogout={onLogout}
      />
      <main>
        <Hero
          onNavigateToAuth={onNavigateToAuth}
          onNavigateToWorkspace={onNavigateToWorkspace}
          user={user}
        />
        <Features />
        <PrecisionTools />
        <DeepAnalytics />
        <WatchGrowth />
        <Testimonials />
      </main>
      <Footer />
    </>
  );
}

