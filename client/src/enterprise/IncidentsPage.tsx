import React, { useState } from "react";
import { LayoutGrid, List, Download, Search, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { useSoc } from "./SocContext";
import { statuses, csvFor } from "./domain";
import type { Incident, IncidentStatus } from "./domain";
import PageHeader from "./PageHeader";
import IncidentInspector from "./IncidentInspector";

export default function IncidentsPage() {
  const soc = useSoc();
  const [view, setView] = useState("board"),
    [query, setQuery] = useState(""),
    [severity, setSeverity] = useState("All");
  const filtered = soc.incidents.filter(
    (i) =>
      `${i.title} ${i.id} ${i.source}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (severity === "All" || i.severity === severity),
  );
  const incident = soc.incidents.find((i) => i.id === soc.selectedId);
  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob([csvFor(filtered)], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "neuroshield-findings.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const card = (i: Incident) => (
    <div
      key={i.id}
      className={`es-incident-card ${i.id === soc.selectedId ? "selected" : ""}`}
      draggable
      onDragStart={(e) => {
        const event = e;
        event.dataTransfer.setData("text/plain", i.id);
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <button
        onClick={() => soc.select(i.id)}
        aria-label={`Inspect ${i.title}`}
      >
        <div className="es-between">
          <span className={`es-badge ${i.severity.toLowerCase()}`}>
            {i.severity}
          </span>
          <small>{i.score}/100</small>
        </div>
        <h3>{i.title}</h3>
        <code>{i.source}</code>
        <footer>
          <span>{i.id}</span>
          <ArrowUpRight size={12} />
        </footer>
      </button>
      <label className="es-status-control">
        Move to
        <select
          aria-label={`Status for ${i.id}`}
          value={i.status}
          onChange={(e) =>
            soc.setStatus(i.id, e.target.value as IncidentStatus)
          }
        >
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
    </div>
  );
  return (
    <div className="es-page">
      <PageHeader
        eyebrow="OPERATIONS / INCIDENT MANAGEMENT"
        title="Incidents & findings"
        description="One investigation record. Every signal, decision, and response."
      >
        <button className="es-button" onClick={exportCsv}>
          <Download size={14} /> Export filtered CSV
        </button>
      </PageHeader>
      <div className="es-split">
        <section className="es-monitor">
          <div className="es-filterbar">
            <label className="es-search">
              <Search size={15} />
              <input
                placeholder="Search incident, source, or ID"
                aria-label="Search incidents"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Incident severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              {["All", "Critical", "High", "Medium", "Low", "Safe"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <div className="es-toggle">
              <button
                aria-label="Kanban view"
                aria-pressed={view === "board"}
                onClick={() => setView("board")}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                aria-label="List view"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <List size={15} />
              </button>
            </div>
          </div>
          <p className="es-muted">
            {filtered.length} findings · Drag cards between columns, or use each
            card’s status selector.
          </p>
          {view === "board" ? (
            <div className="es-kanban">
              {statuses.map((status) => (
                <section
                  key={status}
                  aria-label={`${status} incidents`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    if (soc.incidents.some((i) => i.id === id))
                      soc.setStatus(id, status);
                  }}
                >
                  <header>
                    <span
                      className={`es-status-dot ${status.toLowerCase().replaceAll(" ", "-")}`}
                    />
                    <h2>{status}</h2>
                    <span>
                      {filtered.filter((i) => i.status === status).length}
                    </span>
                  </header>
                  {filtered.filter((i) => i.status === status).map(card)}
                  {!filtered.some((i) => i.status === status) && (
                    <div className="es-drop-empty">No findings</div>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <div className="es-list-view">{filtered.map(card)}</div>
          )}
          {!filtered.length && (
            <div className="es-empty">No findings match these filters.</div>
          )}
        </section>
        <IncidentInspector incident={incident} surface />
      </div>
    </div>
  );
}
