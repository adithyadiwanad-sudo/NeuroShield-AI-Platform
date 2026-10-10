export const tourSteps = [
  {
    title: "Command Center",
    path: "/dashboard",
    actions: [
      ["tour-live", "Watch the live WebSocket badge and rotating topology."],
      [
        "tour-pin",
        "Pin the latest incoming investigation to read its evidence.",
      ],
    ],
  },
  {
    title: "Multi-Modal Scam Lab",
    path: "/scam-lab",
    actions: [
      ["tour-url", "Auto-type a phishing URL and inspect the API result."],
      ["tour-sms", "Compare urgency and credential-manipulation signals."],
      [
        "tour-voice",
        "Inspect synthetic voice metadata; this is a labeled demo.",
      ],
    ],
  },
  {
    title: "Network NIDS",
    path: "/intrusion",
    actions: [
      [
        "tour-flood",
        "Execute the SYN flood fixture and read its rule-based risk.",
      ],
      ["tour-normal", "Execute normal traffic and compare the baseline."],
    ],
  },
  {
    title: "Incident Response",
    path: "/incidents",
    actions: [
      ["tour-contain", "Move the selected demonstration finding to Contained."],
      [
        "tour-report",
        "Review the IEEE-style PDF export. Download it manually if needed.",
      ],
    ],
  },
  {
    title: "Red Team & Deception",
    path: "/simulator",
    actions: [
      ["tour-honeypot", "Enable simulated honeypot routing."],
      [
        "tour-inject",
        "Inject a synthetic prompt attack and observe its response.",
      ],
    ],
  },
  {
    title: "Model Performance",
    path: "/model-performance",
    actions: [
      [
        "tour-evaluate",
        "Run two-fold cross-validation on the project-authored examples.",
      ],
    ],
  },
  {
    title: "Executive Q&A",
    path: "/dashboard",
    actions: [
      [
        "tour-executive",
        "Executive briefing is ready. The tour stays paused for questions.",
      ],
    ],
  },
];
export function nextPosition(step, action) {
  if (action + 1 < tourSteps[step].actions.length)
    return { step, action: action + 1 };
  if (step + 1 < tourSteps.length) return { step: step + 1, action: 0 };
  return null;
}
export function tourDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Tour paused", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}
