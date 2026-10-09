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
    [theme, setTheme] = useState("ember"),
    [opacity, setOpacity] = useState(76);
  const current = navigation.find((link) => link.path === location.pathname);
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
          <div className="es-nav-label">EXISTING ANALYSIS TOOLS</div>
          <nav className="es-secondary-nav">
            <NavLink to="/intrusion" onClick={() => setMobile(false)}>
              Network CSV scanner <ArrowUpRight size={13} />
            </NavLink>
            <NavLink to="/history" onClick={() => setMobile(false)}>
              Scan archive <ArrowUpRight size={13} />
            </NavLink>
            <NavLink to="/model-performance" onClick={() => setMobile(false)}>
              Model evaluation <ArrowUpRight size={13} />
            </NavLink>
          </nav>
          <div className="es-sidebar-bottom">
            <div className="es-system-card">
              <span className="es-dot" /> LOCAL ENGINE READY
              <p>
                Demonstration events run in your browser. Live services are
                separate.
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
              <span className="es-stream-status">
                <i className={`es-dot ${soc.streaming ? "pulsing" : ""}`} />
                {soc.streaming ? "DEMO STREAM ACTIVE" : "DEMO WORKSPACE"}
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
            <span>LOCAL SESSION · HUMAN OVERSIGHT</span>
          </footer>
        </div>
      </div>
    </MotionConfig>
  );
}
