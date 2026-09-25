import React, { useState } from "react";
import { Cpu, FlaskConical } from "lucide-react";

export default function ModelAnalyticsTab() {
  const [dataset, setDataset] = useState("UNSW-NB15");
  return (
    <div className="soc-model-stats">
      <div className="soc-agent-banner">
        <FlaskConical size={22} />
        <div>
          <strong>Research evaluation workspace</strong>
          <p>ILLUSTRATIVE TARGETS · NOT MEASURED RESULTS</p>
        </div>
      </div>
      <label className="soc-model-select">
        Benchmark dataset
        <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
          <option>UNSW-NB15</option>
          <option>NSL-KDD</option>
        </select>
      </label>
      <div className="soc-model-grid">
        {[
          ["Precision", "98.4%"],
          ["Recall", "97.1%"],
          ["F1-score", "97.7%"],
          ["ROC-AUC", "0.991"],
        ].map(([label, value]) => (
          <div className="soc-card" key={label}>
            <span className="soc-eyebrow">{label}</span>
            <strong>{value}</strong>
            <small>Example target</small>
          </div>
        ))}
      </div>
      <div className="soc-latency">
        <Cpu size={18} />
        <span>Inference latency target</span>
        <strong>
          14 <small>ms</small>
        </strong>
      </div>
      <div className="soc-note">
        <span className="soc-eyebrow">{dataset} / EVALUATION PENDING</span>
        <p>
          The selected dataset is a planned benchmark. Values above are supplied
          presentation targets, not NeuroShield test results. No model run,
          split, hardware timing, or ROC curve is available for this dataset.
        </p>
      </div>
      <dl className="soc-facts">
        <div>
          <dt>Test split</dt>
          <dd>Not recorded</dd>
        </div>
        <div>
          <dt>Model version / seed</dt>
          <dd>Not recorded</dd>
        </div>
        <div>
          <dt>Measured samples</dt>
          <dd>Not available</dd>
        </div>
        <div>
          <dt>Validation status</dt>
          <dd className="soc-amber">Pending benchmark run</dd>
        </div>
      </dl>
    </div>
  );
}
