import React from "react";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import "./dashboard.css";

export default function DashboardLayout({
  header,
  monitoring,
  inspector,
  mode = "soc",
}) {
  const reduced = useReducedMotion();
  return (
    <MotionConfig reducedMotion="user">
      <div className={`soc-dashboard soc-mode-${mode}`}>
        {header}
        <div className="soc-split">
          <motion.section
            className="soc-monitor"
            aria-label="Threat monitoring"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {monitoring}
          </motion.section>
          <motion.aside
            className="soc-inspector soc-card"
            aria-label="Incident investigation"
            data-tour="tour-pin"
            initial={reduced ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            {inspector}
          </motion.aside>
        </div>
        <footer className="soc-footer">
          <span>
            <i className="soc-dot" /> NEUROSHIELD INTELLIGENCE ENGINE
          </span>
          <span>
            ANALYST WORKSPACE <span className="soc-muted">/</span> SOC COMMAND
            v2.0
          </span>
        </footer>
      </div>
    </MotionConfig>
  );
}
