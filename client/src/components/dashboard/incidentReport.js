import { jsPDF } from "jspdf";

export async function incidentHash(incident) {
  const canonical = JSON.stringify({
    id: incident.id,
    timestamp: incident.timestamp || null,
    source: incident.source,
    title: incident.title,
    severity: incident.severity,
    score: incident.score,
    explanation: incident.explanation,
    features: incident.features || [],
    demo: incident.demo,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return Array.from(new Uint8Array(digest), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}

/** Two-column academic report inspired by IEEE conference typography. */
export async function createIncidentReport(incident, status, history = []) {
  const hash = await incidentHash(incident);
  const doc = new jsPDF();
  doc.setProperties({
    title: `NeuroShield Incident ${incident.id}`,
    author: "NeuroShield",
    subject: "Academic incident investigation report",
  });
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.text("NeuroShield: Incident Investigation", 105, 20, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text(
    "B.E. Information Science & Engineering | Academic Project Report",
    105,
    28,
    { align: "center" },
  );
  doc.setFontSize(8);
  doc.text(
    "IEEE-style layout; not an IEEE publication or validated research result.",
    105,
    34,
    { align: "center" },
  );
  let column = 0,
    y = 47;
  const x = () => (column === 0 ? 18 : 110);
  const nextColumn = () => {
    if (column === 0) {
      column = 1;
      y = 47;
    } else {
      doc.addPage();
      column = 0;
      y = 20;
    }
  };
  const space = (height) => {
    if (y + height > 276) nextColumn();
  };
  const paragraph = (text, bold = false) => {
    doc.setFont("times", bold ? "bold" : "normal");
    doc.setFontSize(9);
    for (const line of doc.splitTextToSize(String(text), 82)) {
      space(4.3);
      doc.text(line, x(), y);
      y += 4.3;
    }
    y += 3;
  };
  const section = (heading) => {
    space(15);
    y += 3;
    paragraph(heading, true);
  };
  section("I. ABSTRACT");
  paragraph(incident.explanation);
  paragraph(
    incident.demo
      ? "DATA PROVENANCE: SYNTHETIC PRESENTATION SCENARIO. Confidence and attribution values are illustrative, not measured outputs."
      : "DATA PROVENANCE: Recorded analytics scan. Workflow execution and response controls are simulated.",
  );
  section("II. INCIDENT METADATA");
  for (const line of [
    `Incident: ${incident.id}`,
    `Observed (UTC): ${incident.timestamp || "Not supplied"}`,
    `Generated (UTC): ${new Date().toISOString()}`,
    `Signal: ${incident.signalType || "Scan record"}`,
    `Source: ${incident.source}`,
    `Severity: ${incident.severity}`,
    `Risk score: ${incident.score ?? "Not supplied"}`,
    `Response: ${status || "Pending review"}`,
  ])
    paragraph(line);
  section("III. EVIDENCE INTEGRITY");
  paragraph(
    "SHA-256 of normalized incident metadata and explanation (not a hash of the original packet or uploaded file):",
  );
  paragraph(hash);
  // Keep the findings together in the next column, instead of orphaning only
  // the closing paragraph at the top of an otherwise empty column.
  nextColumn();
  section("IV. FEATURE ATTRIBUTION MATRIX");
  paragraph("Factor / illustrative contribution (%)", true);
  if (incident.features?.length)
    for (const feature of incident.features) {
      space(14);
      doc.setDrawColor(180);
      paragraph(`${feature.name}: +${feature.impact}%`);
      doc.line(x(), y - 2, x() + 82, y - 2);
      y += 2;
    }
  else
    paragraph(
      "Measured SHAP/LIME values are not supplied by the analytics endpoint.",
    );
  paragraph(
    "Weights are local example contributions. They are not causal evidence and are not guaranteed to sum to 100%.",
  );
  section("V. MITIGATION HISTORY");
  if (history.length)
    for (const entry of history)
      paragraph(`${entry.timestamp}: ${entry.action} (simulation).`);
  else paragraph("No mitigation actions recorded in this session.");
  section("VI. LIMITATIONS AND REPRODUCIBILITY");
  paragraph(
    "No live enforcement action was executed. Model benchmark targets displayed in the application are not empirical results. Voice descriptors and OCR extraction do not establish deepfake or receipt authenticity.",
  );
  paragraph(
    "A reproducible evaluation requires the model artifact, dataset version, train/test split, random seed, feature schema, explanation method, hardware, and measured metrics.",
  );
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `NeuroShield | Academic incident record | ${page} / ${pages}`,
      105,
      288,
      { align: "center" },
    );
  }
  return doc;
}
