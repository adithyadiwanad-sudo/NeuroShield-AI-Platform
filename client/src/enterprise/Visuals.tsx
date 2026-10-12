import React, { useState } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import {
  Activity,
  Globe,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import type { Incident } from "./domain";

export function SurfaceRadar({ incident }: { incident?: Incident }) {
  const axes = [
    "Authentication",
    "Privilege use",
    "Asset exposure",
    "Data exfiltration",
    "Defense evasion",
    "Network access",
  ];
  const score = incident?.score ?? 45;
  const data = axes.map((axis, i) => ({
    axis,
    observed: Math.min(100, Math.max(0, score - [7, 24, 12, 4, 19, 0][i])),
    expected: 20,
    residual:
      incident?.status === "Contained" || incident?.status === "Resolved"
        ? 14
        : Math.round(score * 0.6),
  }));
  return (
    <div className="es-radar-chart">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="64%">
          <PolarGrid stroke="#64748b35" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "#8d9bb0", fontSize: 9 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            isAnimationActive={false}
            name="Observed (illustrative)"
            dataKey="observed"
            stroke="#ff6840"
            fill="#ff4500"
            fillOpacity={0.18}
          />
          <Radar
            isAnimationActive={false}
            name="Expected baseline"
            dataKey="expected"
            stroke="#64748b"
            fill="transparent"
          />
          <Radar
            isAnimationActive={false}
            name="Residual (illustrative)"
            dataKey="residual"
            stroke="#10b981"
            fill="transparent"
            strokeDasharray="3 3"
          />
          <Tooltip
            contentStyle={{
              background: "#121824",
              border: "1px solid #303c50",
              fontSize: 10,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function FindingsDonut({ incidents }: { incidents: Incident[] }) {
  const data = ["Critical", "High", "Medium", "Low", "Safe"]
    .map((name) => ({
      name,
      value: incidents.filter((i) => i.severity === name).length,
    }))
    .filter((i) => i.value);
  return (
    <div className="es-donut">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="60%"
            outerRadius="86%"
            paddingAngle={5}
            stroke="none"
          >
            {data.map((item, index) => (
              <Cell
                key={item.name}
                fill={
                  ["#ff4500", "#f59e0b", "#e63946", "#4bb0b8", "#10b981"][index]
                }
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#121824",
              border: "1px solid #303c50",
              fontSize: 10,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div>
        <strong>{incidents.length}</strong>
        <small>FINDINGS</small>
      </div>
    </div>
  );
}
export function CommandMetrics({ incidents }: { incidents: Incident[] }) {
  const active = incidents.filter(
    (i) => !["Contained", "Resolved"].includes(i.status),
  ).length;
  const resolved = incidents
    .filter((i) => i.status === "Resolved")
    .flatMap((i) => {
      const time = i.history.findLast(
        (h) => h.action === "Status → Resolved",
      )?.timestamp;
      return time ? [(Date.parse(time) - Date.parse(i.timestamp)) / 1000] : [];
    });
  const mean = resolved.length
    ? Math.round(resolved.reduce((a, b) => a + b, 0) / resolved.length)
    : null;
  const spark = incidents
    .slice(0, 12)
    .reverse()
    .map((i, index) => ({ index, value: i.score }));
  return (
    <div className="es-command-metrics">
      <div className="es-panel es-kpi">
        <div className="es-between">
          <span>MATCHED CUES</span>
          <Layers size={14} />
        </div>
        <strong>{incidents.reduce((total, item) => total + item.features.length, 0)}</strong>
        <small>Evidence cues across session findings</small>
        <div className="es-spark">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark}>
              <Area
                dataKey="value"
                stroke="#ff6840"
                fill="#ff45001a"
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="es-panel es-kpi">
        <div className="es-between">
          <span>ACTIVE INCIDENTS</span>
          <Activity size={14} />
        </div>
        <strong>{active.toString().padStart(2, "0")}</strong>
        <small>{incidents.length - active} contained or resolved</small>
        <div
          className="es-mini-ring"
          style={{
            background: `conic-gradient(var(--soc-accent) ${(active / Math.max(1, incidents.length)) * 360}deg,#263044 0deg)`,
          }}
        >
          <span />
        </div>
      </div>
      <div className="es-panel es-kpi">
        <div className="es-between">
          <span>HIGHEST RISK INDEX</span>
          <ShieldCheck size={14} />
        </div>
        <strong>{incidents.length ? Math.max(...incidents.map(i => i.score ?? 0)) : 0}<small>/100</small></strong>
        <small>Highest score across session findings</small>

      </div>
      <div className="es-panel es-kpi">
        <div className="es-between">
          <span>MEAN TIME TO RESOLVE</span>
          <Clock3 size={14} />
        </div>
        <strong>{mean == null ? "—" : `${mean}s`}</strong>
        <small>{resolved.length} resolved session records</small>
        <div className="es-mini-bars">
          {[10, 18, 12, 27, 17, 31, 22, 12, 20, 8].map((h, i) => (
            <i key={i} style={{ height: h }} />
          ))}
        </div>
      </div>
    </div>
  );
}
export function ThreatHeatmap({
  incidents,
  onSelect,
}: {
  incidents: Incident[];
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<Incident | null>(null);
  return (
    <section className="es-panel es-heatmap">
      <div className="es-panel-heading">
        <h2>
          <Layers size={15} /> Activity matrix
        </h2>
        <span>SESSION EVENTS</span>
      </div>
      <div className="es-heatmap-grid">
        {Array.from({ length: 56 }, (_, index) => {
          const incident = incidents[index];
          return incident ? (
            <button
              key={index}
              aria-label={`${incident.title}, risk ${incident.score}`}
              onMouseEnter={() => setHovered(incident)}
              onFocus={() => setHovered(incident)}
              onMouseLeave={() => setHovered(null)}
              onBlur={() => setHovered(null)}
              onClick={() => onSelect(incident.id)}
              style={{
                background: `color-mix(in srgb,var(--soc-accent) ${25 + incident.score * 0.65}%,#121824)`,
              }}
            />
          ) : (
            <span key={index} aria-hidden="true" />
          );
        })}
      </div>
      <div className="es-heatmap-preview" aria-live="polite">
        <span>
          {hovered
            ? `${hovered.id} / ${hovered.signalType}`
            : "HOVER OR FOCUS A SIGNAL"}
        </span>
        <code>
          {hovered?.payload || "Select a filled cell to inspect its evidence."}
        </code>
      </div>
      <div className="es-between es-matrix-legend">
        <span>{incidents.length} recorded events</span>
        <span>
          LOW <i /> HIGH
        </span>
      </div>
    </section>
  );
}
export function GeographicBars({ incidents }: { incidents: Incident[] }) {
  const regions = ["Asia Pacific", "Europe", "North America", "South America"];
  const counts = regions.map((region) => ({
    region,
    count: incidents.filter((i) => i.region === region && i.demo).length,
  }));
  const total = counts.reduce((n, r) => n + r.count, 0) || 1;
  return (
    <section className="es-panel es-geography">
      <div className="es-panel-heading">
        <h2>
          <Globe size={15} /> Signal distribution
        </h2>
        <span>DEMO REGIONS</span>
      </div>
      {counts.map(({ region, count }) => (
        <div className="es-region" key={region}>
          <div>
            <span>{region}</span>
            <strong>
              {Math.round((count / total) * 100)}% <ArrowUpRight size={12} />
            </strong>
          </div>
          <div className="es-region-track">
            <span style={{ width: `${(count / total) * 100}%` }} />
          </div>
        </div>
      ))}
      <p className="es-muted">
        Synthetic region labels; IP geolocation is not connected.
      </p>
    </section>
  );
}
