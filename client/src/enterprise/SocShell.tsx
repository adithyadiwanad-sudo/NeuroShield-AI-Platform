import React, { useEffect, useState } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  Shield,
  Activity,
  ScanLine,
  Layers,
  BrainCircuit,
  FlaskConical,
  Network,
  ChevronRight,
  Menu,
  X,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  ArrowUpRight,
} from "lucide-react";
import { useSoc } from "./SocContext";
import "./enterprise.css";
const navigation = [
  { path: "/dashboard", name: "Command center", icon: Activity },
  { path: "/scam-lab", name: "Multi-modal scam lab", icon: ScanLine },
  { path: "/incidents", name: "Incidents & findings", icon: Layers },
  { path: "/xai-playbooks", name: "XAI & playbooks", icon: BrainCircuit },
  { path: "/simulator", name: "Red team simulator", icon: FlaskConical },
  { path: "/integrations", name: "Integrations & deception", icon: Network },
];
export default function SocShell({
  children,
  onOpenAuth,
}: {
  children: React.ReactNode;
  onOpenAuth: () => void;
}) {
  const location = useLocation(),
    soc = useSoc();
  const [mobile, setMobile] = useState(false),
    [appearance, setAppearance] = useState(false),
    [theme, setTheme] = useState(() => {
      try {
        const saved = localStorage.getItem("neuroshield.theme");
        return saved && ["ember", "aurora", "light"].includes(saved) ? saved : "aurora";
      } catch { return "aurora"; }
    }),
    [opacity, setOpacity] = useState(76);
  const current = [
    ...navigation,
    { path: "/scan", name: "New scan" },
    { path: "/intrusion", name: "Network intrusion detection" },
    { path: "/history", name: "Detection history" },
    { path: "/model-performance", name: "Model evaluation" },
  ].find((link) => link.path === location.pathname);
  useEffect(() => {
    try { localStorage.setItem("neuroshield.theme", theme); } catch { /* Storage may be disabled. */ }
    document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
    return () => { document.documentElement.style.colorScheme = ""; };
  }, [theme]);
  useEffect(() => {
    window.scrollTo(0, 0);
    setAppearance(false);
  }, [location.pathname]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAppearance(false);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <div
        className="enterprise-shell"
        data-theme={theme}
        style={{ "--panel-opacity": `${opacity}%` } as React.CSSProperties}
      >
        {mobile && (
          <button
            className="es-mobile-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          />
        )}
        <aside
          className={`es-sidebar ${mobile ? "is-open" : ""}`}
          aria-label="Primary navigation"
        >
          <Link
            className="es-brand"
            to="/dashboard"
            onClick={() => setMobile(false)}
          >
            <span className="es-brand-icon">
              <Shield size={23} />
            </span>
            <div>
              NEURO<span>SHIELD</span>
              <small>INTELLIGENT DEFENSE PLATFORM</small>
            </div>
          </Link>
          <button
            className="es-mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={18} />
          </button>
          <div className="es-workspace">
            <span className="es-workspace-avatar">N</span>
            <div>
              Research workspace<small>LOCAL DEMONSTRATION</small>
            </div>
            <ChevronRight size={13} />
          </div>
          <div className="es-nav-label">OPERATIONS</div>
          <nav>
            {navigation.map((link, index) => (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setMobile(false)}
                className={({ isActive }) =>
                  `es-nav-item ${isActive ? "active" : ""}`
                }
              >
                <link.icon size={17} />
                <span>{link.name}</span>
                {link.path === "/incidents" ? (
                  <b>
                    {
                      soc.incidents.filter(
                        (i) => !["Resolved", "Contained"].includes(i.status),
                      ).length
                    }
                  </b>
                ) : (
                  <small>0{index + 1}</small>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="es-nav-label">ANALYSIS & RESEARCH</div>
          <nav className="es-secondary-nav">
            <NavLink to="/scan" onClick={() => setMobile(false)}>
              New scan <ArrowUpRight size={13} />
            </NavLink>
            <NavLink to="/intrusion" onClick={() => setMobile(false)}>
              Network intrusion detection <ArrowUpRight size={13} />
            </NavLink>
            <NavLink to="/history" onClick={() => setMobile(false)}>
              Detection history <ArrowUpRight size={13} />
            </NavLink>
            <NavLink to="/model-performance" onClick={() => setMobile(false)}>
              Model evaluation <ArrowUpRight size={13} />
            </NavLink>
          </nav>
          <div className="es-sidebar-bottom">
            <div className="es-system-card">
              <span className="es-dot" /> FEED {soc.feedStatus.toUpperCase()}
              <p>
                FastAPI supplies synthetic live events. Analyst actions remain
                simulated.
              </p>
            </div>
            <button className="es-analyst" onClick={onOpenAuth}>
              <span>AN</span>
              <div>
                Security analyst<small>Access account</small>
              </div>
              <ChevronRight size={14} />
            </button>
          </div>
        </aside>
        <div className="es-main">
          <header className="es-topbar">
            <div className="es-breadcrumb">
              <button
                className="es-menu"
                aria-label="Open navigation"
                onClick={() => setMobile(true)}
              >
                <Menu size={19} />
              </button>
              <span>Workspace</span>
              <ChevronRight size={12} />
              <strong>{current?.name || "Analysis tools"}</strong>
            </div>
            <div className="es-top-actions">
              <button className="es-button es-theme-toggle"
                aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
                onClick={() => setTheme(theme === "light" ? "aurora" : "light")}>
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
                {theme === "light" ? "Dark" : "Light"}
              </button>
              <span className="es-stream-status">
                <i className={`es-dot ${soc.streaming ? "pulsing" : ""}`} />
                {soc.feedStatus === "connected"
                  ? "LIVE DEMO FEED"
                  : `FEED ${soc.feedStatus.toUpperCase()}`}
              </span>
              <button
                className="es-icon-button"
                aria-label={
                  soc.sound ? "Mute alert sounds" : "Enable alert sounds"
                }
                aria-pressed={soc.sound}
                onClick={() => soc.setSound(!soc.sound)}
              >
                {soc.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button
                className="es-icon-button"
                aria-label="Appearance settings"
                aria-expanded={appearance}
                onClick={() => setAppearance(!appearance)}
              >
                <SlidersHorizontal size={16} />
              </button>
              <span className="es-top-avatar">AN</span>
            </div>
          </header>
          <AnimatePresence>
            {appearance && (
              <motion.div
                className="es-appearance"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <div className="es-between">
                  <strong>Workspace appearance</strong>
                  <button
                    aria-label="Close appearance settings"
                    onClick={() => setAppearance(false)}
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="es-toggle">
                  <button aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
                    Professional / light
                  </button>
                  <button
                    aria-pressed={theme === "ember"}
                    onClick={() => setTheme("ember")}
                  >
                    Ember / obsidian
                  </button>
                  <button
                    aria-pressed={theme === "aurora"}
                    onClick={() => setTheme("aurora")}
                  >
                    Aurora / cyan
                  </button>
                </div>
                <label>
                  Glass opacity <output>{opacity}%</output>
                  <input
                    type="range"
                    min="55"
                    max="96"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                  />
                </label>
              </motion.div>
            )}
          </AnimatePresence>
          {soc.storageWarning && (
            <p className="es-notice" role="status">
              Session storage is unavailable. Changes remain available until
              this page is closed or reloaded.
            </p>
          )}
          <div className={current ? "es-route" : "es-route es-legacy"}>
            {children}
          </div>
          <footer className="es-shell-footer">
            <span>
              <Shield size={11} /> NEUROSHIELD / RESEARCH EDITION
            </span>
            <span>BUILD {import.meta.env.VITE_BUILD_COMMIT} · HUMAN OVERSIGHT</span>
          </footer>
        </div>
      </div>
    </MotionConfig>
  );
}
