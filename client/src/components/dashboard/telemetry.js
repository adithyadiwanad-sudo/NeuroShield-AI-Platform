export const demoIncidents = [
  {
    id: "NS-0842",
    title: "Credential exfiltration",
    source: "203.0.113.42",
    severity: "Critical",
    score: 94,
    time: "14:32:08",
    explanation:
      "Demo scenario: repeated outbound transfers followed a burst of failed logins. The combination resembles credential theft and merits immediate review.",
  },
  {
    id: "NS-0841",
    title: "Suspicious DNS tunneling",
    source: "198.51.100.18",
    severity: "High",
    score: 82,
    time: "14:31:56",
    explanation:
      "Demo scenario: unusually long DNS queries repeat at regular intervals, a pattern consistent with data tunneling.",
  },
  {
    id: "NS-0840",
    title: "Port scan detected",
    source: "192.0.2.76",
    severity: "Medium",
    score: 61,
    time: "14:31:42",
    explanation:
      "Demo scenario: one source attempted connections to many ports in a short interval, suggesting service discovery.",
  },
  {
    id: "NS-0839",
    title: "Malicious URL signature",
    source: "203.0.113.91",
    severity: "High",
    score: 86,
    time: "14:31:19",
    explanation:
      "Demo scenario: a URL resembles a known credential-harvesting pattern. Verify its destination before allowing access.",
  },
  {
    id: "NS-0838",
    title: "Baseline traffic verified",
    source: "192.0.2.12",
    severity: "Safe",
    score: 8,
    time: "14:30:54",
    explanation:
      "Demo scenario: traffic volume and connection behavior fall within the expected baseline.",
  },
].map((i) => ({
  ...i,
  demo: true,
  timestamp: `2026-09-24T${i.time}Z`,
  confidence: 94.6,
  signalType: "Network packet",
  features:
    i.severity === "Safe"
      ? [{ name: "Baseline similarity", impact: 8 }]
      : [
          { name: "Traffic deviation", impact: 38 },
          { name: "Repeated connections", impact: 24 },
          { name: "Source behavior", impact: 15 },
        ],
}));
export const demoTrend = Array.from({ length: 24 }, (_, i) => ({
  date: `14:${String(i + 8).padStart(2, "0")}`,
  safe: 32 + Math.sin(i * 1.3) * 8,
  threats: i === 17 ? 87 : i === 18 ? 52 : 8 + Math.abs(Math.sin(i * 1.8)) * 12,
}));
export function normalizeScan(scan, index) {
  const rawScore = scan.riskScore;
  const score =
    rawScore != null && Number.isFinite(Number(rawScore))
      ? Math.max(0, Math.min(100, Number(rawScore)))
      : null;
  const rawSeverity = String(
    scan.overallRisk || scan.riskLevel || "Unknown",
  ).toLowerCase();
  const severity = ["critical", "high", "medium", "low", "safe"].includes(
    rawSeverity,
  )
    ? rawSeverity[0].toUpperCase() + rawSeverity.slice(1)
    : "Unknown";
  const date = new Date(scan.timestamp);
  return {
    id: String(scan.id || scan._id || `scan-${index}`),
    title: scan.mainAttackCategory || scan.attackType || "Network analysis",
    source:
      scan.sourceIp || scan.target || scan.filename || "Source not supplied",
    severity,
    score,
    time: Number.isNaN(date.getTime())
      ? "Time unavailable"
      : date.toLocaleString(),
    explanation:
      typeof scan.explanation === "string"
        ? scan.explanation
        : typeof scan.summary === "string"
          ? scan.summary
          : `The scan reported ${severity.toLowerCase()} risk. Detailed AI reasoning is not included in this analytics record. Review the original scan before taking action.`,
    demo: false,
    timestamp: Number.isNaN(date.getTime()) ? null : date.toISOString(),
    signalType: "Scan record",
  };
}
