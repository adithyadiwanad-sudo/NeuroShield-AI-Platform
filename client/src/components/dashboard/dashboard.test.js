import test from "node:test";
import assert from "node:assert/strict";
import { getWorkflowState } from "./workflow.js";
import { analyzeAudio } from "./audioFeatures.js";
import { demoIncidents, normalizeScan } from "./telemetry.js";
import { createIncidentReport, incidentHash } from "./incidentReport.js";

test("replay reconstructs progress at stage boundaries and clamps invalid frames", () => {
  assert.deepEqual(getWorkflowState(20).progress, [100, 0, 0, 0]);
  assert.deepEqual(getWorkflowState(50).progress, [100, 100, 50, 0]);
  assert.deepEqual(getWorkflowState(0).progress, [0, 0, 0, 0]);
  assert.equal(getWorkflowState(80).complete, true);
  assert.equal(getWorkflowState(900).total, 100);
  assert.equal(getWorkflowState(-4).total, 0);
});
test("audio descriptors recover a known tone and remain finite for silence", () => {
  const sampleRate = 16000;
  const signal = Float32Array.from(
    { length: sampleRate },
    (_, i) => 0.5 * Math.sin((2 * Math.PI * 1000 * i) / sampleRate),
  );
  const result = analyzeAudio(signal, sampleRate);
  assert.ok(Math.abs(result.centroid - 1000) < 30);
  assert.ok(Math.abs(result.rms - Math.sqrt(0.125)) < 0.001);
  assert.equal(result.mfcc.length, 13);
  assert.ok(result.mfcc.every(Number.isFinite));
  const silent = analyzeAudio(new Float32Array(sampleRate), sampleRate);
  assert.equal(silent.centroid, 0);
  assert.equal(silent.rms, 0);
  assert.ok(silent.mfcc.every(Number.isFinite));
  assert.throws(() => analyzeAudio(new Float32Array(), sampleRate));
});
test("normalization distinguishes unknown scores from safe zero scores", () => {
  assert.equal(normalizeScan({ id: "zero", riskScore: 0 }, 0).score, 0);
  assert.equal(normalizeScan({ id: "missing" }, 0).score, null);
  assert.equal(normalizeScan({ riskScore: "invalid" }, 0).score, null);
  assert.equal(
    normalizeScan({ overallRisk: "CRITICAL" }, 0).severity,
    "Critical",
  );
});
test("report includes evidence hash, provenance, attribution and dated history", async () => {
  const incident = demoIncidents[0];
  const digest = await incidentHash(incident);
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.equal(await incidentHash({ ...incident }), digest);
  assert.notEqual(await incidentHash({ ...incident, score: 1 }), digest);
  const report = await createIncidentReport(incident, "Block simulated", [
    { action: "Block simulated", timestamp: "2026-09-24T10:00:00Z" },
  ]);
  const output = report.output();
  assert.ok(output.startsWith("%PDF-"));
  assert.ok(output.includes("SYNTHETIC PRESENTATION"));
  assert.ok(output.includes("FEATURE ATTRIBUTION"));
  assert.ok(output.includes("Block simulated"));
  assert.ok(output.includes("2026-09-24T10:00:00Z"));
  const long = await createIncidentReport({
    ...incident,
    explanation: "Evidence summary. ".repeat(4000),
  });
  assert.ok(long.getNumberOfPages() > 1);
});
