import React, { useState } from "react";
import {
  ScanLine,
  Link2,
  MessageSquare,
  AudioLines,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";
import PageHeader from "./PageHeader";
import IncidentInspector from "./IncidentInspector";
import MultiModalScanner from "../components/dashboard/MultiModalScanner";
import { analyzeMessage, analyzeUrl, analysisIncident } from "./analysis";
import type { Analysis } from "./analysis";
import { useSoc } from "./SocContext";

export default function ScamLabPage() {
  const soc = useSoc();
  const [mode, setMode] = useState("url"),
    [input, setInput] = useState(""),
    [result, setResult] = useState<Analysis | null>(null),
    [error, setError] = useState("");
  const run = () => {
    try {
      const next = mode === "url" ? analyzeUrl(input) : analyzeMessage(input);
      setResult(next);
      soc.add(analysisIncident(next));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Inspection failed.");
    }
  };
  return (
    <div className="es-page">
      <PageHeader
        eyebrow="INTELLIGENCE / MULTI-MODAL ANALYSIS"
        title="Scam intelligence lab"
        description="Inspect the link. Unpack the language. Examine the signal."
      />
      <div className="es-split">
        <div className="es-monitor">
          <div className="es-panel es-lab">
            <div className="es-tabs">
              {[
                { id: "url", label: "URL intelligence", icon: Link2 },
                { id: "text", label: "Message analysis", icon: MessageSquare },
                { id: "media", label: "Voice & visual", icon: AudioLines },
              ].map((t) => (
                <button
                  key={t.id}
                  aria-pressed={mode === t.id}
                  onClick={() => {
                    setMode(t.id);
                    setInput("");
                    setResult(null);
                    setError("");
                  }}
                >
                  <t.icon size={16} />
                  {t.label}
                </button>
              ))}
            </div>
            {mode === "media" ? (
              <div className="es-lab-content">
                <MultiModalScanner />
                <p className="es-muted">
                  Audio descriptors are measured locally. Synthetic-voice
                  likelihood and transcription require a trained service and are
                  not inferred from waveform shape.
                </p>
              </div>
            ) : (
              <form
                className="es-lab-content"
                onSubmit={(e) => {
                  e.preventDefault();
                  run();
                }}
              >
                <span className="es-eyebrow">
                  LOCAL / TRANSPARENT HEURISTICS
                </span>
                <h2>
                  {mode === "url"
                    ? "Where does this link really lead?"
                    : "Read between the lines."}
                </h2>
                <p className="es-muted">
                  {mode === "url"
                    ? "Check hostname structure and brand resemblance without visiting the destination."
                    : "Find urgency, coercion, payment requests, and credential-seeking phrases."}
                </p>
                <label className="es-field">
                  {mode === "url" ? "URL to inspect" : "Message to inspect"}
                  <textarea
                    rows={mode === "url" ? 3 : 7}
                    maxLength={mode === "url" ? 2048 : 12000}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      mode === "url"
                        ? "https://example.com/account"
                        : "Paste a suspicious SMS, email, or transcript…"
                    }
                  />
                </label>
                <div className="es-between es-wrap">
                  <div className="es-samples">
                    <span>TRY A SAMPLE</span>
                    <button
                      type="button"
                      onClick={() =>
                        setInput(
                          mode === "url"
                            ? "http://paypa1.example/verify-account"
                            : "URGENT: Your bank account will be suspended. Enter your OTP immediately at https://example.com/verify. Do not tell anyone.",
                        )
                      }
                    >
                      Suspicious
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setInput(
                          mode === "url"
                            ? "https://www.paypal.com/"
                            : "Your appointment is confirmed for Monday at 10 AM. Never share your OTP or password.",
                        )
                      }
                    >
                      Routine
                    </button>
                  </div>
                  <button className="es-button accent" type="submit">
                    <ScanLine size={15} /> Inspect signal{" "}
                    <ArrowRight size={14} />
                  </button>
                </div>
                {error && (
                  <p className="es-error" role="alert">
                    {error}
                  </p>
                )}
              </form>
            )}
          </div>
          {result && (
            <section className="es-panel es-result">
              <div className="es-panel-heading">
                <h2>Inspection evidence</h2>
                <span>RULE-BASED / NOT ML CONFIDENCE</span>
              </div>
              <div className="es-result-grid">
                <div>
                  <h3>{result.title}</h3>
                  <p>{result.explanation}</p>
                  <div className="es-phrase-list">
                    {result.phrases.map((p) => (
                      <mark key={p}>{p}</mark>
                    ))}
                  </div>
                </div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={result.axes} outerRadius="66%">
                      <PolarGrid stroke="#344154" />
                      <PolarAngleAxis
                        dataKey="axis"
                        tick={{ fill: "#98a7bb", fontSize: 10 }}
                      />
                      <Radar
                        dataKey="value"
                        stroke="#ff6840"
                        fill="#ff4500"
                        fillOpacity={0.2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <dl className="es-checks">
                {result.checks.map((c) => (
                  <div key={c.label}>
                    <dt>{c.label}</dt>
                    <dd>{c.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <div className="es-note">
            <ScanLine size={20} />
            <div>
              <strong>Evidence before certainty.</strong>
              <p>
                Rule scores help prioritize review. They do not establish that a
                sender, link, or file is safe or malicious. Results are added to
                the shared incident workspace.
              </p>
            </div>
          </div>
        </div>
        <IncidentInspector
          incident={soc.incidents.find((i) => i.id === soc.selectedId)}
        />
      </div>
    </div>
  );
}
