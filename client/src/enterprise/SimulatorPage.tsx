import React from "react";
import { motion } from "framer-motion";
import { FlaskConical, Zap, ArrowUpRight, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import { scenarios } from "./domain";
import type { Scenario } from "./domain";
import { useSoc } from "./SocContext";
import PageHeader from "./PageHeader";
import IncidentInspector from "./IncidentInspector";
export default function SimulatorPage() {
  const soc = useSoc();
  const selected = soc.incidents.find((i) => i.id === soc.selectedId);
  return (
    <div className="es-page">
      <PageHeader
        eyebrow="VALIDATION / ISOLATED SANDBOX"
        title="Red team simulator"
        description="Put the defense loop on display. No attack traffic leaves this browser."
      >
        <Link to="/dashboard" className="es-button">
          Open command center <ArrowUpRight size={14} />
        </Link>
      </PageHeader>
      <div className="es-split">
        <div className="es-monitor">
          <div className="es-panel es-sandbox-banner">
            <FlaskConical size={32} />
            <div>
              <span className="es-eyebrow">
                CONTROLLED ADVERSARIAL SCENARIOS
              </span>
              <h2>One signal. A complete response.</h2>
              <p>
                Inject → score →{" "}
                {soc.honeypot
                  ? "redirect to demo honeypot"
                  : "simulate containment"}
                . New incidents appear immediately across the workspace; the
                demo response completes after two seconds.
              </p>
            </div>
          </div>
          <div className="es-scenario-grid">
            {(Object.keys(scenarios) as Scenario[]).map((kind, index) => (
              <motion.button
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                className="es-panel es-scenario"
                key={kind}
                onClick={() => soc.inject(kind)}
              >
                <div className="es-between">
                  <span className="es-scenario-icon">
                    <Zap size={20} />
                  </span>
                  <span className="es-eyebrow">SCENARIO / 0{index + 1}</span>
                </div>
                <h3>{scenarios[kind].title}</h3>
                <p>
                  {scenarios[kind].signalType} · Synthetic risk{" "}
                  {scenarios[kind].score}/100
                </p>
                <span className="es-scenario-launch">
                  Inject scenario <ArrowUpRight size={15} />
                </span>
              </motion.button>
            ))}
          </div>
          <div className="es-panel es-stream-control">
            <div>
              <h3>
                <Radio size={16} /> Continuous demo feed
              </h3>
              <p>
                Generate a synthetic event every 12 seconds while this app
                remains open.
              </p>
            </div>
            <button
              className={`es-button ${soc.streaming ? "accent" : ""}`}
              aria-pressed={soc.streaming}
              onClick={() => soc.setStreaming(!soc.streaming)}
            >
              {soc.streaming ? "Pause stream" : "Start stream"}
            </button>
          </div>
          <section className="es-panel es-event-journal">
            <div className="es-panel-heading">
              <h2>Execution journal</h2>
              <span>LOCAL SESSION</span>
            </div>
            {selected?.history.map((h, index) => (
              <div key={index}>
                <time>{new Date(h.timestamp).toLocaleTimeString()}</time>
                <span>{h.action}</span>
              </div>
            ))}
          </section>
        </div>
        <IncidentInspector incident={selected} />
      </div>
    </div>
  );
}
