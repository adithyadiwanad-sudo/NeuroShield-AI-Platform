import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Cpu,
  Globe,
  ShieldAlert,
  Zap,
  RefreshCw,
  ArrowUpRight,
  X,
  BrainCircuit,
  BarChart3,
  Monitor,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import api from "../services/api";
import { useSoc } from "../enterprise/SocContext";
import {
  CommandMetrics,
  ThreatHeatmap,
  GeographicBars,
} from "../enterprise/Visuals";
import { Attribution } from "../enterprise/IncidentInspector";
import DashboardLayout from "../components/layout/DashboardLayout";
import LiveThreatStream from "../components/dashboard/LiveThreatStream";
import AgentWorkflowTab from "../components/dashboard/right_panel/AgentWorkflowTab";
import XAIInspector from "../components/dashboard/right_panel/XAIInspector";
import ModelAnalyticsTab from "../components/dashboard/right_panel/ModelAnalyticsTab";
import AttackSimulator, {
  createSimulatedIncident,
} from "../components/dashboard/AttackSimulator";
import TimeTravelDebugger from "../components/dashboard/TimeTravelDebugger";
import MultiModalScanner from "../components/dashboard/MultiModalScanner";
import PacketTerminal from "../components/dashboard/PacketTerminal";
import { FRAME_MS, LAST_FRAME } from "../components/dashboard/workflow";
import ThreatInspectorTab, {
  ActionSuite,
  RiskGauge,
} from "../components/dashboard/right_panel/ThreatInspectorTab";
import {
  demoIncidents,
  demoTrend,
  normalizeScan,
} from "../components/dashboard/telemetry";
const ThreatGlobe = lazy(() => import("../components/dashboard/ThreatGlobe"));
const tabs = [
  { id: "details", label: "Details", icon: ShieldAlert },
  { id: "xai", label: "XAI Feature Attribution", icon: BrainCircuit },
  { id: "actions", label: "Actions", icon: Zap },
  { id: "stats", label: "Model Stats", icon: BarChart3 },
];

export const Dashboard = () => {
  const soc = useSoc();
  const [data, setData] = useState(null);
  const [demo, setDemo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liveSelectedId, setLiveSelectedId] = useState(null);
  const selectedId = demo ? soc.selectedId : liveSelectedId;
  const setSelectedId = demo ? soc.select : setLiveSelectedId;
  const [tab, setTab] = useState("details");
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState("soc");
  const [liveHistory, setHistory] = useState({});
  const [liveStatuses, setStatuses] = useState({});
  const history = demo
    ? Object.fromEntries(soc.incidents.map((i) => [i.id, i.history]))
    : liveHistory;
  const statuses = demo
    ? Object.fromEntries(
        soc.incidents.map((i) => [
          i.id,
          i.history.findLast((h) => h.action.includes("simulated"))?.action ||
            i.status,
        ]),
      )
    : liveStatuses;
  const controller = useRef();
  const knownIds = useRef(null);
  const demoRef = useRef(true);
  useEffect(() => {
    setFrame(0);
    setPlaying(Boolean(selectedId));
  }, [selectedId, demo]);
  useEffect(() => {
    if (!playing || !selectedId) return;
    const timer = setInterval(
      () => setFrame((current) => Math.min(LAST_FRAME, current + 1)),
      FRAME_MS,
    );
    return () => clearInterval(timer);
  }, [playing, selectedId]);
  useEffect(() => {
    if (frame === LAST_FRAME) setPlaying(false);
  }, [frame]);
  useEffect(() => {
    const shortcut = (event) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.code === "KeyL" &&
        !event.repeat &&
        !event.target.closest('input,textarea,select,[contenteditable="true"]')
      ) {
        event.preventDefault();
        setMode((current) => (current === "soc" ? "executive" : "soc"));
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const fetchTelemetry = async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    try {
      const res = await api.get("/dashboard/analytics", {
        signal: request.signal,
        timeout: 10000,
      });
      if (!res.data.success) throw new Error("Unavailable");
      setData(res.data);
      setError("");
      const scans = (res.data.recentScans || []).map(normalizeScan);
      const fresh = scans.find((i) => !knownIds.current?.has(i.id));
      if (!demoRef.current && fresh) {
        setLiveSelectedId(fresh.id);
        setTab("details");
      }
      knownIds.current = new Set(scans.map((i) => i.id));
    } catch (err) {
      if (!request.signal.aborted)
        setError(
          "Telemetry connection unavailable. Retry or explore the demo.",
        );
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  };
  useEffect(() => {
    fetchTelemetry();
    const timer = setInterval(fetchTelemetry, 30000);
    return () => {
      clearInterval(timer);
      controller.current?.abort();
    };
  }, []);
  const incidents = demo
    ? soc.incidents
    : (data?.recentScans || []).map(normalizeScan);
  const incident = incidents.find((i) => i.id === selectedId);
  const trend = demo
    ? incident
      ? demoTrend.slice(
          0,
          Math.max(2, Math.ceil(((frame + 1) / 81) * demoTrend.length)),
        )
      : demoTrend
    : data?.charts?.detectionTrend || [];
  const metrics = demo
    ? {
        totalNetworkFlows: 24816,
        normalFlows: 23942,
        maliciousFlows: 874,
        highCriticalAlerts: 3,
      }
    : data?.metrics;
  const risk = metrics?.totalNetworkFlows
    ? Math.round((metrics.maliciousFlows / metrics.totalNetworkFlows) * 100)
    : null;
  const select = (i) => {
    setSelectedId(i.id);
    setTab("details");
  };
  const toggleDemo = () => {
    const next = !demo;
    demoRef.current = next;
    setDemo(next);
    if (next && !soc.selectedId) soc.select(soc.incidents[0]?.id || null);
    if (!next) setLiveSelectedId(null);
    setTab("details");
    setStatuses({});
  };
  const action = (status) => {
    if (demo) {
      soc.recordAction(incident.id, status);
      return;
    }
    setStatuses((previous) => ({ ...previous, [incident.id]: status }));
    setHistory((previous) => ({
      ...previous,
      [incident.id]: [
        ...(previous[incident.id] || []),
        { action: status, timestamp: new Date().toISOString() },
      ],
    }));
  };
  const inject = (kind) => {
    soc.inject(kind);
    demoRef.current = true;
    setDemo(true);
    setTab("details");
    setMode("soc");
  };
  const seek = (value) => {
    setPlaying(false);
    setFrame(Math.max(0, Math.min(LAST_FRAME, value)));
  };
  const togglePlayback = () => {
    if (frame === LAST_FRAME) setFrame(0);
    setPlaying((value) => !value);
  };

  const header = (
    <>
      <header className="soc-header">
        <div>
          <div className="soc-eyebrow">
            SECURITY OPERATIONS / COMMAND CENTER
          </div>
          <h1>
            Cyber-SOC command<span className="soc-title-dot">.</span>
          </h1>
          <p>Neural intelligence. Human control. Complete visibility.</p>
        </div>
        <div className="soc-header-actions">
          <button
            className="soc-button compact soc-mode-switch"
            onClick={() =>
              setMode((value) => (value === "soc" ? "executive" : "soc"))
            }
            aria-pressed={mode === "executive"}
            aria-keyshortcuts="Meta+Shift+L Control+Shift+L"
            title="Toggle Executive / Deep SOC · Cmd or Ctrl + Shift + L"
          >
            <Monitor size={14} />
            {mode === "soc" ? "Deep SOC Mode" : "Executive Mode"}
          </button>
          <span
            className={`soc-connection ${demo ? "warning" : error ? "offline" : ""}`}
          >
            <i className="soc-dot" />
            {demo
              ? "DEMO TELEMETRY"
              : loading
                ? "CONNECTING"
                : error
                  ? "DISCONNECTED"
                  : "SYNCED · 30s POLLING"}
          </span>
          <button
            className="soc-button compact"
            onClick={fetchTelemetry}
            disabled={loading}
            aria-label="Refresh telemetry"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <Link className="soc-button compact" to="/intrusion">
            New scan <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <div className="soc-data-notice">
        <span>
          {demo
            ? "Local workspace · synthetic scenarios and labeled heuristic checks. Topology and response execution are illustrative."
            : error ||
              "Analytics scan records · node positions are illustrative, not geolocated."}
        </span>
        <button onClick={toggleDemo}>
          {demo ? "Return to telemetry" : "Explore demo"}
        </button>
      </div>
    </>
  );

  const monitoring = (
    <>
      {demo ? (
        <CommandMetrics incidents={soc.incidents} />
      ) : (
        <div className="soc-metrics">
          <div className="soc-card soc-global-risk">
            <RiskGauge score={risk} label="FLAGGED %" />
            <div>
              <span className="soc-eyebrow">GLOBAL RISK</span>
              <strong>
                {risk == null
                  ? "Awaiting data"
                  : risk > 20
                    ? "Elevated"
                    : "Monitoring"}
              </strong>
              <small>Share of flagged flows</small>
            </div>
          </div>
          {[
            {
              name: "ANALYZED FLOWS",
              value: metrics?.totalNetworkFlows,
              icon: Activity,
              color: "cyan",
            },
            {
              name: "FLAGGED FLOWS",
              value: metrics?.maliciousFlows,
              icon: ShieldAlert,
              color: "red",
            },
            {
              name: "HIGH / CRITICAL",
              value: metrics?.highCriticalAlerts,
              icon: Zap,
              color: "amber",
            },
          ].map((m) => (
            <div className="soc-card soc-metric" key={m.name}>
              <span className="soc-eyebrow">
                {m.name}
                <m.icon size={15} className={`soc-${m.color}`} />
              </span>
              <strong>{m.value?.toLocaleString() ?? "—"}</strong>
              <small>
                {demo ? "Illustrative snapshot" : "Recorded analytics"}
              </small>
            </div>
          ))}
        </div>
      )}
      <section className="soc-card soc-radar">
        <div className="soc-card-heading">
          <h2>
            <Globe size={16} /> Global threat radar
          </h2>
          <span className="soc-eyebrow">SPATIAL SIGNAL VIEW</span>
        </div>
        <div className="soc-radar-body">
          <div className="soc-radar-caption">
            <span className="soc-eyebrow">NEURAL PERIMETER</span>
            <h3>
              Visibility without
              <br />
              blind spots.
            </h3>
            <p>
              Select a signal on the globe
              <br />
              to trace its investigation.
            </p>
            <div className="soc-legend">
              <span>
                <i className="soc-dot red" /> Critical signal
              </span>
              <span>
                <i className="soc-dot amber" /> Other signal
              </span>
            </div>
          </div>
          <div
            className="soc-globe"
            aria-label="Interactive 3D signal globe; the same signals are available in the event stream"
          >
            <Suspense
              fallback={<p className="soc-empty">Initializing radar…</p>}
            >
              <ThreatGlobe
                incidents={incidents}
                selectedId={selectedId}
                onSelect={select}
                frame={frame}
                playing={playing}
              />
            </Suspense>
          </div>
          <div className="soc-radar-coordinates">
            ILLUSTRATIVE TOPOLOGY <span>{incidents.length} SIGNALS</span>
          </div>
        </div>
      </section>
      <section className="soc-card soc-chart">
        <div className="soc-card-heading">
          <h2>
            <Activity size={16} /> Network anomaly analysis
          </h2>
          <div className="soc-chart-legend">
            <span className="soc-cyan">● Baseline / safe</span>
            <span className="soc-red">● Flagged</span>
          </div>
        </div>
        <div className="soc-chart-body">
          {trend.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend}
                margin={{ top: 10, right: 16, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="socThreatFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#FF007F" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#FF007F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff08" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#738198", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={35}
                />
                <YAxis
                  tick={{ fill: "#738198", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0F172A",
                    border: "1px solid #263348",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="safe"
                  stroke="#00F0FF"
                  fill="transparent"
                  strokeWidth={1.8}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="threats"
                  stroke="#FF007F"
                  fill="url(#socThreatFill)"
                  strokeWidth={1.8}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="soc-empty">
              {loading
                ? "Connecting to telemetry…"
                : "No trend data. Run a scan or explore the demo."}
            </p>
          )}
        </div>
      </section>
      {demo && (
        <div className="es-secondary-charts">
          <ThreatHeatmap
            incidents={soc.incidents}
            onSelect={(id) => select({ id })}
          />
          <GeographicBars incidents={soc.incidents} />
        </div>
      )}
      {demo && (
        <div className="es-between">
          <span className="es-eyebrow">
            SHARED INCIDENT FEED / {soc.incidents.length} RECORDS
          </span>
          <button
            className="es-button"
            aria-pressed={soc.streaming}
            onClick={() => soc.setStreaming(!soc.streaming)}
          >
            {soc.streaming ? "Pause demo stream" : "Start demo stream"}
          </button>
        </div>
      )}
      <LiveThreatStream
        incidents={incidents}
        selectedId={selectedId}
        onSelect={select}
        statuses={statuses}
      />
      <TimeTravelDebugger
        frame={frame}
        playing={playing}
        onSeek={seek}
        onToggle={togglePlayback}
        incident={incident}
      />
      {mode === "soc" && (
        <>
          <AttackSimulator onInject={inject} />
          <PacketTerminal incident={incident} frame={frame} />
          <MultiModalScanner />
        </>
      )}
      {mode === "executive" && (
        <section className="soc-card soc-executive-summary">
          <h2>Executive risk briefing</h2>
          <p>
            {incidents.length} visible records ·{" "}
            {
              incidents.filter(
                (i) => i.severity === "Critical" || i.severity === "High",
              ).length
            }{" "}
            high-priority records · {Object.keys(statuses).length} simulated
            responses.
          </p>
          <p className="soc-muted">
            {demo ? "Synthetic presentation workspace." : "Analytics snapshot."}{" "}
            Select a record for its explanation and response options. Switch to
            Deep SOC for the simulation lab, signal scanner, and event trace.
          </p>
        </section>
      )}
    </>
  );

  const inspector = (
    <>
      <div className="soc-inspector-heading">
        <div>
          <span className="soc-eyebrow">INTELLIGENCE WORKSPACE</span>
          <h2>
            <Cpu size={18} /> AI investigation
          </h2>
        </div>
        <span className="soc-agent-chip">AGENT 01</span>
      </div>
      <div className="soc-tabs" role="tablist" aria-label="Investigation tabs">
        {tabs.map((t, index) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => {
              if (e.ctrlKey || e.metaKey || e.altKey) return;
              if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? tabs.length - 1
                      : (index +
                          (e.key === "ArrowRight" ? 1 : tabs.length - 1)) %
                        tabs.length;
                setTab(tabs[next].id);
                document.getElementById(`tab-${tabs[next].id}`)?.focus();
              }
            }}
          >
            <t.icon size={15} />
            <span>{t.label}</span>
            {tab === t.id && (
              <motion.div
                layoutId="soc-tab-indicator"
                className="soc-tab-indicator"
              />
            )}
          </button>
        ))}
      </div>
      <div className="soc-selected">
        <div>
          <span className="soc-eyebrow">ACTIVE INCIDENT</span>
          <strong>{incident ? incident.id : "No incident selected"}</strong>
        </div>
        {incident && (
          <button
            onClick={() => setSelectedId(null)}
            aria-label="Clear selected incident"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="soc-panel-scroll">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${tab}-${incident?.id || "empty"}`}
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            tabIndex={0}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "stats" ? (
              <ModelAnalyticsTab />
            ) : !incident ? (
              <div className="soc-inspector-empty">
                <ShieldAlert size={38} />
                <h3>Follow the signal.</h3>
                <p>
                  Select an event from the stream or radar to open its
                  investigation here.
                </p>
              </div>
            ) : tab === "details" ? (
              <>
                {mode === "soc" && (
                  <AgentWorkflowTab
                    incident={incident}
                    frame={frame}
                    playing={playing}
                    onInspect={() => setTab("xai")}
                  />
                )}
                <ThreatInspectorTab
                  incident={incident}
                  status={statuses[incident.id]}
                  onAction={action}
                  showActions={false}
                />
              </>
            ) : tab === "xai" ? (
              incident.provenance ? (
                <Attribution incident={incident} />
              ) : (
                <XAIInspector incident={incident} />
              )
            ) : (
              <>
                <div className="soc-note">
                  <span className="soc-eyebrow">TARGET / {incident.id}</span>
                  <h3>{incident.title}</h3>
                  <code>{incident.source}</code>
                </div>
                <ActionSuite
                  incident={incident}
                  status={statuses[incident.id]}
                  onAction={action}
                  history={history[incident.id] || []}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="soc-panel-footer">
        <i className="soc-dot" /> ANALYST CONTROL{" "}
        <span>Actions require review</span>
      </div>
    </>
  );
  return (
    <DashboardLayout
      header={header}
      monitoring={monitoring}
      inspector={inspector}
      mode={mode}
    />
  );
};
