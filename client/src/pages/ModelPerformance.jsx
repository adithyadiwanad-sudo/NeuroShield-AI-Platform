import { useTourAction } from "../enterprise/GuidedTour";
import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Cpu, Play, Download, FlaskConical } from "lucide-react";
import PageHeader from "../enterprise/PageHeader";
import { endpoints } from "../enterprise/transport";
export const ModelPerformance = () => {
  const [data, setData] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const controller = useRef(null),
    reduced = useReducedMotion();
  useEffect(
    () => () => {
      controller.current?.abort();
      controller.current = null;
    },
    [],
  );
  const run = async (signal) => {
    signal = signal instanceof AbortSignal ? signal : undefined;
    const request = new AbortController();
    controller.current = request;
    const abort = () => request.abort();
    signal?.addEventListener("abort", abort, { once: true });
    setBusy(true);
    setError("");
    const timer = setTimeout(() => request.abort(), 60000);
    try {
      if (endpoints.error) throw new Error(endpoints.error);
      const res = await fetch(`${endpoints.apiUrl}/api/model/evaluation`, {
        signal: request.signal,
      });
      if (!res.ok) throw new Error(`Evaluation unavailable (${res.status}).`);
      const next = await res.json();
      if (!request.signal.aborted) setData(next);
    } catch (e) {
      if (controller.current === request)
        setError(
          request.signal.aborted
            ? "Evaluation timed out; check API health and retry."
            : e.message,
        );
      if (signal) throw e;
    } finally {
      signal?.removeEventListener("abort", abort);
      clearTimeout(timer);
      if (controller.current === request) setBusy(false);
    }
  };
  useTourAction("tour-evaluate", run);
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "neuroshield-measured-evaluation.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="es-page">
      <PageHeader
        eyebrow="RESEARCH / REPRODUCIBLE EVALUATION"
        title="Model evaluation & performance"
        description="Measured results. Explicit methodology. Evidence you can explain."
      >
        <button className="es-button accent" disabled={busy} onClick={run}>
          <Play size={14} />
          {busy
            ? "Evaluating…"
            : data
              ? "Refresh evaluation"
              : "Run example evaluation"}
        </button>
        <button className="es-button" disabled={!data} onClick={download}>
          <Download size={14} /> Export results
        </button>
      </PageHeader>
      <div className="es-split">
        <div className="es-monitor">
          <section className="es-panel es-tool-panel">
            <span className="es-eyebrow">READY TO RUN / NO INPUT REQUIRED</span>
            <h2>
              <Cpu size={18} /> Text classification study
            </h2>
            <p>
              One click evaluates the original project examples using two
              stratified folds. Each fold learns its own TF-IDF vocabulary and
              logistic regression model, then predicts the withheld examples.
            </p>
            <p className="es-muted">
              The fitted serving model uses augmented examples; these results
              evaluate the training approach on original examples, not a
              separate benchmark of the deployed model.
            </p>
            {busy && (
              <div role="status" className="es-scan-progress">
                Fitting folds and collecting out-of-fold predictions…
              </div>
            )}
            {error && (
              <p role="alert" className="es-error">
                {error}
              </p>
            )}
          </section>
          <div data-tour="tour-evaluate" className="es-research-metrics">
            {["accuracy", "precision", "recall", "f1"].map((metric, index) => (
              <motion.div
                className="es-panel es-tool-panel"
                key={metric}
                initial={{ opacity: 0, y: reduced ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : index * 0.06 }}
              >
                <span className="es-eyebrow">
                  {metric === "f1"
                    ? "Macro F1"
                    : metric === "accuracy"
                      ? "Accuracy"
                      : `Macro ${metric}`}
                </span>
                <strong className="es-big-value">
                  {data ? `${(data.metrics[metric] * 100).toFixed(1)}%` : "—"}
                </strong>
                <small className="es-muted">
                  {data ? "Measured cross-validation" : "Run to measure"}
                </small>
              </motion.div>
            ))}
          </div>
          <section className="es-panel es-tool-panel">
            <h2>Confusion matrix</h2>
            <p className="es-muted">
              Rows = actual class · columns = predicted class · diagonal =
              correct classifications.
            </p>
            {data ? (
              <div className="es-matrix-scroll">
                <table className="es-matrix">
                  <thead>
                    <tr>
                      <th>Actual / predicted</th>
                      {data.classes.map((name, index) => (
                        <th key={name} title={name}>
                          {index + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.confusionMatrix.map((row, i) => (
                      <tr key={data.classes[i]}>
                        <th>
                          {i + 1}. {data.classes[i]}
                        </th>
                        {row.map((count, j) => (
                          <td
                            key={j}
                            className={i === j ? "diagonal" : ""}
                            aria-label={`${data.classes[i]} predicted as ${data.classes[j]}: ${count}`}
                          >
                            {count}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="es-empty">
                <FlaskConical size={28} />
                <p>Run the prepared evaluation to populate measured counts.</p>
              </div>
            )}
          </section>
        </div>
        <aside className="es-panel es-tool-panel es-research-inspector">
          <span className="es-eyebrow">RESEARCH NOTES</span>
          <h2>Read the evidence correctly.</h2>
          <dl className="es-checks">
            {[
              [
                "Dataset",
                data?.dataset || "Original project-authored text examples",
              ],
              ["Examples", data?.samples ?? "Loaded when run"],
              ["Validation", "2 stratified folds"],
              ["Random seed", "42"],
              ["Feature model", "TF-IDF · 1–3 word n-grams"],
              ["Estimator", "Logistic regression"],
              ["Scikit-learn", data?.sklearnVersion || "Awaiting API"],
              [
                "Evaluation runtime",
                data
                  ? `${data.evaluationSeconds}s (whole study)`
                  : "Not yet measured",
              ],
            ].map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="es-note">
            {data?.limitation ||
              "This small authored corpus is an educational demonstration. No production accuracy or public-dataset benchmark is claimed."}
          </p>
          <h3>Model availability</h3>
          <p>
            Text: fitted project model. Network: transparent rules. Voice:
            spectral metadata heuristics. Validated voice classification and
            network benchmark models remain separate research work.
          </p>
          <p className="es-muted">
            Evaluation results are cached until the backend restarts. Refresh
            retrieves the same reproducible study.
          </p>
        </aside>
      </div>
    </div>
  );
};
