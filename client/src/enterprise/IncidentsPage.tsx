import React, { useState } from "react";
import {
  LayoutGrid,
  List,
  Download,
  Search,
  ArrowUpRight,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSoc } from "./SocContext";
import { statuses, csvFor } from "./domain";
import type { Incident, IncidentStatus } from "./domain";
import PageHeader from "./PageHeader";
import IncidentInspector from "./IncidentInspector";
import { filterFindings, paginateFindings } from "./findings";

export default function IncidentsPage() {
  const soc = useSoc();
  const [view, setView] = useState("list"),
    [query, setQuery] = useState(""),
    [severity, setSeverity] = useState("All"),
    [status, setStatus] = useState("All"),
    [page, setPage] = useState(1);
  const filtered = filterFindings(soc.incidents, query, severity, status);
  const paging = paginateFindings(filtered, page, 12);
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
  const reset = () => {
    setQuery("");
    setSeverity("All");
    setStatus("All");
    setPage(1);
  };
  const card = (i: Incident) => (
    <article
      key={i.id}
      className={`es-incident-card ${i.id === soc.selectedId ? "selected" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", i.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <button
        type="button"
        onClick={() => soc.select(i.id)}
        aria-pressed={i.id === soc.selectedId}
      >
        <div className="es-between">
          <span className={`es-badge ${i.severity.toLowerCase()}`}>
            {i.severity}
          </span>
          <strong className="es-finding-score">
            {i.score}
            <small>/100</small>
          </strong>
        </div>
        <h3>{i.title}</h3>
        <code>{i.source}</code>
        <div className="es-finding-meta">
          <span>{i.status}</span>
          <span>{i.demo ? "DEMO" : i.provenance.toUpperCase()}</span>
          <time dateTime={i.timestamp}>
            {new Date(i.timestamp).toLocaleTimeString()}
          </time>
        </div>
        <footer>
          <span>{i.id}</span>
          <span>
            Inspect <ArrowUpRight size={12} />
          </span>
        </footer>
      </button>
    </article>
  );
  return (
    <div className="es-page es-findings-page">
      <PageHeader
        eyebrow="OPERATIONS / INCIDENT MANAGEMENT"
        title="Incidents & findings"
        description="One investigation record. Every signal, decision, and response."
      >
        <button
          className="es-button"
          onClick={() => soc.setStreaming(!soc.streaming)}
        >
          {soc.streaming ? <Pause size={14} /> : <Play size={14} />}{" "}
          {soc.streaming ? "Pause incoming feed" : "Resume incoming feed"}
        </button>
        <button
          className="es-button"
          onClick={exportCsv}
          disabled={!filtered.length}
        >
          <Download size={14} /> Export filtered CSV
        </button>
      </PageHeader>
      <div
        className="es-findings-summary"
        aria-label="Filter findings by status"
      >
        {["All", ...statuses].map((s) => (
          <button
            key={s}
            aria-pressed={status === s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            <span>{s === "All" ? "All findings" : s}</span>
            <strong>
              {s === "All"
                ? soc.incidents.length
                : soc.incidents.filter((i) => i.status === s).length}
            </strong>
          </button>
        ))}
      </div>
      <div className="es-split">
        <section className="es-monitor">
          <div className="es-filterbar">
            <label className="es-search">
              <Search size={15} />
              <input
                placeholder="Search incident, source, or ID"
                aria-label="Search incidents"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <select
              aria-label="Incident severity"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
            >
              {["All", "Critical", "High", "Medium", "Low", "Safe"].map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All severities" : s}
                </option>
              ))}
            </select>
            <div className="es-toggle">
              <button
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <List size={15} /> List
              </button>
              <button
                aria-pressed={view === "board"}
                onClick={() => setView("board")}
              >
                <LayoutGrid size={15} /> Board
              </button>
            </div>
          </div>
          <div className="es-between es-wrap">
            <p className="es-muted">
              {filtered.length} matching findings · Feed {soc.feedStatus}.
              Select a card to inspect and change its status.
            </p>
            {(query || severity !== "All" || status !== "All") && (
              <button className="es-button" onClick={reset}>
                Clear filters
              </button>
            )}
          </div>
          {incident && (
            <section className="es-panel es-finding-selection">
              <div>
                <span className="es-eyebrow">SELECTED INVESTIGATION</span>
                <strong>{incident.title}</strong>
                <code>{incident.id}</code>
              </div>
              <label className="es-field">
                Move selected finding
                <select
                  aria-label="Selected finding status"
                  value={incident.status}
                  onChange={(e) =>
                    soc.setStatus(incident.id, e.target.value as IncidentStatus)
                  }
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </section>
          )}
          {view === "list" ? (
            <>
              <div className="es-findings-list">{paging.items.map(card)}</div>
              {filtered.length > 0 && (
                <nav
                  className="es-findings-pagination"
                  aria-label="Findings pages"
                >
                  <button
                    className="es-button"
                    disabled={paging.page === 1}
                    onClick={() => setPage(paging.page - 1)}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span>
                    Page {paging.page} of {paging.pages} · {paging.start}–
                    {paging.end} of {filtered.length}
                  </span>
                  <button
                    className="es-button"
                    disabled={paging.page === paging.pages}
                    onClick={() => setPage(paging.page + 1)}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </nav>
              )}
            </>
          ) : (
            <>
              <p className="es-muted">
                Scroll across all five lanes. Each lane scrolls independently.
                Drag a card to another lane, or select it and use the status
                control above.
              </p>
              <div
                className="es-kanban"
                tabIndex={0}
                aria-label="Scrollable findings board"
              >
                {statuses.map((s) => (
                  <section
                    key={s}
                    aria-label={`${s} incidents`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData("text/plain");
                      if (soc.incidents.some((i) => i.id === id)) {
                        soc.select(id);
                        soc.setStatus(id, s);
                      }
                    }}
                  >
                    <header>
                      <span
                        className={`es-status-dot ${s.toLowerCase().replaceAll(" ", "-")}`}
                      />
                      <h2>{s}</h2>
                      <span>
                        {filtered.filter((i) => i.status === s).length}
                      </span>
                    </header>
                    <div className="es-kanban-cards">
                      {filtered.filter((i) => i.status === s).map(card)}
                      {!filtered.some((i) => i.status === s) && (
                        <div className="es-drop-empty">
                          No {s.toLowerCase()} findings
                        </div>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
          {!filtered.length && (
            <div className="es-panel es-empty">
              <h3>No findings match these filters</h3>
              <p>
                Choose another status or clear the filters to see the full
                workspace.
              </p>
              <button className="es-button" onClick={reset}>
                Show all findings
              </button>
            </div>
          )}
        </section>
        <IncidentInspector incident={incident} surface />
      </div>
    </div>
  );
}
