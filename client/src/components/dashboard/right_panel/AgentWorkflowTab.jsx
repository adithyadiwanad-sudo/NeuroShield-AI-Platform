import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight, Cpu, Radio } from "lucide-react";
import { getWorkflowState, workflowStages } from "../workflow";
import TypewriterText from "../TypewriterText";

export function ProgressRing({ value, label, size = 46, complete = false }) {
  return (
    <div
      className="soc-progress-ring"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="currentColor"
          opacity=".12"
          strokeWidth="3"
        />
        <motion.circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={125.66}
          animate={{ strokeDashoffset: 125.66 * (1 - value / 100) }}
          initial={false}
          transition={{ duration: 0.1 }}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <span aria-hidden="true">
        {complete ? <Check size={17} /> : `${value}%`}
      </span>
    </div>
  );
}
export default function AgentWorkflowTab({
  incident,
  frame = 0,
  playing = false,
  onInspect,
}) {
  const { step, total, progress, complete } = getWorkflowState(frame);
  const [expanded, setExpanded] = useState(step);
  const reduced = useReducedMotion();
  useEffect(() => setExpanded(step), [step, incident.id]);
  const details = [
    `${incident.source} · ${incident.title}. Signal record loaded and normalized for review.`,
    incident.demo
      ? "Demo: vector similarity reached 98%. This is an illustrative similarity result, not a measured model output."
      : "Feature vectors are not supplied by the analytics endpoint. Only the review animation is simulated.",
    incident.demo
      ? `Illustrative threat confidence: ${incident.confidence ?? 94.6}%. Risk score: ${incident.score}/100.`
      : `Recorded risk score: ${incident.score ?? "not supplied"}. Calibrated confidence is not supplied.`,
    "Response proposal prepared. The trigger is simulated; no network, token, or endpoint changes have been executed.",
  ];
  return (
    <div className="soc-agent-workflow">
      <div className="soc-agent-banner">
        <Cpu size={24} />
        <div>
          <strong>Neural response agent</strong>
          <p>
            {incident.demo ? "SANDBOX EXECUTION" : "SIMULATED RECORD REVIEW"} ·{" "}
            {complete ? "READY FOR REVIEW" : playing ? "PROCESSING" : "PAUSED"}
          </p>
        </div>
        <ProgressRing
          value={total}
          label="Overall workflow progress"
          size={52}
        />
      </div>
      <div className="soc-section-label">
        AGENTIC PIPELINE <span>{complete ? "4 / 4" : `${step + 1} / 4`}</span>
      </div>
      <div className="soc-workflow">
        {workflowStages.map((stage, index) => {
          const done = progress[index] === 100;
          const active = index === step && !complete;
          return (
            <motion.div
              layout={reduced ? false : "position"}
              key={stage.title}
              className={`soc-step ${active ? "active" : ""} ${done ? "complete" : ""}`}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
            >
              {active && playing && !reduced && (
                <motion.div
                  className="soc-step-aura"
                  aria-hidden="true"
                  animate={{ opacity: [0.25, 0.7, 0.25] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <button
                onClick={() => setExpanded(expanded === index ? null : index)}
                aria-expanded={expanded === index}
                aria-controls={`stage-detail-${index}`}
              >
                <ProgressRing
                  value={progress[index]}
                  label={`${stage.title} progress`}
                  complete={done}
                />
                <span>
                  <small>
                    {done
                      ? "COMPLETE"
                      : active
                        ? playing
                          ? "IN PROGRESS"
                          : "PAUSED"
                        : "QUEUED"}
                  </small>
                  <strong>{stage.title}</strong>
                </span>
                <motion.span animate={{ rotate: expanded === index ? 90 : 0 }}>
                  <ChevronRight size={14} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {expanded === index && (
                  <motion.div
                    key={`detail-${index}`}
                    id={`stage-detail-${index}`}
                    className="soc-step-detail"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduced ? 0 : 0.25 }}
                  >
                    <ul className="soc-micro-steps">
                      {stage.micro.map((micro, n) => (
                        <li
                          key={micro}
                          className={
                            progress[index] >= ((n + 1) * 100) / 3 ? "done" : ""
                          }
                        >
                          <Check size={11} />
                          {micro}
                        </li>
                      ))}
                    </ul>
                    <p>
                      {index > step
                        ? "Waiting for the preceding stage."
                        : details[index]}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      <div className="soc-note soc-narrative">
        <span className="soc-eyebrow">
          <Radio size={12} /> AI NARRATIVE /{" "}
          {incident.demo ? "DEMO" : "SCAN RECORD"}
        </span>
        <TypewriterText text={incident.explanation} animate={playing} />
      </div>
      <button className="soc-button primary" onClick={onInspect}>
        Explore feature attribution <ChevronRight size={16} />
      </button>
      <p className="soc-muted soc-workflow-disclaimer">
        Progress shows presentation playback. No live autonomous agent or
        enforcement service is connected.
      </p>
    </div>
  );
}
