import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FlaskConical, Lock, Mic, Terminal } from "lucide-react";

export const attackScenarios = {
  brute: {
    title: "Brute force intrusion",
    source: "203.0.113.42",
    score: 96,
    confidence: 94.6,
    severity: "Critical",
    signalType: "Network packet",
    explanation:
      "Sandbox: repeated authentication failures from a single source precede an unusual session burst. This sequence illustrates a brute force attempt.",
    features: [
      { name: "Failed login burst", impact: 46 },
      { name: "Request velocity", impact: 31 },
      { name: "Session deviation", impact: 17 },
    ],
  },
  voice: {
    title: "Phishing voice call",
    source: "Voice sample / sandbox",
    score: 94,
    confidence: 94.6,
    severity: "Critical",
    signalType: "Voice",
    explanation:
      "Sandbox: urgent payment language, a newly registered destination, and unusual voice variation combine into an illustrative social-engineering alert. No real voice model was executed.",
    features: [
      { name: "Urgency Keywords", impact: 38 },
      { name: "Domain Age < 3 days", impact: 24 },
      { name: "Pitch/Frequency Variance", impact: 15 },
    ],
  },
  prompt: {
    title: "Prompt injection attempt",
    source: "198.51.100.24",
    score: 91,
    confidence: 93.2,
    severity: "Critical",
    signalType: "Text / prompt",
    explanation:
      "Sandbox: untrusted text attempts to override system instructions and request protected data. The demonstration flags instruction redirection for analyst review.",
    features: [
      { name: "Instruction override", impact: 43 },
      { name: "Data extraction request", impact: 29 },
      { name: "Role impersonation", impact: 19 },
    ],
  },
};
export function createSimulatedIncident(kind, now = new Date()) {
  return {
    ...attackScenarios[kind],
    id: `SIM-${kind.toUpperCase()}-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now.toISOString(),
    time: now.toLocaleTimeString(),
    demo: true,
    scenario: kind,
  };
}
export default function AttackSimulator({ onInject, disabled = false }) {
  const reduced = useReducedMotion();
  return (
    <section className="soc-card soc-simulator">
      <div className="soc-card-heading">
        <h2>
          <FlaskConical size={16} /> Attack simulation lab
        </h2>
        <span className="soc-badge medium">ISOLATED DEMO</span>
      </div>
      <div className="soc-simulator-controls">
        {[
          { kind: "brute", label: "Inject Brute Force", Icon: Lock },
          { kind: "voice", label: "Simulate Phishing Voice Call", Icon: Mic },
          { kind: "prompt", label: "Trigger Prompt Injection", Icon: Terminal },
        ].map(({ kind, label, Icon }) => (
          <motion.button
            key={kind}
            className={`soc-simulate ${kind}`}
            disabled={disabled}
            onClick={() => onInject(kind)}
            whileHover={reduced ? {} : { y: -2 }}
            whileTap={reduced ? {} : { scale: 0.98 }}
          >
            <Icon size={16} />
            <span>{label}</span>
            <span aria-hidden="true">↗</span>
          </motion.button>
        ))}
      </div>
      <p className="soc-muted">
        Inject synthetic events into this workspace. No attack traffic is sent.
      </p>
    </section>
  );
}
