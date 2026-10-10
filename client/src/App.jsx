import React, { lazy, Suspense, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Auth } from "./pages/Auth";
import { SocProvider } from "./enterprise/SocContext";
import { GuidedTourProvider } from "./enterprise/GuidedTour";
import SocShell from "./enterprise/SocShell";
const LandingPage = lazy(() =>
  import("./pages/LandingPage").then((m) => ({ default: m.LandingPage })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const NetworkIntrusion = lazy(() =>
  import("./pages/NetworkIntrusion").then((m) => ({
    default: m.NetworkIntrusion,
  })),
);
const DetectionHistory = lazy(() =>
  import("./pages/DetectionHistory").then((m) => ({
    default: m.DetectionHistory,
  })),
);
const ModelPerformance = lazy(() =>
  import("./pages/ModelPerformance").then((m) => ({
    default: m.ModelPerformance,
  })),
);
const Profile = lazy(() =>
  import("./pages/Profile").then((m) => ({ default: m.Profile })),
);
const ScamLabPage = lazy(() => import("./enterprise/ScamLabPage"));
const IncidentsPage = lazy(() => import("./enterprise/IncidentsPage"));
const XaiPlaybooksPage = lazy(() => import("./enterprise/XaiPlaybooksPage"));
const SimulatorPage = lazy(() => import("./enterprise/SimulatorPage"));
const IntegrationsPage = lazy(() => import("./enterprise/IntegrationsPage"));
const ScanLauncherPage = lazy(() => import("./enterprise/ScanLauncherPage"));
import "./components/layout/dashboard.css";
export const App = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const landing = useLocation().pathname === "/about";
  const openAuth = () => setAuthModalOpen(true);
  const routes = (
    <Suspense
      fallback={
        <div className="es-panel es-empty" role="status">
          Loading workspace…
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/about" element={<LandingPage onOpenAuth={openAuth} />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/scan" element={<ScanLauncherPage />} />
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
    </Suspense>
  );
  return (
    <SocProvider>
      <GuidedTourProvider>
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
      </GuidedTourProvider>
    </SocProvider>
  );
};
export default App;
