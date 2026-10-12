import { useTourAction } from "./GuidedTour";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
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
import { scanSignal } from "./transport";
import type { ScanKind } from "./transport";

const presentationScenarios = [
  {
    kind: "url" as const,
    label: "💣 Test Bank Phishing URL",
    input: "http://paypa1.example/verify-account",
  },
  {
    kind: "text" as const,
    label: "🚨 Test Urgency SMS",
    input:
      "URGENT: Your bank account will be suspended. Enter your OTP immediately at https://bank-review.example. Do not tell anyone.",
  },
  {
    kind: "audio" as const,
    label: "🎙️ Test Synthetic Vishing",
    input:
      "This is your manager. Wire the payment immediately. Keep this confidential.",
  },
];
function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Cancelled", "AbortError"));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

export default function ScamLabPage() {
  const [params] = useSearchParams();
  const soc = useSoc();
  const reduced = useReducedMotion();
  const request = useRef<AbortController | null>(null);
  const [sampleDemo, setSampleDemo] = useState(true);
  const [busy, setBusy] = useState(false),
    [handsFree, setHandsFree] = useState(false),
    [progress, setProgress] = useState("Ready for live API analysis");
  const [mode, setMode] = useState(
      params.get("mode") === "media" ? "media" : "url",
    ),
    [input, setInput] = useState(presentationScenarios[0].input),
    [result, setResult] = useState<Analysis | null>(null),
    [error, setError] = useState("");
  const cancel = () => {
    request.current?.abort();
    request.current = null;
    setHandsFree(false);
    setBusy(false);
    setProgress("Ready for live API analysis");
  };
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );
  const execute = async (
    kind: ScanKind,
    value: string,
    controller: AbortController,
    demo = false,
    guided = false,
  ) => {
    setBusy(true);
    setResult(null);
    setError("");
    setProgress("Analyzing with FastAPI…");
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await scanSignal(kind, value, controller.signal, demo);
      if (controller.signal.aborted) return;
      setResult(response.analysis);
      soc.add(response.incident);
      setProgress(`API analysis complete · ${response.incident.id}`);
    } catch (e) {
      if (request.current !== controller) return;
      setError(
        controller.signal.aborted
          ? "Analysis cancelled or timed out. Retry when the service is ready."
          : e instanceof Error
            ? e.message
            : "API analysis failed.",
      );
      setProgress("Analysis unavailable");
      if (guided) throw e;
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) setBusy(false);
    }
  };
  const run = () => {
    cancel();
    const controller = new AbortController();
    request.current = controller;
    void execute(
      mode === "audio" ? "audio" : mode === "url" ? "url" : "text",
      input,
      controller,
      sampleDemo,
    );
  };
  const scenario = async (
    index: number,
    controller: AbortController,
    autoRun = true,
  ) => {
    const item = presentationScenarios[index];
    setSampleDemo(true);
    setMode(item.kind);
    setInput("");
    setResult(null);
    setError("");
    setBusy(true);
    setProgress("Preparing demonstration input…");
    if (reduced) setInput(item.input);
    else
      for (let n = 1; n <= item.input.length; n++) {
        await delay(16, controller.signal);
        setInput(item.input.slice(0, n));
      }
    if (autoRun) await execute(item.kind, item.input, controller, true);
    else {
      setBusy(false);
      setProgress(
        "Sample ready — edit it if needed, then click Inspect signal.",
      );
    }
  };
  const trigger = (index: number) => {
    cancel();
    const controller = new AbortController();
    request.current = controller;
    void scenario(index, controller, false).catch(() => {});
  };
  const startPresentation = () => {
    if (handsFree) {
      cancel();
      return;
    }
    cancel();
    setHandsFree(true);
    const controller = new AbortController();
    request.current = controller;
    void (async () => {
      let index = 0;
      while (!controller.signal.aborted) {
        await scenario(index++ % presentationScenarios.length, controller);
        await delay(6500, controller.signal);
      }
    })().catch(() => {
      if (request.current === controller) {
        setHandsFree(false);
        setBusy(false);
      }
    });
  };
  const tourScenario = async (index: number, signal: AbortSignal) => {
    cancel();
    const controller = new AbortController();
    request.current = controller;
    const abort = () => {
      controller.abort();
      setBusy(false);
      setHandsFree(false);
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      setHandsFree(true);
      await scenario(index, controller, false);
      signal.throwIfAborted();
      const item = presentationScenarios[index];
      await execute(item.kind, item.input, controller, true, true);
    } finally {
      signal.removeEventListener("abort", abort);
      setHandsFree(false);
    }
  };
  useTourAction("tour-url", (signal: AbortSignal) => tourScenario(0, signal));
  useTourAction("tour-sms", (signal: AbortSignal) => tourScenario(1, signal));
  useTourAction("tour-voice", (signal: AbortSignal) => tourScenario(2, signal));
  const runOffline = () => {
    cancel();
    try {
      const next = mode === "url" ? analyzeUrl(input) : analyzeMessage(input);
      setResult(next);
      soc.add(analysisIncident(next));
      setError("");
      setProgress("Offline rule analysis — API was not used");
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
          <section className="es-panel es-presentation">
            <div className="es-between es-wrap">
              <div>
                <span className="es-eyebrow">
                  AUTOMATED PRESENTATION / LIVE API
                </span>
                <h2>Let the investigation unfold.</h2>
              </div>
              <button
                className="es-button accent"
                aria-pressed={handsFree}
                onClick={startPresentation}
              >
                {handsFree ? "Stop hands-free demo" : "Start hands-free demo"}
              </button>
            </div>
            <div className="es-scenario-chips">
              {presentationScenarios.map((item, index) => (
                <button
                  className="es-button"
                  key={item.kind}
                  onClick={() => trigger(index)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="es-between">
              <p role="status">{progress}</p>
              {busy && (
                <button className="es-button" onClick={cancel}>
                  Cancel
                </button>
              )}
            </div>
            <p className="es-muted">
              Chips fill editable samples. Click Inspect signal to run, or use
              hands-free mode to submit automatically. Voice fixtures use
              supplied spectral metadata, not uploaded audio classification.
            </p>
          </section>
          <div
            data-tour={
              mode === "url"
                ? "tour-url"
                : mode === "audio"
                  ? "tour-voice"
                  : "tour-sms"
            }
            className="es-panel es-lab"
          >
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
                    cancel();
                    setMode(t.id);
                    setSampleDemo(true);
                    setInput(
                      t.id === "url"
                        ? presentationScenarios[0].input
                        : t.id === "text"
                          ? presentationScenarios[1].input
                          : "",
                    );
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
                <span className="es-eyebrow">FASTAPI / LIVE ANALYSIS</span>
                <h2>
                  {mode === "audio"
                    ? "Synthetic voice scenario"
                    : mode === "url"
                      ? "Where does this link really lead?"
                      : "Read between the lines."}
                </h2>
                <p className="es-muted">
                  {mode === "url"
                    ? "Check URL cues and public-host reachability with a bounded HTTP header request."
                    : "Find urgency, coercion, payment requests, and credential-seeking phrases."}
                </p>
                {mode !== "audio" && <div className="es-quick-examples">
                  <strong>Quick Demo Examples</strong>
                  <p className="es-muted">Choose an example, edit it, then click Inspect signal.</p>
                  <div className="es-scenario-chips">{(mode === "url" ? [
                    ["Ordinary URL", "https://google.com"],
                    ["Check availability", "https://kirankumard.com"],
                    ["Media mirror cues", "https://5movierulz.academy"],
                    ["Credential lure", "http://verify-bank-account-update.center"],
                  ] : [
                    ["Greeting", "Good morning prabhat, how are you today?"],
                    ["Smishing Scam", "URGENT: Your bank account is locked. Click http://bit.ly/bank-renew to verify your OTP immediately or face penalty."],
                    ["Job scam", "Congratulations! You are selected for a part-time job earning Rs 5000/day. Telegram @job_admin now."],
                  ]).map(([label, value]) => <button type="button" className="es-button" key={label} disabled={busy || handsFree} onClick={() => {
                    setInput(value); setResult(null); setError(""); setSampleDemo(mode !== "url");
                    setProgress("Example ready — edit it or click Inspect signal.");
                  }}>{label}</button>)}</div>
                </div>}
                <label className="es-field">
                  {mode === "audio"
                    ? "Synthetic transcript (spectral fixture supplied automatically)"
                    : mode === "url"
                      ? "URL to inspect"
                      : "Message to inspect"}
                  <textarea
                    rows={mode === "url" ? 3 : 7}
                    maxLength={mode === "url" ? 2048 : 12000}
                    value={input}
                    disabled={busy || handsFree}
                    onChange={(e) => { setInput(e.target.value); setResult(null); }}
                    placeholder={
                      mode === "url"
                        ? "https://example.com/account"
                        : "Paste a suspicious SMS, email, or transcript…"
                    }
                  />
                </label>
                <div className="es-between es-wrap">
                  <button
                    className="es-button accent"
                    type="submit"
                    disabled={busy || handsFree}
                  >
                    <ScanLine size={15} /> Inspect signal{" "}
                    <ArrowRight size={14} />
                  </button>
                </div>
                {mode !== "audio" && (
                  <button
                    className="es-button"
                    type="button"
                    disabled={busy || handsFree}
                    onClick={runOffline}
                  >
                    Use offline rules instead
                  </button>
                )}
                <label className="es-demo-check">
                  <input
                    type="checkbox"
                    checked={sampleDemo}
                    disabled={busy || handsFree || mode === "audio"}
                    onChange={(e) => setSampleDemo(e.target.checked)}
                  />
                  Label input as a synthetic demonstration
                </label>
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
                <span>OBSERVED EVIDENCE / REVIEW REQUIRED</span>
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
