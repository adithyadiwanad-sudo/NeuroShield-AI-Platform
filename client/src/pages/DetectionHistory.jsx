import React, { useState } from "react";
import { Download, Search, History, Database } from "lucide-react";
import PageHeader from "../enterprise/PageHeader";
import IncidentInspector from "../enterprise/IncidentInspector";
import { useSoc } from "../enterprise/SocContext";
import { csvFor, seedIncidents } from "../enterprise/domain";
export const DetectionHistory = () => {
  const soc = useSoc();
  const [query, setQuery] = useState(""),
    [severity, setSeverity] = useState("All"),
    [source, setSource] = useState("All"),
    [limit, setLimit] = useState(20);
  const filtered = soc.incidents.filter(
    (i) =>
      `${i.id} ${i.title} ${i.source}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (severity === "All" || i.severity === severity) &&
      (source === "All" || (source === "Demo" ? i.demo : !i.demo)),
  );
  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob([csvFor(filtered)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "neuroshield-detection-history.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const seed = () =>
    seedIncidents()
      .slice()
      .reverse()
      .forEach((i) => soc.add(i));
  return (
    <div className="es-page">
      <PageHeader
        eyebrow="OPERATIONS / AUDIT WORKSPACE"
        title="Detection history"
        description="Trace each finding from first signal to analyst decision."
      >
        <button className="es-button" onClick={seed}>
          <Database size={14} /> Load sample history
        </button>
        <button className="es-button" onClick={exportCsv}>
          <Download size={14} /> Export filtered CSV
        </button>
      </PageHeader>
      <div className="es-split">
        <div className="es-monitor">
          <div className="es-research-metrics">
            {[
              ["In this session", soc.incidents.length],
              [
                "Contained",
                soc.incidents.filter((i) => i.status === "Contained").length,
              ],
              ["Submitted scans", soc.incidents.filter((i) => !i.demo).length],
            ].map(([label, value]) => (
              <div className="es-panel es-tool-panel" key={label}>
                <span className="es-eyebrow">{label}</span>
                <strong className="es-big-value">{value}</strong>
              </div>
            ))}
          </div>
          <div className="es-filterbar">
            <label className="es-search">
              <Search size={15} />
              <input
                aria-label="Search detection history"
                placeholder="Search source, finding, or ID"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(20);
                }}
              />
            </label>
            <select
              aria-label="History severity"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setLimit(20);
              }}
            >
              {["All", "Critical", "High", "Medium", "Low", "Safe"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="History source"
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setLimit(20);
              }}
            >
              {["All", "Demo", "Submitted"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <section className="es-panel es-tool-panel">
            <div className="es-between">
              <h2>
                <History size={18} /> Investigation ledger
              </h2>
              <span>{filtered.length} records</span>
            </div>
            <p className="es-muted">
              Includes labeled synthetic history and your executed scans. The
              latest 100 records are retained in this browser tab session; this
              is not a permanent audit database.
            </p>
            <div className="es-result-list">
              {filtered.slice(0, limit).map((i) => (
                <button
                  className={`es-history-row ${soc.selectedId === i.id ? "selected" : ""}`}
                  onClick={() => soc.select(i.id)}
                  key={i.id}
                >
                  <span>
                    <strong>{i.title}</strong>
                    <small>
                      {i.id} · {i.demo ? "DEMO" : i.provenance.toUpperCase()} ·{" "}
                      {i.source}
                    </small>
                    <small>
                      {new Date(i.timestamp).toLocaleString()} · {i.status}
                    </small>
                  </span>
                  <span className={`es-badge ${i.severity.toLowerCase()}`}>
                    {i.score}/100 · {i.severity}
                  </span>
                </button>
              ))}
            </div>
            {!filtered.length && (
              <div className="es-empty">
                No records match. Clear the filters or load sample history.
              </div>
            )}
            {filtered.length > limit && (
              <button
                className="es-button"
                onClick={() => setLimit(limit + 20)}
              >
                Show 20 more
              </button>
            )}
          </section>
        </div>
        <IncidentInspector
          incident={soc.incidents.find((i) => i.id === soc.selectedId)}
        />
      </div>
    </div>
  );
};
