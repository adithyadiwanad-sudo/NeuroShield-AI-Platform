import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BrainCircuit } from "lucide-react";
import TypewriterText from "../TypewriterText";

export default function XAIInspector({ incident }) {
  const features = incident.features || [];
  return (
    <div className="soc-xai">
      <div className="soc-section-label">
        <span>
          <BrainCircuit size={14} /> FEATURE ATTRIBUTION
        </span>
        <span>{incident.demo ? "ILLUSTRATIVE" : "NOT PROVIDED"}</span>
      </div>
      <h3>What drove this alert?</h3>
      <p className="soc-muted">
        {incident.demo
          ? "Example contribution weights for presentation. These are not computed SHAP or LIME values and need not sum to 100%."
          : "This scan does not include measured SHAP/LIME attribution. Connect model explanations to populate this view."}
      </p>
      {features.length > 0 ? (
        <>
          <div className="soc-xai-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={features}
                layout="vertical"
                margin={{ left: 0, right: 20, top: 10, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 9, fill: "#96a7be" }}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 9, fill: "#c4d6e8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#ffffff05" }}
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #00f0ff33",
                  }}
                  formatter={(v) => [`+${v}%`, "Example impact"]}
                />
                <Bar
                  dataKey="impact"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                >
                  {features.map((f, i) => (
                    <Cell
                      key={f.name}
                      fill={["#FF007F", "#00F0FF", "#FFB800"][i % 3]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="soc-attribution-list">
            {features.map((f) => (
              <li key={f.name}>
                <span>{f.name}</span>
                <strong>+{f.impact}% impact</strong>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="soc-empty">
          Feature attribution unavailable for this record.
        </p>
      )}
      <div className="soc-note">
        <span className="soc-eyebrow">PLAIN-ENGLISH EXPLANATION</span>
        <TypewriterText text={incident.explanation} />
      </div>
      <div className="soc-note">
        <span className="soc-eyebrow">RESEARCH NOTE</span>
        <p>
          Local explanations describe model behavior; they do not establish
          causality. A trained model, feature schema, background dataset, and
          measured explainer output are needed for validated attribution.
        </p>
      </div>
    </div>
  );
}
