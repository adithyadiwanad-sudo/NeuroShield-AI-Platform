import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { LandingPage } from "./pages/LandingPage";
import { Dashboard } from "./pages/Dashboard";
import { NetworkIntrusion } from "./pages/NetworkIntrusion";
import { DetectionHistory } from "./pages/DetectionHistory";
import { ModelPerformance } from "./pages/ModelPerformance";
import { Profile } from "./pages/Profile";
import { Auth } from "./pages/Auth";
import { SocProvider } from "./enterprise/SocContext";
import SocShell from "./enterprise/SocShell";
import ScamLabPage from "./enterprise/ScamLabPage";
import IncidentsPage from "./enterprise/IncidentsPage";
import XaiPlaybooksPage from "./enterprise/XaiPlaybooksPage";
import SimulatorPage from "./enterprise/SimulatorPage";
import IntegrationsPage from "./enterprise/IntegrationsPage";
import "./components/layout/dashboard.css";
export const App = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const landing = useLocation().pathname === "/";
  const openAuth = () => setAuthModalOpen(true);
  const routes = (
    <Routes>
      <Route path="/" element={<LandingPage onOpenAuth={openAuth} />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route
        path="/scam-detector"
        element={<Navigate to="/scam-lab" replace />}
      />
      <Route path="/scam-lab" element={<ScamLabPage />} />
      <Route path="/incidents" element={<IncidentsPage />} />
      <Route path="/xai-playbooks" element={<XaiPlaybooksPage />} />
      <Route path="/simulator" element={<SimulatorPage />} />
      <Route path="/integrations" element={<IntegrationsPage />} />
      <Route
        path="/intrusion"
        element={<NetworkIntrusion onOpenAuth={openAuth} />}
      />
      <Route path="/history" element={<DetectionHistory />} />
      <Route path="/model-performance" element={<ModelPerformance />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
  return (
    <SocProvider>
      {landing ? (
        <div className="min-h-screen bg-[#0B1020] text-gray-100">
          <Navbar onOpenAuth={openAuth} />
          <main>{routes}</main>
          <Footer />
        </div>
      ) : (
        <SocShell onOpenAuth={openAuth}>{routes}</SocShell>
      )}
      {authModalOpen && <Auth onClose={() => setAuthModalOpen(false)} />}
    </SocProvider>
  );
};
export default App;
