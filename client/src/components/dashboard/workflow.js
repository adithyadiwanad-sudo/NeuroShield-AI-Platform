export const LAST_FRAME = 80;
export const FRAME_MS = 100;
export const workflowStages = [
  {
    title: "Signal Decoding",
    micro: ["Capture signal", "Decode payload", "Normalize input"],
  },
  {
    title: "Vector Analysis",
    micro: ["Extract features", "Compare vectors", "Rank similarity"],
  },
  {
    title: "Threat Confidence Scoring",
    micro: ["Aggregate evidence", "Calculate score", "Prepare explanation"],
  },
  {
    title: "Autonomous Mitigation Trigger",
    micro: ["Select response", "Prepare action", "Await analyst review"],
  },
];
export function getWorkflowState(frame) {
  const bounded = Math.max(0, Math.min(LAST_FRAME, Number(frame) || 0));
  return {
    step: Math.min(3, Math.floor(bounded / 20)),
    total: Math.round((bounded / LAST_FRAME) * 100),
    progress: workflowStages.map((_, i) =>
      Math.round(Math.max(0, Math.min(1, (bounded - i * 20) / 20)) * 100),
    ),
    complete: bounded === LAST_FRAME,
  };
}
