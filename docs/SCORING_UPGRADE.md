# Scoring and presentation upgrade

## Demo
- Start the API on port 8000 and the Vite client. Open /scam-lab.
- Select a Quick Demo Example, optionally edit it, then click Inspect signal.
- Greeting returns 0. Isolated cue families are capped at 20; multiple families are required for scores above 50.
- Network presets remain editable; Execute flow analysis runs the rules. SYN flood fixture: 100; Normal traffic: 0.
- Header Light/Dark control persists in localStorage across navigation and reload.

## URL inspection
Quotes and protocol typos are normalized. A DNS-pinned HTTP HEAD probe uses a single 3-second deadline covering DNS, TCP, TLS, and the HTTP status line. Private/mixed DNS answers and nonstandard ports are not fetched. Redirects and response bodies are not fetched. A responding 403/404/405 is reachable, not a missing domain. Optional registry metadata can add up to 4 seconds after the probe.
DNS not-found and generic unavailability are distinct. Availability uncertainty gives a 35-point floor. Media-domain patterns, APK patterns and unencrypted credential cues raise a heuristic index; TLD alone is weak evidence. These are not verified threat intelligence classifications.

## Model
112 unique manually authored examples (56 additional examples), TF-IDF unigrams/bigrams, Logistic Regression C=3.0, max_iter=800, seed=42. Artifacts and manifest rebuilt. Evaluation uses the same feature configuration with stratified folds; this small project dataset does not establish real-world detection performance. Rule contributions are not SHAP/LIME values.

## Verification
19 backend regression tests passed, including private DNS rejection, pinned-IP HEAD, non-followed redirects, model context policy, network fixtures, API bounds and WebSocket delivery/cleanup.
15 frontend tests, TypeScript checking and production build passed. Build retains a non-blocking size warning for the lazy-loaded Three.js globe.
Browser checks: greeting 0, SYN flood 100, baseline 0, theme reload persistence, dashboard and incident list rendering.
Live local endpoint checks: google.com reachable/0; kirankumard.com DNS not found/35; quoted tamilmovierules.com normalized and scored 85. Availability is time-dependent.

Changes are local; deploying requires publishing both frontend changes and rebuilt backend model artifacts.
