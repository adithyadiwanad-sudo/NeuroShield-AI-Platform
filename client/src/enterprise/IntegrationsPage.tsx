import React, { useState } from "react";
import { Network, Shield, RefreshCw, Radio, Cpu } from "lucide-react";
import api from "../services/api";
import PageHeader from "./PageHeader";
import { useSoc } from "./SocContext";
export default function IntegrationsPage() {
  const soc = useSoc();
  const [health, setHealth] = useState("Not checked"),
    [checking, setChecking] = useState(false);
  const redirects = soc.incidents.filter((i) => i.phase === "Redirected");
  const check = async () => {
    setChecking(true);
    try {
      const response = await api.get("/health", { timeout: 8000 });
      setHealth(
        response.status === 200
          ? "API reachable · model readiness not verified"
          : "Unexpected response",
      );
    } catch {
      setHealth("API unavailable · local workspace remains functional");
    } finally {
      setChecking(false);
    }
  };
  return (
    <div className="es-page">
      <PageHeader
        eyebrow="INFRASTRUCTURE / DECEPTION"
        title="Integrations & deception"
        description="Know what is connected. Observe the simulated containment boundary."
      />
      <div className="es-integration-grid">
        <section className="es-panel es-integration">
          <Radio />
          <span className="es-badge safe">AVAILABLE</span>
          <h2>Local event engine</h2>
          <p>
            Shared incident state, session persistence, and an optional
            synthetic stream. This is a browser demo feed.
          </p>
          <button
            className="es-button"
            aria-pressed={soc.streaming}
            onClick={() => soc.setStreaming(!soc.streaming)}
          >
            {soc.streaming ? "Pause demo feed" : "Start demo feed"}
          </button>
        </section>
        <section className="es-panel es-integration">
          <Network />
          <span className="es-badge medium">CHECK CONNECTION</span>
          <h2>Analysis API</h2>
          <p role="status">{health}</p>
          <button className="es-button" disabled={checking} onClick={check}>
            <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
            {checking ? "Checking…" : "Check API health"}
          </button>
        </section>
        <section className="es-panel es-integration">
          <Cpu />
          <span className="es-badge low">SERVICE REQUIRED</span>
          <h2>Trained model services</h2>
          <p>
            Live voice-cloning classification, transcription, domain
            intelligence, and SHAP/LIME explanations need validated model
            integrations. Local rules and audio measurements remain available.
          </p>
        </section>
      </div>
      <div className="es-panel es-deception">
        <div className="es-between es-wrap">
          <div>
            <span className="es-eyebrow">ADAPTIVE DECEPTION / SIMULATED</span>
            <h2>
              <Shield size={20} /> Honeypot routing
            </h2>
            <p>
              New simulator events are labeled as redirected after scoring when
              enabled. No network routes or infrastructure are changed.
            </p>
          </div>
          <button
            className={`es-button ${soc.honeypot ? "accent" : ""}`}
            aria-pressed={soc.honeypot}
            onClick={() => soc.setHoneypot(!soc.honeypot)}
          >
            {soc.honeypot ? "Demo routing enabled" : "Demo routing disabled"}
          </button>
        </div>
        <div className="es-terminal-log">
          <div className="es-terminal-heading">
            DECEPTION TELEMETRY{" "}
            <span>{redirects.length} redirected scenarios</span>
          </div>
          {redirects.length ? (
            redirects.map((i) => (
              <div key={i.id}>
                <time>{i.time}</time>
                <strong>{i.source}</strong>
                <span>{i.id} → isolated-demo-node</span>
                <code>{i.payload}</code>
              </div>
            ))
          ) : (
            <p>
              No redirected events yet. Inject a scenario with demo routing
              enabled.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
