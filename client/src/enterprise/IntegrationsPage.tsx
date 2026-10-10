import React, { useState } from "react";
import { Network, Shield, RefreshCw, Radio, Cpu } from "lucide-react";
import { endpoints } from "./transport";
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
      if (endpoints.error) throw new Error(endpoints.error);
      const response = await fetch(`${endpoints.apiUrl}/api/health`, {
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      setHealth(
        response.ok && data.service === "neuroshield-fastapi"
          ? `FastAPI reachable · Text model ${data.models.text} · Audio ${data.models.audio}`
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
          <h2>Live WebSocket engine</h2>
          <p>
            Connection: {soc.feedStatus}. Shared incident state receives backend
            demonstration events every 2.5 seconds. {soc.feedError}
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
            Text inference uses the project-example TF-IDF classifier. Public
            URL checks attempt registry age and TLS validation. Calibrated voice
            classification, transcription, and SHAP/LIME still require validated
            models.
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
