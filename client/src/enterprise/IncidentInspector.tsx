import { useTourAction } from "./GuidedTour";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShieldAlert,
  Cpu,
  ListChecks,
  Terminal,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import AgentWorkflowTab from "../components/dashboard/right_panel/AgentWorkflowTab";
import {
  ActionSuite,
  RiskGauge,
} from "../components/dashboard/right_panel/ThreatInspectorTab";
import { useSoc } from "./SocContext";
import type { Incident } from "./domain";
import { SurfaceRadar, FindingsDonut } from "./Visuals";

export function Attribution({ incident }: { incident: Incident }) {
  return (
    <div className="es-attribution">
      <span className="es-eyebrow">
        {incident.demo
          ? "ILLUSTRATIVE WEIGHTS"
          : incident.provenance === "heuristic"
            ? "OBSERVED RULE CONTRIBUTIONS"
            : "MODEL EVIDENCE"}
      </span>
      <h3>Why this signal matters</h3>
      <p className="es-muted">
        {incident.demo
          ? "Scenario weights are demonstration values, not measured SHAP/LIME output."
          : "Contributions are transparent heuristic points, not SHAP/LIME values or calibrated probabilities."}
      </p>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={incident.features}
            margin={{ left: 0, right: 20 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: "#8190a5", fontSize: 9 }}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={118}
              tick={{ fill: "#b4becd", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#121824",
                border: "1px solid #303b50",
                fontSize: 11,
              }}
              formatter={(value) => [`${value} points`, "Contribution"]}
            />
            <Bar
              dataKey="impact"
              isAnimationActive={false}
              radius={[0, 3, 3, 0]}
            >
              {incident.features.map((f, i) => (
                <Cell
                  key={f.name}
                  fill={["#ff4500", "#f59e0b", "#e63946", "#10b981"][i % 4]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!incident.features.length && (
        <p className="es-muted">No configured rule flags were found.</p>
      )}
      <ul className="es-feature-list">
        {incident.features.map((f) => (
          <li key={f.name}>
            <span>{f.name}</span>
            <strong>+{f.impact} pts</strong>
          </li>
        ))}
      </ul>
      <div className="es-evidence-note">
        <Cpu size={16} />
        <p>{incident.explanation}</p>
      </div>
    </div>
  );
}
export default function IncidentInspector({
  incident,
  surface = false,
}: {
  incident?: Incident;
  surface?: boolean;
}) {
  const soc = useSoc();
  const [tab, setTab] = useState("overview");
  useEffect(
    () => setTab(incident?.phase === "Detected" ? "workflow" : "overview"),
    [incident?.id],
  );
  useTourAction("tour-report", () => setTab("actions"));
  const tabs = [
    { id: "overview", label: "Overview", icon: ShieldAlert },
    { id: "workflow", label: "Agent", icon: Cpu },
    { id: "evidence", label: "Evidence", icon: Terminal },
    { id: "actions", label: "Actions", icon: ListChecks },
  ];
  if (!incident)
    return (
      <aside className="es-panel es-inspector">
        <div className="es-empty">
          <ShieldAlert size={32} />
          <h3>Follow a signal</h3>
          <p>Select an incident to open its investigation.</p>
        </div>
      </aside>
    );
  const frame =
    incident.phase === "Detected" ? 20 : incident.phase === "Scoring" ? 45 : 80;
  const lastAction = incident.history.findLast((h) =>
    h.action.includes("simulated"),
  )?.action;
  return (
    <aside
      className="es-panel es-inspector"
      aria-label="Persistent incident inspector"
    >
      <div className="es-inspector-header">
        <div>
          <span className="es-eyebrow">INTELLIGENCE WORKSPACE</span>
          <h2>
            <Cpu size={17} /> Incident inspector
          </h2>
        </div>
        <span className="es-agent-label">AGENT / 01</span>
      </div>
      <div
        className="es-inspector-tabs"
        role="tablist"
        aria-label="Inspector sections"
      >
        {tabs.map((t, index) => (
          <button
            role="tab"
            id={`es-tab-${t.id}`}
            aria-controls={`es-panel-${t.id}`}
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            key={t.id}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => {
              if (
                !e.ctrlKey &&
                !e.metaKey &&
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
              ) {
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? 3
                      : (index + (e.key === "ArrowRight" ? 1 : 3)) % 4;
                setTab(tabs[next].id);
                document.getElementById(`es-tab-${tabs[next].id}`)?.focus();
              }
            }}
          >
            <t.icon size={14} />
            {t.label}
            {tab === t.id && <motion.i layoutId="es-inspector-active" />}
          </button>
        ))}
      </div>
      <div className="es-selected-incident">
        <span>{incident.id}</span>
        <span className={`es-badge ${incident.severity.toLowerCase()}`}>
          {incident.severity}
        </span>
      </div>
      <div className="es-inspector-scroll">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${incident.id}-${tab}`}
            role="tabpanel"
            id={`es-panel-${tab}`}
            aria-labelledby={`es-tab-${tab}`}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.16 }}
          >
            {tab === "overview" ? (
              <>
                <div className="es-risk-overview">
                  <RiskGauge score={incident.score} label="RISK INDEX" />
                  <div>
                    <h3>{incident.title}</h3>
                    <code>{incident.source}</code>
                    <span className="es-provenance">
                      {incident.provenance.toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="es-summary">{incident.explanation}</p>
                <dl className="es-facts">
                  <div>
                    <dt>Signal</dt>
                    <dd>{incident.signalType}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{incident.status}</dd>
                  </div>
                  <div>
                    <dt>Phase</dt>
                    <dd>{incident.phase}</dd>
                  </div>
                  <div>
                    <dt>Observed</dt>
                    <dd>{new Date(incident.timestamp).toLocaleString()}</dd>
                  </div>
                </dl>
                {surface && (
                  <>
                    <div className="es-eyebrow">
                      THREAT SURFACE / ILLUSTRATIVE
                    </div>
                    <SurfaceRadar incident={incident} />
                    <div className="es-chart-legend">
                      <span>● Observed</span>
                      <span>● Expected</span>
                      <span>● Residual</span>
                    </div>
                    <FindingsDonut incidents={[incident]} />
                    <h3>Affected entities</h3>
                    <div className="es-entity-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Device</th>
                            <th>IP address</th>
                            <th>CVSS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {incident.entities.map((e) => (
                            <tr key={e.id}>
                              <td>{e.id}</td>
                              <td>{e.ip}</td>
                              <td>{e.cvss ?? "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!incident.entities.length && (
                        <p className="es-muted">
                          No verified devices supplied for this signal.
                        </p>
                      )}
                      <p className="es-muted">
                        CVSS requires a scored vulnerability; incident risk is
                        not CVSS.
                      </p>
                    </div>
                  </>
                )}
                <button
                  className="es-button accent"
                  onClick={() => setTab("evidence")}
                >
                  Inspect contributing factors <ArrowUpRight size={14} />
                </button>
              </>
            ) : tab === "workflow" ? (
              <AgentWorkflowTab
                incident={incident}
                frame={frame}
                playing={frame < 80}
                onInspect={() => setTab("evidence")}
              />
            ) : tab === "evidence" ? (
              <>
                <Attribution incident={incident} />
                <div className="es-payload">
                  <span className="es-eyebrow">
                    {incident.demo
                      ? "INERT DEMO PAYLOAD"
                      : "SUBMITTED EVIDENCE"}
                  </span>
                  <pre>{incident.payload}</pre>
                </div>
                <Link className="es-button" to="/xai-playbooks">
                  Open remediation playbooks <ArrowUpRight size={14} />
                </Link>
              </>
            ) : (
              <ActionSuite
                incident={incident}
                status={lastAction}
                history={incident.history}
                onAction={(action: string) =>
                  soc.recordAction(incident.id, action)
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="es-inspector-footer">
        <span className="es-dot" /> ANALYST CONTROL{" "}
        <span>Enforcement simulated</span>
      </div>
    </aside>
  );
}
