# NeuroShield IDS — AI-Powered Cybersecurity Platform

NeuroShield IDS is an academic cybersecurity prototype combining **Machine Learning Network Intrusion Detection** (Scikit-learn Random Forest) and **NLP-based Scam & Phishing Detection** (TF-IDF + Logistic Regression).

Inspired by modern enterprise SOC security tools like CrowdStrike, Microsoft Defender, and SentinelOne, the platform features a dark futuristic React user interface, Node.js Express REST Gateway, and Python Flask ML microservice.

---

## Key Features

- 🛡️ **Network Intrusion Detection**: Upload network packet telemetry CSVs to detect DoS, Probe, Botnet, R2L, U2R, Brute Force, and Normal connection traffic.
- 📱 **NLP Scam & Fraud Detector**: Analyze SMS, WhatsApp, or email text for OTP fraud, banking scams, lottery lures, job impersonation, and investment bait with keyword highlights.
- 📧 **Phishing Email Analyzer**: Heuristic domain verification, typosquatting link analysis, and urgency prompt detection.
- 📊 **Real-Time SOC Analytics**: Recharts visualizations for threat trends, attack distribution pie charts, risk level bar charts, and live activity streams.
- 📜 **Threat Intelligence Logs**: Search, filter, export CSV audit trails, and inspect forensic details.
- 📄 **PDF Security Report Generator**: One-click download of executive threat reports with mitigation playbooks.
- 🔑 **Authentication & Profile**: JWT authentication, bcrypt password hashing, API key management, and quota telemetry.

---

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS v4, Framer Motion, Recharts, Lucide React, jsPDF
- **Backend API**: Node.js, Express, JWT, Mongoose / Embedded Storage Fallback, Multer
- **Python Microservice**: Python 3.12, Flask, Flask-CORS, Scikit-learn, Pandas, NumPy, Joblib, TF-IDF

---

## Live FastAPI prototype

The current command center and automated scam lab use the new `backend/` FastAPI service. See [Live prototype setup, API contracts, and Render/Vercel deployment](docs/LIVE_PROTOTYPE.md). The WebSocket connection is real; its background events and enforcement are explicitly simulated. Text inference uses project-example training, and audio scoring is heuristic.

## Legacy Express / Flask Setup

### 1. Python Flask ML Microservice (Port 5001)
```bash
cd flaskservice
pip install -r requirements.txt
python train_models.py
python app.py
```

### 2. Node.js Express Backend (Port 5000)
```bash
cd server
npm install
npm start
```

### 3. React Frontend Client (Port 3000)
```bash
cd client
npm install
npm run dev
```

Open browser at `http://localhost:3000` to launch the platform.

For a no-typing judge demonstration and a page-by-page control reference, see [Judge demo guide](docs/JUDGE_DEMO_GUIDE.md).
