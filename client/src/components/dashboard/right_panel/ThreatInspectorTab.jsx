import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Lock, Download, Check, Zap } from "lucide-react";
import { createIncidentReport } from "../incidentReport";

export function RiskGauge({ score, label = "RISK SCORE" }) {
  const color = score >= 75 ? "#FF007F" : score >= 40 ? "#FFB800" : "#00FF9D";
  return (
    <div
      className="soc-gauge"
      role="img"
      aria-label={`${label}: ${score ?? "unavailable"}`}
    >
      <svg viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="#ffffff0d"
          strokeWidth="7"
        />
        <motion.circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke={score == null ? "#64748b" : color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="314.16"
          initial={{ strokeDashoffset: 314.16 }}
          animate={{ strokeDashoffset: 314.16 * (1 - (score || 0) / 100) }}
          transition={{ duration: 0.8 }}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div>
        <strong>{score ?? "—"}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}
/** @param {{incident: object, status?: string, onAction: (action: string) => void, history?: {action: string, timestamp: string}[]}} props */
export function ActionSuite({ incident, status, onAction, history = [] }) {
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const exportReport = async () => {
    setExporting(true);
    setExportMessage("");
    try {
      const doc = await createIncidentReport(incident, status, history);
      doc.save(`NeuroShield-${incident.id.replace(/[^a-z0-9-]/gi, "_")}.pdf`);
      setExportMessage("Report generated; download requested.");
    } catch {
      setExportMessage("Report could not be generated. Please retry.");
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="soc-actions">
      <div className="soc-section-label">
        ACTION SUITE <span>SIMULATION</span>
      </div>
      <p className="soc-muted">
        Controls simulate a response locally. Enforcement is not connected.
      </p>
      <button
        className="soc-button danger"
        disabled={status === "Block simulated"}
        onClick={() => onAction("Block simulated")}
      >
        <Lock size={16} /> Block IP & Revoke Token
      </button>
      <button
        className="soc-button"
        disabled={status === "Isolation simulated"}
        onClick={() => onAction("Isolation simulated")}
      >
        <Zap size={16} /> Isolate Endpoint
      </button>
      <button
        className="soc-button"
        disabled={status === "Whitelist simulated"}
        onClick={() => onAction("Whitelist simulated")}
      >
        <Check size={16} /> Whitelist Traffic
      </button>
      <button
        className="soc-button"
        data-tour="tour-report"
        onClick={exportReport}
        disabled={exporting}
      >
        <Download size={16} />{" "}
        {exporting ? "Generating report…" : "Export IEEE-style Incident PDF"}
      </button>
      <p role="status" className="soc-action-status">
        {status
          ? `${status}. No infrastructure changed.`
          : "Awaiting analyst response."}
      </p>
      {exportMessage && (
        <p role="status" className="soc-muted">
          {exportMessage}
        </p>
      )}
      {history.length > 0 && (
        <div className="soc-note">
          <span className="soc-eyebrow">MITIGATION HISTORY / SESSION ONLY</span>
          <ol className="soc-history">
            {history.map((entry, index) => (
              <li key={`${entry.timestamp}-${index}`}>
                <strong>{entry.action}</strong>
                <time dateTime={entry.timestamp}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </time>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
export default function ThreatInspectorTab({
  incident,
  status,
  onAction,
  showActions = true,
}) {
  return (
    <div>
      <div className="soc-risk-matrix">
        <RiskGauge score={incident.score} />
        <div>
          <span className={`soc-badge ${incident.severity.toLowerCase()}`}>
            {incident.severity}
          </span>
          <h3>{incident.title}</h3>
          <code>{incident.source}</code>
        </div>
      </div>
      <div className="soc-note">
        <span className="soc-eyebrow">
          <ShieldAlert size={13} /> AI EXPLANATION
        </span>
        <p>{incident.explanation}</p>
      </div>
      <dl className="soc-facts">
        <div>
          <dt>Signal type</dt>
          <dd>{incident.signalType || "Scan record"}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>
            {incident.demo
              ? `${incident.confidence ?? 94.6}% · demo`
              : "Not supplied"}
          </dd>
        </div>
        <div>
          <dt>Observed</dt>
          <dd>{incident.time}</dd>
        </div>
      </dl>
      {showActions && (
        <ActionSuite incident={incident} status={status} onAction={onAction} />
      )}
    </div>
  );
}
