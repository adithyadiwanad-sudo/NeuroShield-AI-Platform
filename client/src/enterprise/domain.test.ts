import test from "node:test";
import assert from "node:assert/strict";
import { analyzeMessage, analyzeUrl, analysisIncident } from "./analysis.ts";
import {
  makeIncident,
  seedIncidents,
  updatePhase,
  updateStatus,
  isIncident,
  csvFor,
  playbookFor,
  isIPv4,
} from "./domain.ts";

test("message rules flag persuasion while respecting explicit credential warnings", () => {
  const risky = analyzeMessage(
    "Urgent: bank account suspended. Enter your OTP immediately. Transfer funds.",
  );
  assert.ok(risky.score >= 85);
  assert.ok(risky.phrases.some((p) => p.includes("OTP")));
  const routine = analyzeMessage(
    "Appointment confirmed Monday. Never share your OTP or password.",
  );
  assert.equal(routine.score, 0);
  assert.match(routine.explanation, /not proof/);
  assert.throws(() => analyzeMessage(" "));
  assert.throws(() => analyzeMessage("x".repeat(12001)));
});
test("URL inspection distinguishes official domains from lookalikes and never claims verification", () => {
  const official = analyzeUrl("https://www.paypal.com/");
  assert.equal(official.score, 0);
  const suspect = analyzeUrl("http://paypa1.example/verify-account");
  assert.ok(suspect.score >= 65);
  assert.ok(
    analyzeUrl("https://paypal.com.evil.example").features.some((f) =>
      f.name.includes("lookalike"),
    ),
  );
  const credential = analyzeUrl("https://test:secret@example.com/");
  assert.ok(!credential.payload.includes("secret"));
  assert.throws(() => analyzeUrl("javascript:alert(1)"));
  assert.throws(() => analyzeUrl("not a URL"));
  assert.match(official.explanation, /does not verify/);
});
test("simulated response is recorded and cannot override a manual decision", () => {
  const incident = makeIncident("ddos");
  assert.ok(isIncident(incident));
  const contained = updatePhase(
    updatePhase(incident, "Scoring", true),
    "Redirected",
    true,
  );
  assert.equal(contained.status, "Contained");
  assert.equal(contained.phase, "Redirected");
  const manual = updateStatus(incident, "Resolved");
  const later = updatePhase(manual, "Redirected", true);
  assert.equal(later.status, "Resolved");
  assert.equal(later.phase, "Scored");
  assert.match(later.history.at(-1)!.action, /analyst decision preserved/);
  assert.equal(updateStatus(manual, "Resolved"), manual);
  assert.equal(new Set(seedIncidents().map((i) => i.id)).size, 8);
  assert.ok(seedIncidents().every(isIncident));
  assert.equal(isIncident({ id: "broken" }), false);
});
test("heuristic findings carry distinct provenance and no fabricated model confidence", () => {
  const incident = analysisIncident(
    analyzeMessage("Act now, send your password."),
  );
  assert.equal(incident.demo, false);
  assert.equal(incident.provenance, "heuristic");
  assert.equal(incident.confidence, undefined);
  assert.equal(incident.autoManaged, false);
  assert.ok(isIncident(incident));
});
test("exports escape formula cells and playbooks reject non-IP command targets", () => {
  const incident = makeIncident("ddos");
  const csv = csvFor([{ ...incident, title: ' =HYPERLINK("x")' }]);
  assert.ok(csv.includes("' =HYPERLINK"));
  assert.ok(csv.includes('""x""'));
  assert.ok(isIPv4("203.0.113.42"));
  assert.equal(isIPv4("256.1.1.1"), false);
  assert.equal(isIPv4("01.2.3.4"), false);
  assert.match(playbookFor(incident, "firewall"), /203\.0\.113\.42\/32/);
  assert.match(
    playbookFor({ ...incident, source: "1.1.1.1; echo injected" }, "firewall"),
    /No verified IPv4/,
  );
  assert.equal(JSON.parse(playbookFor(incident, "aws")).RuleAction, "deny");
  assert.equal(
    JSON.parse(playbookFor(incident, "jwt")).execution,
    "proposal_only",
  );
});
