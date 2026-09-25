import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { NetworkIntrusion } from './pages/NetworkIntrusion';
import { DetectionHistory } from './pages/DetectionHistory';
import { ModelPerformance } from './pages/ModelPerformance';
import { Profile } from './pages/Profile';
import { ScamDetector } from './pages/ScamDetector';
import { Auth } from './pages/Auth';

export const App = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const isDashboard = useLocation().pathname === '/dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1020] text-gray-100 font-sans selection:bg-[#00E5A8]/30 selection:text-[#00E5A8]">

      {/* Top Navbar */}
      <Navbar onOpenAuth={() => setAuthModalOpen(true)} />

      {/* Main Content Viewport */}
      <main className={isDashboard ? 'flex-1 w-full bg-[#090A0F]' : 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6'}>
        <Routes>
          <Route path="/" element={<LandingPage onOpenAuth={() => setAuthModalOpen(true)} />} />
          <Route path="/scam-detector" element={<ScamDetector />} />
          <Route path="/dashboard" element={<Dashboard onOpenAuth={() => setAuthModalOpen(true)} />} />
          <Route path="/intrusion" element={<NetworkIntrusion onOpenAuth={() => setAuthModalOpen(true)} />} />
          <Route path="/history" element={<DetectionHistory />} />
          <Route path="/model-performance" element={<ModelPerformance />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Auth Modal Overlay */}
      {authModalOpen && (
        <Auth onClose={() => setAuthModalOpen(false)} />
      )}

      {/* Footer */}
      {!isDashboard && <Footer />}
    </div>
  );
};

export default App;
