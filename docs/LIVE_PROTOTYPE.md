# NeuroShield live prototype

## Start locally

Requires Node 24 (for the native TypeScript test runner) and Python 3.13.
The command center and scam lab only need these two processes:

```powershell
# From the repository root, terminal 1:
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# Terminal 2:
cd client
npm ci
npm run dev -- --host 127.0.0.1 --port 3000
```

On Linux/macOS use `backend/.venv/bin/python` for the Python commands.
Open http://localhost:3000/dashboard and http://localhost:8000/docs.
No cloud credentials are required for local evaluation.

## Configuration

This is a **Vite React** application. `vite.config.js` explicitly replaces
`process.env.NEXT_PUBLIC_API_URL` and `process.env.NEXT_PUBLIC_WS_URL` at build
time. It does not expose arbitrary server environment variables.

| Setting | Local default | Cloud value |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Your Render HTTPS origin |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000/ws/live-feed` | Your Render WSS URL ending `/ws/live-feed` |
| `VITE_API_URL`, `VITE_WS_URL` | Optional aliases; take precedence | Same format |
| `VITE_LEGACY_API_URL` | `/api` proxied to Express on 5000 | Optional separately hosted Express origin plus `/api` |

Copy `client/.env.example` to `client/.env.local` to override local settings.
Restart Vite after configuration changes; cloud variables require a new frontend
build. Production builds display a configuration error when URLs are missing or
insecure instead of silently treating a localhost failure as successful analysis.

Backend settings: `DEMO_FEED_ENABLED=true`, `FEED_INTERVAL_SECONDS=2.5`,
`CORS_ORIGINS=*`, and optional `MODEL_DIR`. CORS uses wildcard origins without
credentials, as requested. A comma-separated origin list also applies to WebSocket
Origin checks. To load `backend/.env`, pass `--env-file backend/.env` to Uvicorn.

## Judge walkthrough

1. The dashboard automatically connects to the FastAPI WebSocket feed. New `INC-`
   records arrive every 2.5 seconds and update the shared store, topology, radar,
   matrix, and ingestion list. These are **server-generated demonstration events**.
2. Use **Pin investigation** or click an incident to stop automatic selection while
   ingestion continues. **Follow live signals** resumes automatic selection.
   **Pause demo stream** closes this tab's socket; it does not stop other clients.
3. Open **Multi-modal scam lab**. Each scenario chip types an editable fixture. Click Inspect signal to call the
   corresponding REST endpoint. **Start hands-free demo** cycles URL, SMS, and
   synthetic voice metadata. Stop, cancel, mode changes, and navigation abort work.
4. A scan response selects its investigation and pins it. Private submitted text
   stays in the requesting tab and is never broadcast to other WebSocket clients.
5. Open **Integrations & deception → Check API health** for actual API/model status.
6. Stop/restart FastAPI to demonstrate reconnection with capped exponential backoff.
   No fallback invents a successful REST response. Offline rules remain an explicit
   alternative in the scam lab.

The latency readout measures receipt of a WebSocket event to its React commit. It
excludes network transit and final browser paint. It is an observation, not a
universal <50 ms guarantee; development Strict Mode and slow hardware add overhead.
The ingestion list initially renders 20 rows and offers additional pages, while the
session store retains at most 100 events. Globe geometry is reused between frames.

## REST and WebSocket contracts

- `GET /api/health` (also `/health`): transport state, model availability, feed interval.
- `POST /api/scan-url`: `{ "url": "https://example.com", "demo": false }`.
  Structural rules plus public-host TLS validation and registration dates for `.com`
  and `.net`. Other registries, lookup failures, and reserved fixture domains return
  explicit unavailable values. No destination page content or redirects are fetched.
- `POST /api/scan-text`: `{ "text": "message", "demo": false }`.
  Real TF-IDF/logistic-regression inference from the bundled project-example model.
  `smishingProbability` means aggregate non-Safe model probability, **not a calibrated
  smishing-specific benchmark result**. Matched language rules are reported separately.
- `POST /api/scan-audio`: JSON with `metadata` containing `spectralCentroid` (Hz),
  `spectralFlatness` (0–1), `pitchVariance`, `durationSeconds` (0–60), optional
  `transcript`, and `demo`. This accepts supplied spectral metadata, not raw audio
  uploads. The existing browser scanner still measures uploaded audio locally.
  No voice model exists: `syntheticVoiceLikelihood` is `null`, with a separate
  transparent heuristic `threatScore`.
- `POST /api/scan-network`: `{ "flows": [numericFlow], "demo": true }`; 1–100 flows, returning `records` of scan responses, `total`, and `flagged` (score >=65). Required fields match the downloadable CSV template. Transparent rules, not a trained network classifier.
- `GET /api/model/evaluation`: cached, measured two-fold cross-validation on original authored text examples; macro metrics, confusion matrix, and methodology.
- Individual scans return `success`, `analysis`, `incident`, `threatScore`, and
  `xaiReasoning`. Explanation contributions are **not SHAP/LIME output**.
- `WS /ws/live-feed`: first `{type:"ready",demo:true,intervalSeconds:2.5,feedEnabled:true}`;
  then `{type:"incident",incident:{...},emittedAt:"UTC timestamp"}`. Sending text
  `ping` yields `{type:"pong"}`. IDs are unique, scores bounded, IPs use documentation
  ranges, and each event states its simulated action.

The API is a public research demo: 64 KiB body limit, bounded strings and metadata,
60 scans/minute/client address, 12 concurrent scans, 64 socket clients, and bounded
queues. Slow clients do not hold up the producer. TLS probes resolve once, reject
non-public/mixed DNS answers, and connect to the vetted IP with hostname validation.
No scan payloads are logged or broadcast by application code. Operator/hosting
access logs and local session storage follow their own retention settings.

## Model reproducibility

`backend/models/manifest.json` records 56 authored examples / 164 augmented rows,
training-data hash, seed, labels, and scikit-learn version. Rebuild with
`python backend/train_text_model.py` in the pinned backend environment. No claimed
precision/recall/ROC numbers are inferred from this small example set. Missing model
files fall back explicitly to text rules. Pickle artifacts are operator-trusted code;
model uploads are not accepted.

## Decoupled deployment (owner setup after push)

1. **Render**: connect this GitHub repository as a Blueprint using root `render.yaml`.
   It uses root directory `backend`, installs `requirements.txt`, and starts
   `uvicorn main:app --host 0.0.0.0 --port $PORT`. Check `/api/health` after deploy.
2. **Vercel**: import the same repository with the **repository root** as Root Directory.
   Root `vercel.json` installs/builds `client` and serves `client/dist`, including SPA
   route rewrites. Set the two `NEXT_PUBLIC_*` URLs to the actual Render service,
   using `https://` and `wss://`, then deploy.
3. Verify `/dashboard`, `/scam-lab`, `/incidents`, REST scenario buttons, and socket
   reconnection on the public URLs. Run `python backend/smoke.py https://YOUR-API`
   against the deployment. It submits only synthetic fixtures and inspects example.com.

No Render/Vercel projects are created by this change. The user will connect them.
Free hosting may sleep/cold-start, so warm up the API before a presentation.
Run **one Uvicorn worker**: the demo broker/rate counters are in memory. Durable
storage, authenticated tenant isolation, distributed brokers, validated classifiers,
and actual enforcement remain future production work. Existing Express/Flask
account endpoints are separate optional services;
the upgraded network scanner and evaluation now use FastAPI, and history uses the shared session store.

## Validation

```powershell
backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -v
backend/.venv/Scripts/python.exe backend/smoke.py
npm --prefix client run typecheck
npm --prefix client test
npm --prefix client run build
```

Automated checks cover scan contracts, validation, model inference, CORS, private
network blocking, TLS/registry result integration, broadcast/disconnect behavior,
private-scan isolation, bounded queues, environment resolution, replay, audio
measurements, incident lifecycle, exports, and PDF integrity. The smoke test verifies
actual running HTTP and WebSocket transport separately from the in-process tests.

Reference docs: [FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/),
[Render FastAPI](https://render.com/docs/deploy-fastapi),
[Vite environment variables](https://vite.dev/guide/env-and-mode),
[Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

Full presentation instructions and every page control: [Judge demo guide](JUDGE_DEMO_GUIDE.md).

## Deployment verification and runtime

The frontend is React 18 + TypeScript/JSX, Tailwind 4, Framer Motion, Recharts and Three.js, built with Vite 8. Use **Node 24.x** in Vercel Project Settings. The root and client package engine declarations and client/.nvmrc record this requirement. The FastAPI backend uses Python 3.13 and the pinned backend requirements.

The repository-root Vercel configuration builds client/dist and rewrites application routes including /scan, /incidents, /intrusion and /scam-lab. NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL are public build-time settings, not secret storage. Set them before the production build. The frontend adds anti-framing, content-type and referrer headers. Route modules and the PDF library load on demand; the Three.js globe remains a large lazy-loaded asset.

The patched frontend dependency set passed npm audit with zero advisories at the time of this change. CI checks high/critical dependency advisories, type checking, tests and the production build. This is a deployable academic prototype, not a validated production IDS: public synthetic feed, in-memory rate limiting, session-only findings, heuristic network/voice scoring and simulated enforcement remain deliberate boundaries. Legacy account services require separate Express/database hosting.
