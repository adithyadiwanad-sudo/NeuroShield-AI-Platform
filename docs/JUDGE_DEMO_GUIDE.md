# NeuroShield — guide and judge demonstration handbook

## Start the prototype

Use the two-terminal instructions in [LIVE_PROTOTYPE.md](LIVE_PROTOTYPE.md). Keep Python on port 8000 and Vite on port 3000 running. Open http://localhost:3000/dashboard. No account, cloud hosting, or manually typed threat input is needed for the research workspace.

Before presenting: open **Integrations & deception → Check API health**. Confirm FastAPI is reachable and the feed says **CONNECTED**. Use the same browser tab throughout: its most recent 100 incidents and analyst actions are stored in session storage. Export useful records before closing the session. The background feed can eventually replace older records; pause it while explaining a specific finding.

## A seven-minute presentation without typing

1. **Command center (one minute):** point to the connected feed, incoming rows, topology and radar. Say: “The transport is a real WebSocket; the incoming attack scenarios are synthetic.” Click **Pin investigation**, then an event. Explain its risk and the right-side Details/XAI/Actions tabs. Pinning prevents new events replacing the selected investigation.
2. **Scam lab (one minute):** click **Test Bank Phishing URL**. Watch the sample appear; optionally edit it. Click **Inspect signal**. Repeat with **Test Urgency SMS**. Nothing needs to be typed from scratch. The voice chip supplies a synthetic transcript plus spectral metadata.
3. **Hands-free alternative:** click **Start hands-free demo** to automatically type and submit all three samples in a loop, about 6.5 seconds apart after each result. Click **Stop hands-free demo** before editing. Leaving the page cancels its pending sequence. Ordinary sample chips only prepare input; they do not submit it.
4. **Network intrusion detection (one minute):** the SYN flood is preloaded. Click **Execute flow analysis**. Show the 100/100 rule index and contributing rules. Click **Normal traffic**, execute again, and compare the 0/100 result. Click **Mixed batch sample**, optionally edit the CSV, then execute to compare three flows (normal 0, flood 100, traffic spike 50).
5. **Detection history (one minute):** click **Load sample history** if needed. Search or filter, select a row, open **Actions**, and export the incident PDF. **Export filtered CSV** downloads the visible filter's records. Identify synthetic rows by their DEMO labels.
6. **Red team simulator / XAI (one minute):** inject a brute-force or prompt scenario. Explain the agent progression, then review its feature bars and a response proposal. Click a simulated mitigation and show the dated history. No firewall rule is actually executed.
7. **Model evaluation (one minute):** click **Run example evaluation**. Explain accuracy, macro precision, recall, F1 and the confusion matrix. Export the JSON. Say: “These are measured two-fold results on a small project-authored text corpus, not public-dataset or production benchmarks.”
8. Finish in **Executive Mode** on the command center for a high-level briefing. Return to Deep SOC for questions.

## Shared controls on every workspace page

| Element | Use |
| --- | --- |
| NeuroShield logo | Return to the command center. |
| Left navigation / mobile menu | Switch pages; the shared incident state follows you. |
| Feed badge / sidebar connection | Actual WebSocket state: connecting, connected, paused or reconnecting. |
| Sound icon | Enable or mute the short alert sound for manually injected scenarios. Browser audio may require a click first. |
| Appearance sliders icon | Choose Ember/obsidian or Aurora/cyan; adjust glass opacity from 55–96%. These are presentation settings. |
| AN avatar | Analyst identity marker; decorative in the top bar. |
| Access account | Optional legacy account login; not needed for any judge demonstration. Requires the legacy Express/database services. |
| Risk / severity badges | Prioritization index from 0–100, with source-specific interpretation. Never assume it is calibrated certainty. |
| SIMULATION / DEMO, HEURISTIC, MODEL labels | Distinguish generated scenarios, rule results, and trained text-model inference. |
| Right-side inspector | Keeps investigation details, explanation, workflow and response controls alongside the selected record. |
| Motion | Panel entrance, hover, radar/globe and workflow progress; reduced-motion system preferences are respected. |

## Command center — `/dashboard`

| Element | Use / interpretation |
| --- | --- |
| Deep SOC / Executive Mode | Switch detailed technical view and manager briefing. Ctrl+Shift+L (Windows) or Cmd+Shift+L also toggles outside inputs. |
| Pause feed / Resume feed | Stop or resume receiving background WebSocket events. Separate from replay playback. |
| New scan | Open the scan launcher; choose Scam intelligence, Network intrusion, or Voice & visual evidence. |
| FASTAPI FEED banner | Connection and error state. The latency is receive-to-React-commit on this device, excluding network travel and final paint; under 50 ms is a target, not a guarantee. |
| Pin investigation / Follow live signals | Keep the selected record or automatically follow the newest backend event. Selecting a feed row also pins it. |
| KPI cards / flagged percentage gauge | Summaries of current session records, not organization-wide production telemetry. |
| Wireframe globe / mesh | Select a node as an alternative to selecting a feed row. Node placement and connecting paths are illustrative, not measured geolocation. |
| Anomaly chart | Illustrative scenario trend synchronized with replay; not captured packet measurements. |
| Threat surface radar | Compare signal categories from the current workspace. |
| Heatmap / geographic bars / findings charts | Summaries of stored incidents and their scenario region labels. |
| Threat stream search / severity filter | Narrow visible events by source, ID, text or severity. |
| Stream rows / Show more | Select an incident or reveal the next 20 entries. Storage remains bounded to 100. |
| Attack simulator buttons | Inject inert synthetic scenarios and animate the investigation. |
| Packet terminal | Shows the selected record's trace/payload; not a packet sniffer or shell. |
| Replay rewind / previous / play-pause / next / scrubber | Inspect the illustrative eight-second, 81-frame workflow. Pin a record first to avoid live selection resetting it. |
| Details tab | Risk, plain-English explanation and step cards: decoding, vector analysis, scoring and simulated response. Expand steps to discuss them. |
| XAI Feature Attribution | Rule contributions or illustrative scenario weights. They are not fitted SHAP/LIME values. |
| Actions | Simulated block/token revocation, endpoint isolation or whitelisting; PDF export. |
| Model Stats | Research targets and model availability. Use the dedicated Model evaluation page for measured text-corpus results. |
| Clear selected incident (X) | Return the inspector to its empty selection state. |

## Multi-modal scam lab — `/scam-lab`

- The URL field starts prefilled. The three sample chips type a URL, SMS or synthetic voice transcript. Wait until “Sample ready”, edit if desired, then **Inspect signal**. URL and Message mode tabs also preload a sample.
- **Start hands-free demo / Stop** controls automatic typing plus execution. **Cancel** interrupts typing or an in-flight request. Inputs are temporarily disabled during execution to avoid mixed results.
- **Suspicious / Routine** load alternative editable examples. **Use offline rules instead** is an explicit local alternative if FastAPI is unavailable; it never masquerades as a server result.
- **Inspection evidence** contains the explanation, matched phrases, factor radar and checks. Results are added to the shared history and select the right inspector.
- URL checks inspect structure and attempt TLS/registration age for supported public domains. Reserved `.example` demo addresses deliberately have no registration or TLS result. The page itself is not fetched.
- Text checks use the fitted TF-IDF classifier, with separate transparent language rules. The aggregate non-Safe probability is uncalibrated; the highest individual class can still be Safe. Explain both displays rather than calling the probability a definitive diagnosis.
- **Voice & visual → Voice signal:** choose/drop your own supported recording, inspect waveform, play audio, seek and inspect spectral centroid, MFCC and related descriptors. These are measurements, not proof of cloning.
- **QR / receipt:** choose/drop an image to decode QR content or extract text/URLs by OCR. It does not prove a payment receipt is authentic. OCR requires downloading engine/language data on first use.
- The **Synthetic Vishing** chip demonstrates metadata scoring without requiring a recording. It does not claim a trained voice classifier.

## Network intrusion detection — `/intrusion`

| Element | Use |
| --- | --- |
| Normal traffic / SYN flood / Traffic spike | Populate all fields instantly, leaving them editable. |
| Editable flow | Analyze one set of numbers. Destination port and duration identify the flow; rates, packet balance and flags drive the four disclosed rules. Duration is in microseconds; byte/packet rates are per second. |
| Mixed batch sample | Load three numeric CSV rows, ready to edit and run. |
| CSV batch / file chooser / drop area | Paste or upload numeric CSV with the eight required columns. Up to 100 rows and 64 KiB; malformed input produces an error. PDF/DOC files are not accepted as numeric telemetry. |
| Sample CSV | Download the exact supported template with demo rows. |
| Synthetic demonstration checkbox | Keep checked for prepared examples; uncheck for your own measured telemetry. Uploaded files default to submitted data. Editing a demo does not automatically make it real telemetry. |
| Execute flow analysis | Send the current values to FastAPI, then add results to session history. |
| Result row | Select its risk, evidence, agent visualization and Actions/PDF in the persistent inspector. |

The network engine currently applies disclosed rules; it is not a trained CICIDS2017 classifier. The older Express service remains in the repository but is not required by this page.

## Detection history — `/history`

The ledger contains seeded synthetic incidents, live demo events and your scans. **Load sample history** adds/replaces the eight labeled starter records without deleting other records. Search by title, source or ID; filter severity and Demo/Submitted provenance; **Show 20 more** expands the list. Select a row to investigate its history. KPI counts describe the entire session, while export includes all records matching the filters, not only the first 20. CSV export escapes spreadsheet formula prefixes. There is no destructive delete control or permanent backend database in this research ledger.

## Incidents & findings — `/incidents`

The default **List** shows 12 findings per page. Use Previous/Next, search, severity, and the status-count buttons to narrow results. **Clear filters** restores all records. Counts in the summary describe the whole session; matching count and CSV export respect filters. Select a card, then use **Move selected finding** to change its status. **Board** retains all five lanes with horizontal scrolling and bounded vertical scrolling per lane. Drag/drop also changes status. **Pause incoming feed** keeps the list steady while reviewing; Resume reconnects it. Every change is recorded in the incident history. A zero Open count is valid when all current demo events have already been contained/resolved. **Export filtered CSV** exports all matching findings, not just the visible page.

## Inspector used across analysis pages

**Overview** shows score, source, provenance, explanation, status and time. **Inspect contributing factors** opens Evidence. **Agent** animates the illustrative processing workflow. **Evidence** shows attribution and supporting payload. **Actions** simulates block, isolation or whitelisting and appends dated events. **Export IEEE-style Incident PDF** downloads a formal incident document containing evidence hash, timestamp, attribution and mitigation history. IEEE-style refers to formatting, not IEEE certification.

## XAI & response playbooks — `/xai-playbooks`

Use the incident selector to choose a finding. Review factor bars and explanation. **IP firewall**, **AWS network ACL** and **JWT revocation** show review-only proposals. **Copy proposal** copies the displayed text; nothing is executed. Non-IP sources cannot generate an IP firewall target. AWS/JWT templates require real infrastructure details and security review before any separate deployment.

## Red team simulator — `/simulator`

Each scenario card injects its labeled sample (DDoS, SQL injection, smishing, voice, brute force or prompt injection). The inspector and **Execution journal** show progression and the simulated response. **Pause/Start stream** controls the independent backend feed. **Open command center** returns to the main visualization with the shared selection. No attack packets leave the browser.

## Integrations & deception — `/integrations`

**Live WebSocket engine** shows connection status and pause/start controls. **Check API health** calls the live FastAPI health endpoint and reports installed model status. **Trained model services** describes what is available versus still needed. **Demo routing enabled/disabled** determines whether newly injected simulator events become “Redirected”; it never changes a network route. **Deception telemetry** lists those redirected scenarios and payloads.

## Model evaluation & performance — `/model-performance`

**Run example evaluation** needs no input or upload. It makes out-of-fold predictions on original project-authored text examples using two stratified folds and seed 42. Two folds are used because the smallest class has two samples. TF-IDF is learned within each fold, without augmented copies leaking across the split.

- Accuracy: fraction of examples assigned the correct class.
- Macro precision: mean per-class proportion of predicted examples that are correct.
- Macro recall: mean per-class proportion of actual examples recovered.
- Macro F1: mean per-class harmonic mean of precision and recall.
- Confusion matrix: actual class on rows; predicted class on columns; diagonal counts are correct.
- Research notes: corpus size, algorithm, version, seed and total evaluation runtime. Runtime is not inference latency.
- Refresh: retrieves cached reproducible results until the backend restarts. Export results: download all metrics, counts, methodology and limitations as JSON.

These are small-corpus educational results, not UNSW-NB15/NSL-KDD/CICIDS2017 measurements. Similar templates may make results optimistic. The deployed text model is trained on augmented examples; this evaluation assesses the method on originals.

## Landing and optional account pages

The landing page introduces the project and links into the workspace. Account login/profile belong to the older Express authentication service and need its server/database configuration; they are not necessary for the two-process demo. Do not present unconfigured account services as connected.

## If something goes wrong during evaluation

- Feed reconnecting: check that Python is running on port 8000. Reconnection happens automatically. Pause/resume is available in Command center, Simulator and Integrations.
- Scan unavailable: use the health check, then retry. Offline rules are an explicitly labeled fallback in Scam Lab.
- Selected incident keeps changing: click Pin investigation, or select a row. Pause the feed during long explanations.
- Empty history: clear filters or Load sample history. Another browser/tab has a separate session.
- HTTPS deployment error: set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL to Render HTTPS/WSS endpoints and rebuild Vercel. Local development uses localhost defaults.
- Audio/OCR unavailable: use the voice metadata scenario and URL/SMS samples; do not claim they validate a real voice file or receipt.

## Suggested opening explanation

“NeuroShield combines live event transport, multi-modal evidence inspection, explainable rule scoring and a human-controlled response workspace. This is an academic prototype: demonstration attacks are labeled, text inference is real but trained on a small project corpus, network and voice scoring use transparent heuristics, and enforcement is simulated.”
