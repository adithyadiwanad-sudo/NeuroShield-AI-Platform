import React, { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import PageHeader from "./PageHeader";
import IncidentInspector, { Attribution } from "./IncidentInspector";
import { useSoc } from "./SocContext";
import { playbookFor } from "./domain";
export default function XaiPlaybooksPage() {
  const soc = useSoc();
  const incident =
    soc.incidents.find((i) => i.id === soc.selectedId) || soc.incidents[0];
  const [kind, setKind] = useState<"firewall" | "aws" | "jwt">("firewall"),
    [feedback, setFeedback] = useState("");
  const code = incident ? playbookFor(incident, kind) : "";
  return (
    <div className="es-page">
      <PageHeader
        eyebrow="EXPLAINABILITY / RESPONSE ENGINEERING"
        title="XAI & response playbooks"
        description="Trace the reasoning. Review the response. Keep the analyst in control."
      />
      <div className="es-split">
        <div className="es-monitor">
          <label className="es-field">
            Incident
            <select
              value={incident?.id || ""}
              onChange={(e) => {
                soc.select(e.target.value);
                setFeedback("");
              }}
            >
              {soc.incidents.map((i) => (
                <option value={i.id} key={i.id}>
                  {i.id} · {i.title}
                </option>
              ))}
            </select>
          </label>
          {incident && (
            <section className="es-panel es-result">
              <Attribution incident={incident} />
            </section>
          )}
          <section className="es-panel es-playbook">
            <div className="es-panel-heading">
              <h2>
                <Terminal size={16} /> Remediation proposal
              </h2>
              <span>REVIEW ONLY</span>
            </div>
            <div className="es-tabs">
              {(["firewall", "aws", "jwt"] as const).map((k) => (
                <button
                  key={k}
                  aria-pressed={kind === k}
                  onClick={() => {
                    setKind(k);
                    setFeedback("");
                  }}
                >
                  {k === "firewall"
                    ? "IP firewall"
                    : k === "aws"
                      ? "AWS network ACL"
                      : "JWT revocation"}
                </button>
              ))}
            </div>
            <pre tabIndex={0}>{code}</pre>
            <div className="es-between es-wrap">
              <p className="es-muted">
                Proposals are never executed by this workspace.
              </p>
              <button
                className="es-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                    setFeedback(
                      "Copied proposal. Review targets and placeholders before use.",
                    );
                  } catch {
                    setFeedback(
                      "Clipboard unavailable. Select and copy the visible proposal manually.",
                    );
                  }
                }}
              >
                <Copy size={14} /> Copy proposal
              </button>
            </div>
            <p role="status" className="es-muted">
              {feedback}
            </p>
            <div className="es-note">
              <Check size={16} />
              <p>
                IP commands accept only validated IPv4 targets. AWS templates
                require resource details; JWT revocation requires a server-side
                denylist or key policy.
              </p>
            </div>
          </section>
        </div>
        <IncidentInspector incident={incident} />
      </div>
    </div>
  );
}
