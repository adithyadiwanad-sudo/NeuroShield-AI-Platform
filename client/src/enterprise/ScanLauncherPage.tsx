import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ScanLine,
  Network,
  AudioLines,
  ArrowUpRight,
  Activity,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "./PageHeader";
import { useSoc } from "./SocContext";
const options = [
  {
    title: "Scam intelligence",
    tag: "URL / SMS / EMAIL",
    icon: ScanLine,
    path: "/scam-lab",
    text: "Start with an editable phishing URL or urgency message. Run an inspection or let hands-free mode present the investigation.",
  },
  {
    title: "Network intrusion",
    tag: "FLOW / CSV / BATCH",
    icon: Network,
    path: "/intrusion",
    text: "Compare normal traffic, a SYN flood, and a traffic spike. Prepared fields and a mixed CSV batch are ready to run.",
  },
  {
    title: "Voice & visual evidence",
    tag: "AUDIO / QR / RECEIPT",
    icon: AudioLines,
    path: "/scam-lab?mode=media",
    text: "Inspect audio descriptors or extract QR and receipt content from local files. Use the vishing chip for a no-file demonstration.",
  },
];
export default function ScanLauncherPage() {
  const soc = useSoc();
  return (
    <div className="es-page">
      <PageHeader
        eyebrow="ANALYSIS / NEW INVESTIGATION"
        title="Start a new scan"
        description="Choose a signal. Your samples are ready. You stay in control."
      />
      <div className="es-panel es-scan-welcome">
        <div>
          <span className="es-eyebrow">
            PREPARE → EDIT → EXECUTE → INVESTIGATE
          </span>
          <h2>No blank forms. No setup during your demo.</h2>
          <p>
            Choose a workspace below, review its prepared input, then click
            Inspect signal or Execute flow analysis. Results appear in the same
            incident history.
          </p>
        </div>
        <ShieldCheck size={46} />
      </div>
      <div className="es-scan-options">
        {options.map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <Link className="es-panel es-scan-option" to={item.path}>
              <div className="es-between">
                <item.icon size={25} />
                <ArrowUpRight size={20} />
              </div>
              <span className="es-eyebrow">{item.tag}</span>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
              <strong>
                Open workspace <ArrowUpRight size={14} />
              </strong>
            </Link>
          </motion.div>
        ))}
      </div>
      <div className="es-panel es-tool-panel es-between es-wrap">
        <div>
          <h2>
            <Activity size={17} /> Live feed: {soc.feedStatus}
          </h2>
          <p className="es-muted">
            Server scans need FastAPI. File descriptors and manual simulator
            scenarios run locally. Incoming feed events are synthetic.
          </p>
        </div>
        <Link className="es-button" to="/integrations">
          Check service health <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  );
}
