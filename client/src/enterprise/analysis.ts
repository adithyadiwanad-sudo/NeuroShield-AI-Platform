import { severityFor } from "./domain.ts";
import type { Feature, Incident } from "./domain.ts";

export type Analysis = {
  title: string;
  score: number;
  explanation: string;
  features: Feature[];
  phrases: string[];
  checks: { label: string; value: string }[];
  axes: { axis: string; value: number }[];
  source: string;
  payload: string;
  signalType: string;
};
const groups = [
  { axis: "Reward", weight: 24, pattern: /\b(congratulations|lottery|prize|guaranteed returns?|earning\s+rs\s*\d+)\b/gi },
  { axis: "Recruitment", weight: 22, pattern: /\b(part-time job|telegram|job_admin|recruitment fee)\b/gi },
  {
    axis: "Urgency",
    weight: 22,
    pattern:
      /\b(urgent|immediately|act now|final notice|within \d+ hours?|today only)\b/gi,
  },
  {
    axis: "Authority",
    weight: 16,
    pattern:
      /\b(police|bank|ceo|manager|court|support team|tax department)\b/gi,
  },
  {
    axis: "Coercion",
    weight: 23,
    pattern:
      /\b(arrest|suspend(?:ed)?|terminat(?:ed|ion)|freeze|penalty|legal action)\b/gi,
  },
  {
    axis: "Payment",
    weight: 21,
    pattern:
      /\b(wire|transfer funds|gift cards?|registration fee|pay (?:a |the )?fee|settlement|crypto wallet)\b/gi,
  },
  {
    axis: "Credentials",
    weight: 25,
    pattern:
      /\b(?:share|send|enter|verify|confirm|update|provide|reveal)\b.{0,28}\b(?:otp|password|pin|code|credentials|bank details)\b/gi,
  },
  {
    axis: "Secrecy",
    weight: 16,
    pattern:
      /\b(confidential|do not tell|keep (?:it|this) secret|do not contact)\b/gi,
  },
];
export function analyzeMessage(text: string): Analysis {
  if (!text.trim()) throw new Error("Enter a message to inspect.");
  if (text.length > 12000)
    throw new Error("Limit messages to 12,000 characters.");
  const features: Feature[] = [],
    phrases: string[] = [],
    axes: { axis: string; value: number }[] = [];
  for (const group of groups) {
    const matches = [...text.matchAll(new RegExp(group.pattern))].filter(
      (match) =>
        !(
          group.axis === "Credentials" &&
          /(?:do not|never|don't)\s*$/i.test(
            text.slice(Math.max(0, (match.index ?? 0) - 16), match.index),
          )
        ),
    );
    axes.push({ axis: group.axis, value: Math.min(100, matches.length * 45) });
    if (matches.length) {
      features.push({ name: `${group.axis} indicators`, impact: group.weight });
      phrases.push(...matches.map((m) => m[0]));
    }
  }
  const links = text.match(/https?:\/\/[^\s<>]+/gi) || [];
  if (links.length && features.length) {
    features.push({ name: "Link alongside persuasion cues", impact: 12 });
  }
  const score = Math.min(
    features.length <= 1 ? 20 : 100,
    features.reduce((total, f) => total + f.impact, 0),
  );
  return {
    title:
      score >= 65
        ? "Social-engineering pattern detected"
        : score >= 35
          ? "Message warrants review"
          : "Few rule-based indicators",
    score,
    features,
    phrases: [...new Set(phrases)].slice(0, 20),
    source: "Manual text inspection",
    payload: text,
    signalType: "Text",
    axes,
    checks: [
      { label: "Method", value: "Local transparent rules" },
      { label: "Matched phrases", value: String(phrases.length) },
      { label: "Links found", value: String(links.length) },
      { label: "Model confidence", value: "Not computed" },
    ],
    explanation: features.length
      ? `The message contains ${features.map((f) => f.name.toLowerCase()).join(", ")}. These observed cues produce a ${score}/100 heuristic score. Context can change the interpretation; this is not a calibrated ML probability.`
      : "No configured persuasion rules matched. This is not proof that the message or sender is safe.",
  };
}
export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    previous = next;
  }
  return previous[b.length];
}
export const brands = [
  "paypal.com",
  "microsoft.com",
  "google.com",
  "amazon.com",
  "netflix.com",
  "sbi.co.in",
];
export function analyzeUrl(input: string): Analysis {
  let url: URL;
  try {
    let normalized = input.trim().replace(/^[\s'"`]+|[\s'"`]+$/g, "");
    if (/[\s\\]/.test(normalized)) throw new Error("Invalid URL");
    normalized = normalized.replace(/^(https?):\/*/i, "$1://");
    if (!/^[a-z][a-z0-9+.-]*:/i.test(normalized)) normalized = "http://" + normalized;
    url = new URL(normalized);
  } catch {
    throw new Error("Enter a complete HTTP or HTTPS URL.");
  }
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  if (input.length > 2048) throw new Error("Limit URLs to 2,048 characters.");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const features: Feature[] = [],
    phrases: string[] = [];
  const add = (name: string, impact: number) => {
    features.push({ name, impact });
    phrases.push(name);
  };
  if (url.protocol === "http:") add("Unencrypted HTTP scheme", 20);
  if (url.username || url.password)
    add("Credentials embedded before hostname", 25);
  if (host.includes("xn--")) add("Internationalized / punycode hostname", 15);
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host))
    add("IP address instead of domain", 18);
  let lookalike = "No configured brand similarity";
  let similarity = 0;
  for (const brand of brands) {
    if (host === brand || host.endsWith("." + brand)) continue;
    const token = brand.split(".")[0];
    for (const label of host.split(/[.-]/)) {
      if (label.length < 3) continue;
      const distance = editDistance(label, token);
      if (
        (distance <= 1 || label.includes(token)) &&
        distance / Math.max(label.length, token.length) < 0.3
      ) {
        lookalike = `Resembles ${brand}; outside its domain`;
        similarity = Math.max(
          similarity,
          Math.round(
            (1 - distance / Math.max(label.length, token.length)) * 100,
          ),
        );
      }
    }
  }
  if (similarity) add("Brand lookalike outside official domain", 34);
  if (
    /\b(login|verify|password|secure|account|wallet)\b/i.test(
      host + " " + url.pathname,
    )
  )
    add("Credential-themed URL terms", 12);
  if (host.split(".").length > 4) add("Deep subdomain nesting", 8);
  const score = Math.min(
    100,
    features.reduce((total, f) => total + f.impact, 0),
  );
  url.username = "";
  url.password = "";
  return {
    title:
      score >= 65
        ? "Suspicious URL structure"
        : score >= 35
          ? "URL needs verification"
          : "Few structural indicators",
    score,
    features,
    phrases,
    source: host,
    payload: url.href,
    signalType: "URL",
    axes: [
      { axis: "Brand spoofing", value: similarity },
      { axis: "Transport", value: url.protocol === "http:" ? 80 : 10 },
      {
        axis: "Credential cues",
        value: features.some((f) => f.name.startsWith("Credential-themed"))
          ? 70
          : 0,
      },
      { axis: "Obfuscation", value: host.includes("xn--") ? 60 : 0 },
      { axis: "Exposure", value: score },
      { axis: "Nesting", value: Math.min(100, host.split(".").length * 15) },
    ],
    checks: [
      { label: "Hostname", value: host },
      { label: "Brand resemblance", value: lookalike },
      {
        label: "Typosquatting similarity",
        value: similarity ? `${similarity}% string similarity` : "No match",
      },
      {
        label: "SSL certificate age",
        value: "Not inspected; HTTPS alone is not validation",
      },
      { label: "Domain registration age", value: "Requires registry lookup" },
      { label: "Visual clone similarity", value: "Requires page capture" },
      { label: "Redirect hop count", value: "Not followed" },
    ],
    explanation: features.length
      ? `Observed ${features.map((f) => f.name.toLowerCase()).join(", ")}. The score is based on URL structure only. No destination was visited, certificate inspected, or domain-age lookup performed.`
      : "No configured structural flags matched. This does not verify the destination, its content, ownership, or certificate.",
  };
}
export function analysisIncident(result: Analysis): Incident {
  const now = new Date();
  return {
    id: `LAB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    title: result.title,
    source: result.source,
    score: result.score,
    severity: severityFor(result.score),
    timestamp: now.toISOString(),
    time: now.toLocaleTimeString(),
    explanation: result.explanation,
    signalType: result.signalType,
    demo: false,
    provenance: "heuristic",
    features: result.features,
    status: "Open",
    phase: "Scored",
    region: "Unmapped",
    payload: result.payload,
    scenario: "manual",
    autoManaged: false,
    history: [
      {
        action: "Local heuristic inspection completed",
        timestamp: now.toISOString(),
      },
    ],
    entities: [],
  };
}
