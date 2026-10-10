import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Play, Pause, ChevronLeft, ChevronRight, X } from "lucide-react";
import { tourSteps, nextPosition, tourDelay } from "./tourPlan";
const TourContext = createContext(null);
export function useTour() {
  return useContext(TourContext);
}
export function useTourAction(id, handler) {
  const tour = useTour(),
    latest = useRef(handler);
  latest.current = handler;
  useEffect(
    () => tour.register(id, (signal) => latest.current(signal)),
    [id, tour.register],
  );
}
export function GuidedTourProvider({ children }) {
  const navigate = useNavigate(),
    location = useLocation();
  const [active, setActive] = useState(false),
    [paused, setPaused] = useState(false);
  const [position, setPosition] = useState({ step: 0, action: 0 });
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const actions = useRef(new Map()),
    controller = useRef(null),
    expected = useRef(null);
  const register = useCallback((id, handler) => {
    actions.current.set(id, handler);
    return () => {
      if (actions.current.get(id) === handler) actions.current.delete(id);
    };
  }, []);
  const stop = () => controller.current?.abort();
  const pause = () => {
    stop();
    setPaused(true);
  };
  const go = (step) => {
    stop();
    expected.current = tourSteps[step].path;
    setPosition({ step, action: 0 });
    setMessage(tourSteps[step].actions[0][1]);
    setError("");
    navigate(expected.current);
  };
  const start = () => {
    go(0);
    setActive(true);
    setPaused(false);
  };
  const exit = () => {
    stop();
    setActive(false);
    setError("");
  };
  useEffect(() => {
    if (active && location.pathname !== expected.current) {
      stop();
      setPaused(true);
    }
  }, [location.pathname, active]);
  useEffect(() => {
    if (!active) return;
    const takeover = (event) => {
      if (
        event.target instanceof Element &&
        !event.target.closest(".es-tour-banner")
      )
        pause();
    };
    const key = (event) => {
      if (
        event.key === "Escape" ||
        (["Enter", " "].includes(event.key) &&
          !event.target.closest?.(".es-tour-banner"))
      )
        pause();
    };
    document.addEventListener("pointerdown", takeover, true);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", takeover, true);
      document.removeEventListener("keydown", key);
    };
  }, [active]);
  useEffect(() => {
    if (!active || paused) return;
    const run = new AbortController();
    controller.current = run;
    const step = tourSteps[position.step],
      [id, caption] = step.actions[position.action];
    let highlighted;
    const highlight = () => {
      highlighted?.classList.remove("es-tour-highlight");
      highlighted = document.querySelector(`[data-tour="${id}"]`);
      highlighted?.classList.add("es-tour-highlight");
      highlighted?.scrollIntoView({ behavior: "auto", block: "center" });
    };
    setMessage(caption);
    setError("");
    void (async () => {
      // Lazy route modules register actions when they mount. Never dispatch to an old page.
      for (let n = 0; !actions.current.has(id); n++) {
        if (n >= 150)
          throw new Error(
            "This section could not load. Resume to retry, or use Next Step.",
          );
        await tourDelay(100, run.signal);
      }
      highlight();
      await tourDelay(4000, run.signal);
      await actions.current.get(id)(run.signal);
      run.signal.throwIfAborted();
      await tourDelay(450, run.signal);
      highlight();
      await tourDelay(4500, run.signal);
      const next = nextPosition(position.step, position.action);
      if (!next) {
        setPaused(true);
        setMessage("Presentation complete. Executive Q&A — take your time.");
        return;
      }
      if (next.step !== position.step) {
        expected.current = tourSteps[next.step].path;
        navigate(expected.current);
      }
      setPosition(next);
    })().catch((e) => {
      if (!run.signal.aborted) {
        setError(
          e.message || "Action unavailable. Resume to retry or skip this step.",
        );
        setPaused(true);
      }
    });
    return () => {
      run.abort();
      highlighted?.classList.remove("es-tour-highlight");
    };
  }, [active, paused, position, navigate]);
  const resume = () => {
    expected.current = tourSteps[position.step].path;
    navigate(expected.current);
    setPaused(false);
  };
  return (
    <TourContext.Provider value={{ start, active, paused, register }}>
      {children}
      {active && (
        <aside
          className="es-tour-banner"
          aria-label="Evaluator presentation controls"
        >
          <div role="status" aria-live="polite">
            <strong>
              Step {position.step + 1} of {tourSteps.length}:{" "}
              {tourSteps[position.step].title}
            </strong>
            <p>{error || message}</p>
            <small>
              {paused
                ? "Paused · Resume retries this section. Manual navigation is available."
                : "Guided demo · 4–5 seconds per highlight. Click anywhere to take over; Escape pauses."}
            </small>
          </div>
          <div className="es-tour-controls">
            <button className="es-button" onClick={paused ? resume : pause}>
              {paused ? <Play size={14} /> : <Pause size={14} />}{" "}
              {paused ? "Resume Tour" : "Pause Tour"}
            </button>
            <button
              className="es-button"
              disabled={position.step === 0}
              onClick={() => go(position.step - 1)}
            >
              <ChevronLeft size={14} /> Previous Step
            </button>
            <button
              className="es-button"
              disabled={position.step === tourSteps.length - 1}
              onClick={() => go(position.step + 1)}
            >
              Next Step <ChevronRight size={14} />
            </button>
            <button className="es-button" onClick={exit}>
              <X size={14} /> Exit Tour
            </button>
          </div>
        </aside>
      )}
    </TourContext.Provider>
  );
}
