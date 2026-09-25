import React, { useState } from "react";
import { Terminal, Search, ChevronRight } from "lucide-react";

export default function LiveThreatStream({
  incidents,
  selectedId,
  onSelect,
  statuses,
}) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("All");
  const filtered = incidents.filter(
    (i) =>
      `${i.id} ${i.title} ${i.source}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (severity === "All" || i.severity === severity),
  );
  return (
    <section className="soc-card soc-feed">
      <div className="soc-card-heading">
        <h2>
          <Terminal size={16} /> Live event stream{" "}
          <span className="soc-count">{incidents.length}</span>
        </h2>
        <span className="soc-eyebrow">SELECT TO INVESTIGATE</span>
      </div>
      <div className="soc-feed-tools">
        <label className="soc-search">
          <Search size={14} />
          <input
            aria-label="Search events"
            placeholder="Search event, source, or incident ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          {["All", "Critical", "High", "Medium", "Low", "Safe", "Unknown"].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
      </div>
      <div className="soc-log-header">
        <span>SEVERITY / EVENT</span>
        <span>SOURCE</span>
        <span>STATUS</span>
      </div>
      <div className="soc-log-list">
        {filtered.map((i) => (
          <button
            key={i.id}
            className={`soc-log ${selectedId === i.id ? "selected" : ""}`}
            onClick={() => onSelect(i)}
            aria-pressed={selectedId === i.id}
          >
            <span>
              <span className={`soc-badge ${i.severity.toLowerCase()}`}>
                {i.severity}
              </span>
              <strong>{i.title}</strong>
              <small>
                {i.id} · {i.time}
              </small>
              <span className="soc-inline-risk">
                {i.score != null && (
                  <meter
                    min="0"
                    max="100"
                    low="40"
                    high="75"
                    optimum="0"
                    value={i.score ?? 0}
                    aria-label={`${i.title} risk score`}
                  />
                )}
                {i.score == null ? "Risk unavailable" : `${i.score}/100 risk`}
              </span>
            </span>
            <code>{i.source}</code>
            <span className="soc-log-status">
              {statuses[i.id] || "Review"}
              <ChevronRight size={14} />
            </span>
          </button>
        ))}
        {!filtered.length && (
          <p className="soc-empty">No events match this view.</p>
        )}
      </div>
    </section>
  );
}
