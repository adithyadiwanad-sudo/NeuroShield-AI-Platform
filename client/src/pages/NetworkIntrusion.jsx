import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Network, Play, Upload, Download, Activity } from "lucide-react";
import PageHeader from "../enterprise/PageHeader";
import IncidentInspector from "../enterprise/IncidentInspector";
import { useSoc } from "../enterprise/SocContext";
import { endpoints } from "../enterprise/transport";
import {
  flowFields,
  flowPresets,
  presetFlow,
  sampleCsv,
  parseFlows,
} from "../enterprise/networkInputs";
export const NetworkIntrusion = () => {
  const soc = useSoc(),
    reduced = useReducedMotion(),
    request = useRef(null);
  const [mode, setMode] = useState("single"),
    [flow, setFlow] = useState(presetFlow("SYN flood"));
  const [csv, setCsv] = useState(sampleCsv()),
    [demo, setDemo] = useState(true);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [records, setRecords] = useState([]),
    [selected, setSelected] = useState(null);
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );
  const loadFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") || file.size > 65536) {
      setError("Choose a numeric CSV file up to 64 KiB.");
      return;
    }
    try {
      const text = await file.text();
      parseFlows(text);
      setCsv(text);
      setMode("csv");
      setDemo(false);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };
  const run = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      if (endpoints.error) throw new Error(endpoints.error);
      const flows =
        mode === "single"
          ? [
              Object.fromEntries(
                flowFields.map((k) => [
                  k,
                  flow[k] === "" ? NaN : Number(flow[k]),
                ]),
              ),
            ]
          : parseFlows(csv);
      if (
        flows.some((f) =>
          Object.values(f).some((v) => !Number.isFinite(v) || v < 0),
        )
      )
        throw new Error("Complete all fields with non-negative numbers.");
      const res = await fetch(`${endpoints.apiUrl}/api/scan-network`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flows, demo }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Invalid flow values. Check port, counts, and numeric bounds.",
        );
      if (controller.signal.aborted) return;
      setRecords(data.records);
      setSelected(data.records[0].incident.id);
      data.records
        .slice()
        .reverse()
        .forEach((record) => soc.add(record.incident));
    } catch (e) {
      if (request.current === controller)
        setError(
          controller.signal.aborted
            ? "Request cancelled or timed out."
            : e.message,
        );
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) setBusy(false);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([sampleCsv()], { type: "text/csv" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "neuroshield-demo-flows.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const incident =
    soc.incidents.find((i) => i.id === selected) ||
    records.find((r) => r.incident.id === selected)?.incident;
  return (
    <div className="es-page">
      <PageHeader
        eyebrow="ANALYSIS / NETWORK TELEMETRY"
        title="Network intrusion detection"
        description="Load a flow. Adjust the evidence. Investigate the result."
      >
        <button className="es-button" onClick={download}>
          <Download size={14} /> Sample CSV
        </button>
      </PageHeader>
      <div className="es-split">
        <div className="es-monitor">
          <motion.section
            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="es-panel es-tool-panel"
          >
            <div className="es-between">
              <div>
                <span className="es-eyebrow">01 / PREPARE TELEMETRY</span>
                <h2>
                  <Network size={18} /> Flow analysis console
                </h2>
              </div>
              <span className="es-badge medium">RULE ENGINE</span>
            </div>
            <p className="es-muted">
              A SYN flood example is ready. Presets fill the fields; edit any
              value, then execute. No network traffic is sent.
            </p>
            <div className="es-scenario-chips">
              {Object.keys(flowPresets).map((name) => (
                <button
                  disabled={busy}
                  className="es-button"
                  key={name}
                  onClick={() => {
                    setFlow(presetFlow(name));
                    setMode("single");
                    setDemo(true);
                    setError("");
                  }}
                >
                  {name}
                </button>
              ))}
              <button
                className="es-button"
                disabled={busy}
                onClick={() => {
                  setCsv(sampleCsv());
                  setMode("csv");
                  setDemo(true);
                  setError("");
                }}
              >
                Mixed batch sample
              </button>
            </div>
            <div className="es-tabs">
              {[
                ["single", "Editable flow"],
                ["csv", "CSV batch"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  disabled={busy}
                  aria-pressed={mode === id}
                  onClick={() => setMode(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <form onSubmit={run}>
              {mode === "single" ? (
                <div className="es-flow-grid">
                  {flowFields.map((key) => (
                    <label className="es-field" key={key}>
                      {key.replaceAll("_", " ")}
                      {key === "Flow_Duration" ? " (µs)" : ""}
                      <input
                        type="number"
                        required
                        min="0"
                        max={
                          key === "Destination_Port"
                            ? 65535
                            : key === "Flow_Bytes_s" || key === "Flow_Duration"
                              ? 1e12
                              : 1e9
                        }
                        step={
                          [
                            "Flow_Duration",
                            "Flow_Bytes_s",
                            "Flow_Packets_s",
                          ].includes(key)
                            ? "any"
                            : "1"
                        }
                        value={flow[key]}
                        disabled={busy}
                        onChange={(e) =>
                          setFlow({ ...flow, [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <>
                  <label
                    className="es-upload-zone"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!busy) void loadFile(e.dataTransfer.files[0]);
                    }}
                  >
                    <Upload size={22} />
                    <strong>Drop numeric CSV or choose a file</strong>
                    <span>Up to 100 flows / 64 KiB</span>
                    <input
                      aria-label="Upload network CSV"
                      type="file"
                      accept=".csv"
                      disabled={busy}
                      onChange={(e) => void loadFile(e.target.files[0])}
                    />
                  </label>
                  <label className="es-field">
                    Editable CSV
                    <textarea
                      rows={8}
                      value={csv}
                      disabled={busy}
                      onChange={(e) => setCsv(e.target.value)}
                      spellCheck={false}
                    />
                  </label>
                </>
              )}
              <label className="es-demo-check">
                <input
                  type="checkbox"
                  checked={demo}
                  disabled={busy}
                  onChange={(e) => setDemo(e.target.checked)}
                />{" "}
                Label input as a synthetic demonstration
              </label>
              {error && (
                <p role="alert" className="es-error">
                  {error}
                </p>
              )}
              <button
                className="es-button accent"
                disabled={busy}
                type="submit"
              >
                <Play size={15} />
                {busy ? "Analyzing flows…" : "Execute flow analysis"}
              </button>
              {busy && (
                <div className="es-scan-progress" role="status">
                  Evaluating packet rate, direction balance, flags, and byte
                  rate…
                </div>
              )}
            </form>
          </motion.section>
          <section className="es-panel es-tool-panel">
            <span className="es-eyebrow">02 / INVESTIGATION RESULTS</span>
            <h2>
              <Activity size={18} />{" "}
              {records.length
                ? `${records.length} flows analyzed`
                : "Waiting for execution"}
            </h2>
            <p className="es-muted">
              Select a result to inspect evidence and export a report from
              Actions. Scores are rule indices, not calibrated probabilities.
            </p>
            <div className="es-result-list">
              {records.map(({ incident: i }) => (
                <button
                  className={`es-history-row ${selected === i.id ? "selected" : ""}`}
                  key={i.id}
                  onClick={() => {
                    setSelected(i.id);
                    soc.select(i.id);
                  }}
                >
                  <span>
                    <strong>{i.title}</strong>
                    <small>
                      {i.source} · {i.demo ? "DEMO" : "SUBMITTED"}
                    </small>
                  </span>
                  <span className={`es-badge ${i.severity.toLowerCase()}`}>
                    {i.score}/100
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
        <IncidentInspector incident={incident} />
      </div>
    </div>
  );
};
