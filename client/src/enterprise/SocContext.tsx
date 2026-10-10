import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  isIncident,
  makeIncident,
  seedIncidents,
  updatePhase,
  updateStatus,
} from "./domain";
import type { Incident, IncidentStatus, Scenario } from "./domain";
import { endpoints } from "./transport";

const STORAGE = "neuroshield-soc-session-v1";
type Context = {
  incidents: Incident[];
  selectedId: string | null;
  select: (id: string | null) => void;
  inject: (kind: Scenario) => Incident;
  add: (incident: Incident) => void;
  setStatus: (id: string, status: IncidentStatus) => void;
  recordAction: (id: string, action: string) => void;
  streaming: boolean;
  setStreaming: (v: boolean) => void;
  sound: boolean;
  setSound: (v: boolean) => void;
  honeypot: boolean;
  setHoneypot: (v: boolean) => void;
  storageWarning: boolean;
  feedStatus: string;
  feedError: string;
  followLive: boolean;
  setFollowLive: (v: boolean) => void;
  renderLatency: number | null;
};
const SocContext = createContext<Context | null>(null);
function initialIncidents(): Incident[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE) || "null");
    if (Array.isArray(saved) && saved.length && saved.every(isIncident))
      return saved.slice(0, 100).map((i) => ({
        ...i,
        autoManaged: false,
        phase:
          i.phase === "Detected" || i.phase === "Scoring" ? "Scored" : i.phase,
      }));
  } catch {
    /* Invalid or unavailable storage falls back to synthetic fixtures. */
  }
  return seedIncidents();
}
export function SocProvider({ children }: { children: React.ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [selectedId, setSelectedId] = useState<string | null>(
      () => incidents[0]?.id ?? null,
    ),
    [streaming, setStreaming] = useState(true),
    [sound, setSound] = useState(false),
    [honeypot, setHoneypot] = useState(true),
    [storageWarning, setStorageWarning] = useState(false);
  const [feedStatus, setFeedStatus] = useState("connecting"),
    [feedError, setFeedError] = useState(""),
    [followLive, setFollowLive] = useState(true),
    [renderLatency, setRenderLatency] = useState<number | null>(null);
  const followRef = useRef(followLive);
  followRef.current = followLive;
  const receivedAt = useRef<number | null>(null);
  const select = useCallback((id: string | null) => {
    setFollowLive(false);
    setSelectedId(id);
  }, []);
  useLayoutEffect(() => {
    if (receivedAt.current !== null) {
      setRenderLatency(
        Math.round((performance.now() - receivedAt.current) * 10) / 10,
      );
      receivedAt.current = null;
    }
  }, [incidents]);
  useEffect(() => {
    if (!streaming) {
      setFeedStatus("paused");
      return;
    }
    if (endpoints.error) {
      setFeedStatus("unconfigured");
      setFeedError(endpoints.error);
      return;
    }
    let stopped = false,
      socket: WebSocket | null = null,
      retry: ReturnType<typeof setTimeout> | undefined,
      heartbeat: ReturnType<typeof setInterval> | undefined,
      attempts = 0,
      lastMessage = Date.now();
    const connect = () => {
      if (stopped) return;
      setFeedStatus(attempts ? "reconnecting" : "connecting");
      try {
        socket = new WebSocket(endpoints.wsUrl);
      } catch {
        setFeedStatus("unconfigured");
        setFeedError("Cannot connect to the configured WebSocket URL.");
        return;
      }
      const current = socket;
      current.onopen = () => {
        if (stopped) return;
        attempts = 0;
        lastMessage = Date.now();
        setFeedStatus("connected");
        setFeedError("");
        heartbeat = setInterval(() => {
          if (Date.now() - lastMessage > 45000) {
            current.close();
            return;
          }
          if (current.readyState === WebSocket.OPEN) current.send("ping");
        }, 15000);
      };
      current.onmessage = (event) => {
        if (stopped) return;
        lastMessage = Date.now();
        try {
          const message = JSON.parse(event.data);
          if (message.type === "ready" && !message.feedEnabled)
            setFeedError(
              "Backend demo feed is disabled. REST analysis remains available.",
            );
          if (message.type !== "incident") return;
          if (!isIncident(message.incident)) throw new Error();
          receivedAt.current = performance.now();
          setIncidents((old) =>
            [
              message.incident,
              ...old.filter((i) => i.id !== message.incident.id),
            ].slice(0, 100),
          );
          if (followRef.current) setSelectedId(message.incident.id);
        } catch {
          setFeedError("Invalid feed event ignored.");
        }
      };
      current.onerror = () => {
        if (!stopped)
          setFeedError("Live connection unavailable; retrying automatically.");
      };
      current.onclose = () => {
        clearInterval(heartbeat);
        if (stopped) return;
        setFeedStatus("reconnecting");
        setFeedError("Live connection interrupted; retrying automatically.");
        retry = setTimeout(
          connect,
          Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)) +
            Math.random() * 300,
        );
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      clearInterval(heartbeat);
      socket?.close();
    };
  }, [streaming]);
  const settings = useRef({ sound, honeypot });
  settings.current = { sound, honeypot };
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(incidents));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [incidents]);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      audio.current?.close().catch(() => {});
    },
    [],
  );
  const add = useCallback(
    (incident: Incident) => {
      setIncidents((old) =>
        [incident, ...old.filter((i) => i.id !== incident.id)].slice(0, 100),
      );
      select(incident.id);
    },
    [select],
  );
  const inject = useCallback(
    (kind: Scenario) => {
      const incident = makeIncident(kind);
      add(incident);
      const redirect = settings.current.honeypot;
      if (settings.current.sound) {
        try {
          audio.current ||= new AudioContext();
          const context = audio.current;
          if (context.state === "suspended") void context.resume();
          const osc = context.createOscillator(),
            gain = context.createGain();
          osc.connect(gain);
          gain.connect(context.destination);
          osc.frequency.setValueAtTime(620, context.currentTime);
          osc.frequency.exponentialRampToValueAtTime(
            280,
            context.currentTime + 0.16,
          );
          gain.gain.setValueAtTime(0.035, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            context.currentTime + 0.18,
          );
          osc.start();
          osc.stop(context.currentTime + 0.2);
        } catch {
          /* Audio availability does not block the demo. */
        }
      }
      const schedule = (
        delay: number,
        phase: "Scoring" | "Redirected" | "Blocked",
      ) => {
        const timer = setTimeout(() => {
          timers.current = timers.current.filter((t) => t !== timer);
          setIncidents((old) =>
            old.map((i) =>
              i.id === incident.id ? updatePhase(i, phase, redirect) : i,
            ),
          );
        }, delay);
        timers.current.push(timer);
      };
      schedule(650, "Scoring");
      schedule(2000, redirect ? "Redirected" : "Blocked");
      return incident;
    },
    [add],
  );
  const setStatus = useCallback(
    (id: string, status: IncidentStatus) =>
      setIncidents((old) =>
        old.map((i) => (i.id === id ? updateStatus(i, status) : i)),
      ),
    [],
  );
  const recordAction = useCallback(
    (id: string, action: string) =>
      setIncidents((old) =>
        old.map((i) =>
          i.id === id
            ? {
                ...i,
                status: action.includes("Whitelist") ? "Resolved" : "Contained",
                autoManaged: false,
                history: [
                  ...i.history,
                  { action, timestamp: new Date().toISOString() },
                ],
              }
            : i,
        ),
      ),
    [],
  );
  return (
    <SocContext.Provider
      value={{
        incidents,
        selectedId,
        select,
        inject,
        add,
        setStatus,
        recordAction,
        streaming,
        setStreaming,
        sound,
        setSound,
        honeypot,
        setHoneypot,
        storageWarning,
        feedStatus,
        feedError,
        followLive,
        setFollowLive,
        renderLatency,
      }}
    >
      {children}
    </SocContext.Provider>
  );
}
export function useSoc() {
  const context = useContext(SocContext);
  if (!context) throw new Error("SOC provider is required");
  return context;
}
