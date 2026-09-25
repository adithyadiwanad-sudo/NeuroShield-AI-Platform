import React from "react";
import { Terminal } from "lucide-react";
import { getWorkflowState } from "./workflow";
export default function PacketTerminal({ incident, frame }) {
  const stage = getWorkflowState(frame).step;
  const lines = incident
    ? [
        `[00.0] CAPTURE source=${incident.source} signal=${incident.signalType || "scan record"}`,
        `[02.0] VECTOR reference=${incident.demo ? "sandbox-fixture" : "unavailable"} id=${incident.id}`,
        `[04.0] SCORE risk=${incident.score ?? "unavailable"} severity=${incident.severity}`,
        `[06.0] RESPONSE mode=simulation enforcement=disabled`,
      ].slice(0, stage + 1)
    : ["[idle] Select an incident to inspect the event trace."];
  return (
    <section className="soc-card soc-terminal">
      <div className="soc-card-heading">
        <h2>
          <Terminal size={15} /> Event trace terminal
        </h2>
        <span className="soc-eyebrow">
          {incident?.demo
            ? "SYNTHETIC TRACE"
            : "RECORD SUMMARY · NO RAW PACKETS"}
        </span>
      </div>
      <pre>
        {lines.join("\n")}
        <span className="soc-caret" aria-hidden="true">
          {" "}
          ▍
        </span>
      </pre>
    </section>
  );
}
