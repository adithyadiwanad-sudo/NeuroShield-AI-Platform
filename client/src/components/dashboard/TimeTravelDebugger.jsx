import React from "react";
import {
  Play,
  Pause,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react";
import {
  LAST_FRAME,
  FRAME_MS,
  getWorkflowState,
  workflowStages,
} from "./workflow";

export default function TimeTravelDebugger({
  frame,
  playing,
  onSeek,
  onToggle,
  incident,
}) {
  return (
    <section className="soc-card soc-replay">
      <div className="soc-card-heading">
        <h2>
          <History size={16} /> Attack replay & time-travel
        </h2>
        <span className="soc-eyebrow">
          {incident?.id || "SELECT AN INCIDENT"}
        </span>
      </div>
      <div className="soc-replay-controls">
        <button
          aria-label="Rewind attack"
          disabled={!incident}
          onClick={() => onSeek(0)}
        >
          <SkipBack size={15} />
        </button>
        <button
          aria-label="Previous frame"
          disabled={!incident || frame === 0}
          onClick={() => onSeek(frame - 1)}
        >
          <ChevronLeft size={15} />
        </button>
        <button
          className="soc-replay-play"
          aria-label={playing ? "Pause replay" : "Play replay"}
          disabled={!incident}
          onClick={onToggle}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button
          aria-label="Next frame"
          disabled={!incident || frame === LAST_FRAME}
          onClick={() => onSeek(frame + 1)}
        >
          <ChevronRight size={15} />
        </button>
        <input
          aria-label="Attack replay frame"
          type="range"
          min="0"
          max={LAST_FRAME}
          value={frame}
          disabled={!incident}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
        <code>{((frame * FRAME_MS) / 1000).toFixed(1)}s / 8.0s</code>
      </div>
      <div className="soc-replay-labels">
        <span>
          FRAME {String(frame).padStart(2, "0")} / {LAST_FRAME}
        </span>
        <span>
          {incident
            ? workflowStages[getWorkflowState(frame).step].title
            : "Waiting for signal"}
        </span>
        <span>SIMULATED SEQUENCE</span>
      </div>
    </section>
  );
}
