# NeuroShield IDS — evaluator presentation content

Use 15 slides, with only three flow/state diagrams. Preserve the sample's department/footer placement. The sample says 2026–27; the previous review says 2025–26. Confirm your academic year before submission. Use the newly supplied names and guide details below. This is copy-ready content, not a generated PowerPoint deck.

## Slide 1 — Title
**NeuroShield IDS: AI-Powered Intrusion and Scam Detection System**

Team members:
- Prabhat Kumar Chaurasia — 1DB23IS113
- Adithya Adivesh Diwanad — 1DB23IS006
- Basavaraj Kumari — 1DB23IS026
- Prashant Patel — 1DB23IS117

Guide: **Mr. Kiran Kumar D**, Assistant Professor, Dept. of ISE.

Say: “Our project brings network-flow analysis and scam investigation into one security dashboard.”

## Slide 2 — Introduction
- Network intrusions and scam messages require different types of analysis.
- NeuroShield brings these checks into one SOC dashboard.
- Displays risk scores, evidence, and incident status.
- Supports prepared scenarios for repeatable demonstrations.

Say: “We help an analyst inspect suspicious inputs and understand why they were flagged.”

## Slide 3 — Literature Survey: Network Detection
Use a compact table rather than long paragraphs.

| Study | Method / focus | Lesson for our project |
|---|---|---|
| Dash et al., 2025 — Enhancement of Network Security through ML and DL | KDD 1999; SVM, XGBoost and other classifiers; PCA and scaling | Feature preparation and class-wise evaluation matter |
| Venugopal, 2026 — Adversarial-Trained Deep Ensemble for Robust DDoS Intrusion Detection | Prior review describes adversarial training and an ensemble | Robustness testing is needed beyond ordinary examples |

Say: “These studies informed our network-analysis design and evaluation approach.”

Speaker/source note: Dash's dataset and methods were checked against the IEEE abstract. Venugopal's entry is retained from prep.pdf, pages 4 and 25; independently verify its full text before asserting its performance. Do not repeat the prior slide's 99.65% figure as a verified result or as NeuroShield's accuracy.

## Slide 4 — Literature Survey: Explainability and Integration
| Study | Focus reported in the previous review | Design lesson |
|---|---|---|
| Balakrishnan et al., 2025 — Enhanced IDS using Deep Learning with Explainable AI and GenAI | Deep learning, explanations, and synthetic data | Show understandable evidence alongside predictions |
| Khare et al., 2026 — Enhancing IDS Reliability Through Explainable ML Models | Comparison of classifiers and LIME explanations | Explanations need evaluation, not just visualization |

- Our project combines scanning, incident triage, and reporting in one workflow.
- Current rule contributions are transparent evidence, not computed SHAP/LIME values.

Say: “We use these ideas to make results easier to inspect. We do not claim to reproduce these papers' models.”

Speaker/source note: These summaries come from prep.pdf, pages 4–5 and 25. Balakrishnan's bibliographic entry is corroborated by the author's institution; detailed findings and the Khare entry still need full-text verification. Do not present lack of integration as a proven limitation of a paper without checking it.

## Slide 5 — Problem Statement
“Network-flow alerts and scam messages are often investigated through separate tools. NeuroShield IDS aims to provide one understandable workspace for analyzing these inputs, displaying risk evidence, tracking incidents, and exporting investigation reports.”

Keep this as one paragraph to follow the sample format.

## Slide 6 — Objectives
- Inspect suspicious network-flow patterns.
- Classify scam text and check suspicious URLs and media evidence.
- Explain risk scores through visible contributing factors.
- Support incident triage, controlled demonstrations, and report export.

Say: “Our four goals are analysis, explanation, investigation, and reporting.”

## Slide 7 — Requirements Specification
Place this immediately before System Architecture.

**Hardware — demonstration setup**
- Developer: Core i5 or equivalent; 8 GB RAM; SSD with 10 GB free.
- Evaluator: modern browser; 4 GB RAM; stable internet.
- Full-HD display recommended for the dashboard.

**Software**
- Windows/Linux; Node.js 24.x; Python 3.13 reference environment.
- React 18, Vite, Tailwind CSS v4.
- FastAPI, scikit-learn, Uvicorn, WebSockets.
- Vercel frontend; Render backend; browser-side PDF export.

Speaker note: Hardware values are planning recommendations, not benchmarked minimums. The current incident store is browser-session based; do not list MongoDB as an implemented dependency. Flask has been replaced by FastAPI.

## Slide 8 — Methodology: System Architecture
Insert `NEUROSHIELD_ARCHITECTURE_TRANSPARENT.svg` (or PNG).

- Browser collects editable inputs and displays investigations.
- FastAPI validates requests and runs the relevant analysis.
- Text uses ML; network and audio metadata use explicit rules.
- Results support triage and PDF export; WSS supplies demo events.

Say: “Follow the arrows: input, API, analysis, result. The separate WebSocket path keeps the demonstration feed moving.”

Speaker note: Browser audio/QR/OCR preprocessing is local. The deception workflow is simulated; it is not a deployed packet-redirection engine. REST scan results are not indiscriminately broadcast to all viewers.

## Slide 9 — DFD: Where Does the Data Go?
- Analyst submits text, a URL, or a flow record.
- NeuroShield returns a score and supporting evidence.
- Analyst updates incident status and downloads a report.

Diagram: **Analyst → NeuroShield IDS → Analyst**, with separately labeled input/output arrows. Use one system process and one external entity for a true context-level DFD. Do not include internal module boxes or decision diamonds.

Say: “This diagram shows what enters and leaves our system, without implementation details.”

## Slide 10 — CFD: How Is an Input Analyzed?
- Validate the submitted input.
- Choose the relevant analysis method.
- Generate a score and explanation.
- Display the result for analyst review.

Diagram: **Start → Submit input → Valid? → Select modality → Analyze → Score and explain → Display result → End**. The No branch from Valid? goes to Show error and returns to Submit input. Modality branches: Text → TF-IDF + Logistic Regression; URL → URL checks; Flow → Four rules; Audio metadata → Metadata rules; merge before Score and explain.

Say: “The input type decides which analysis path runs. Invalid inputs are corrected before scoring.”

## Slide 11 — STD: How Does an Incident Progress?
- Open: a finding is available for review.
- Triaged / In Progress: the analyst investigates.
- Contained / Resolved: the analyst records the outcome.
- Every status change should be interpretable from its history.

Diagram: **Open → Triaged → In Progress → Contained → Resolved**. Add a dashed arrow from Resolved to Open labeled Reopen. Label the diagram “Suggested analyst workflow”; current status selectors permit other transitions. Contained is an application status, not proof of enforced network isolation.

Say: “This tracks the investigation, not the packet path.”

## Slide 12 — Results
Replace “Work to be Done” with this slide.

- SYN Flood fixture: **100/100 Critical**; all four flow rules matched.
- Normal fixture: **0/100 Safe**; no configured flow rules matched.
- Text evaluation: **56 examples, stratified 2-fold validation**.
- Accuracy **51.79%**; macro precision **18.63%**; recall **15.91%**; F1 **13.58%**.
- Integrated workflow supports scan results, triage, and PDF export.

Say: “The flow tests behave as designed. Text cross-validation exposes weak generalization, so a larger and more balanced dataset is needed.”

Use two small real screenshots for the network results. Label them “deterministic fixture checks.” A 100/100 risk index is not 100% model accuracy. Do not describe the 2.5-second synthetic feed interval as sub-second telemetry. The results source is `chapter6-evaluation-results.json`.

## Slide 13 — Conclusion and Limitations
- One workspace connects analysis, evidence, and incident handling.
- Prepared inputs make demonstrations repeatable and editable.
- Current text model needs better data and validation.
- Honeypot routing is simulated; live enforcement is future integration.

Say: “We have built an integrated prototype and measured its current limitations.”

## Slide 14 — References
Use small but readable citations; do not explain every entry aloud.

1. B. K. Dash et al., “Enhancement of Network Security through Machine Learning and Deep Learning Techniques: A Real-Time Intrusion Detection System,” ICIDeA, 2025. DOI: 10.1109/ICIDeA64800.2025.10963052.
2. T. S. Balakrishnan et al., “Enhanced Intrusion Detection System using Deep Learning with Explainable AI and GenAI,” INCET, 2025. DOI: 10.1109/INCET64471.2025.11140795.
3. U. Venugopal, “Adversarial-Trained Deep Ensemble for Robust DDoS Intrusion Detection Using CICIDS2017,” ICKECS, 2026. DOI as supplied in previous review: 10.1109/ICKECS70176.2026.11528025. Verification pending.
4. S. Khare, S. P. Singh, and V. Kumar, “Enhancing Intrusion Detection Reliability Through Explainable Machine Learning Models,” GSEACT, 2026. DOI as supplied in previous review: 10.1109/GSEACT68539.2026.11620549. Verification pending.

Preparation links: [IEEE record for Dash](https://doi.org/10.1109/ICIDeA64800.2025.10963052); [institutional publication listing for Balakrishnan](https://mcc.edu.in/publications/). Verify pending references before final submission or omit their rows rather than presenting unverified claims.

## Slide 15 — Thank You / Live Demonstration
- Thank you.
- Questions and live demonstration.
- Demo sequence: Scam Lab → SYN Flood → Normal baseline → Incident report.

Say: “We can now show the same prepared inputs used in our demonstration.”

# Copy-ready diagram prompts for Canva AI and a second diagram AI

Use the same content prompt in Canva AI or another AI that supports flowcharts, such as a Mermaid-capable chat assistant. For the second tool, append: “Return editable Mermaid code and preserve all labels and arrow directions.” These are generation instructions, not a guarantee about a tool's export options.

## Prompt 1 — Level-0 DFD
Create a clean 16:9 academic presentation diagram titled “NeuroShield IDS — Context DFD”. Use a transparent background, navy text, cyan and violet outlines, large readable labels, and ample whitespace. Place one rectangular external entity named “Analyst / Evaluator” on the left and one rounded process named “0. NeuroShield IDS” on the right. Draw an arrow from Analyst to System labeled “Text / URL / flow records / audio metadata”. Draw a second input arrow labeled “Triage decision”. Draw an output arrow back to Analyst labeled “Risk score + explanation”. Draw another output arrow back labeled “Incident status + PDF report”. Keep labels separate from arrows. Do not include a database, internal modules, decision diamonds, live packet capture, or cloud logos. This must be a context DFD, not a control-flow chart. Export an editable vector diagram if supported.

## Prompt 2 — Analysis CFD
Create a readable landscape control-flow diagram titled “NeuroShield IDS — Analysis Workflow”. Transparent background; navy text; cyan input cards; violet analysis cards; emerald output cards; amber validation diamond. Use Start → Submit input → Valid input? The No branch leads to Show validation error and returns to Submit input. The Yes branch leads to Select modality, then four clearly separated paths: Text → TF-IDF + Logistic Regression; URL → URL checks; Network flow → Four flow rules; Audio metadata → Metadata rules. Merge the four paths into Risk score + explanation → Display result → End. Use arrowheads, concise labels, equal box widths, and no crossing connectors. This is the validated-input analysis flow; do not add actual blocking or claim every modality uses ML. Output editable shapes or SVG if supported.

## Prompt 3 — Incident STD
Create a simple state-transition diagram titled “NeuroShield IDS — Suggested Incident Workflow”. Use transparent background, navy text, and five rounded states in a horizontal sequence: Open, Triaged, In Progress, Contained, Resolved. Use cyan for Open, violet for Triaged and In Progress, amber for Contained, and emerald for Resolved. Label arrows: Assign priority, Start investigation, Record containment, Close case. Add a dashed return arrow from Resolved to Open labeled Reopen. Add a small note: “Illustrative analyst workflow; current controls allow other status changes. Containment is recorded or simulated, not verified enforcement.” Use large text, clean arrows, no extra states, and no decoration that reduces readability. Output editable shapes or SVG if supported.

# Layout and speaking tips
- Use 30–36 pt slide titles and 22–26 pt body text; keep most slides to four bullets.
- Keep diagram labels at least 18–20 pt at presentation size.
- Use the architecture graphic on a white or very pale background; its canvas is transparent.
- Explain each diagram in one sentence first, then follow its arrows.
- Keep literature accuracy claims out unless the original paper and evaluation context have been checked.
- Do not carry forward “Flask”, “MongoDB”, or “Random Forest network model” as current implementation facts.
