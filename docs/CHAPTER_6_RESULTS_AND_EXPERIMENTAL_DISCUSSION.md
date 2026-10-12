# CHAPTER 6
# RESULTS AND EXPERIMENTAL DISCUSSION

This chapter evaluates NeuroShield IDS at two distinct levels: predictive performance of the text classifier and functional behavior of the integrated security-analysis prototype. The experiments distinguish learned classification from deterministic network rules, and observed results from demonstration interfaces. A working dashboard, successful API response, or visually completed mitigation sequence does not by itself establish detection accuracy or operational attack containment.

The text results below were obtained by executing `backend.research.evaluate_examples()` in the project's local Python environment, using scikit-learn 1.9.1. Network fixture results follow the implemented four-rule scoring function. These results describe the inspected local implementation; they are not an independent audit of the deployed cloud service.

## 6.1 Performance Metrics and Model Evaluation

### 6.1.1 Experimental configuration

The NLP experiment uses 56 original project-authored text examples assigned to eight classes. The deployed training process can generate augmented examples, but the evaluation deliberately uses only the original 56 records. This avoids placing straightforward lowercase and punctuation copies of the same record across training and validation partitions. Similar wording and shared templates may still occur among the original examples, so this precaution does not establish full independence between the partitions.

**Table 6.1: Text-classification experimental configuration**

| Parameter | Evaluation setting |
|---|---|
| Dataset | Original project-authored text examples |
| Number of observations | 56 |
| Number of classes | 8 |
| Representation | Word TF-IDF, unigrams through trigrams |
| Maximum vocabulary size | 6,000 features |
| Classifier | Logistic Regression |
| Regularization parameter | C = 3 |
| Maximum solver iterations | 800 |
| Validation | Stratified 2-fold, shuffled |
| Random seed | 42 |
| Partition sizes | 28 training and 28 validation observations per fold |
| Preprocessing | TF-IDF fitted within each training fold |
| Metric aggregation | Metrics computed from pooled out-of-fold predictions |
| Undefined precision/recall handling | `zero_division=0` |
| Library version in observed run | scikit-learn 1.9.1 |

In the first fold, the model learns from one half of the corpus and predicts the other half. In the second fold, these roles are exchanged. Each observation therefore receives one prediction from a model that did not train on that observation. Vocabulary construction and inverse-document-frequency estimation occur inside the pipeline for each fold, preventing preprocessing from learning directly from that fold's validation records.

The implementation uses `cross_val_predict`, followed by metric calculation over the combined predictions. These values are pooled out-of-fold metrics, not the arithmetic mean and standard deviation of independently reported fold metrics. This distinction matters particularly for nonlinear measures such as macro F1. The official scikit-learn documentation describes the difference between collecting cross-validated predictions and aggregating fold scores [R1].

### 6.1.2 Metric definitions

Let \(C_{ij}\) denote the number of examples whose actual class is \(i\) and predicted class is \(j\). Rows represent actual labels and columns represent predicted labels. For a class \(k\), define:

\[
TP_k=C_{kk},\qquad FP_k=\sum_{i\ne k}C_{ik},\qquad FN_k=\sum_{j\ne k}C_{kj}.
\tag{6.1}
\]

Precision measures how often predictions of a class are correct, while recall measures how many examples of that class are recovered:

\[
P_k=\frac{TP_k}{TP_k+FP_k},\qquad R_k=\frac{TP_k}{TP_k+FN_k}.
\tag{6.2}
\]

The class-specific F1-score is the harmonic mean of precision and recall:

\[
F1_k=\frac{2P_kR_k}{P_k+R_k}.
\tag{6.3}
\]

When the relevant denominator is zero, the implemented metric routine assigns zero. For eight classes and 56 observations, overall accuracy and macro averages are:

\[
\operatorname{Accuracy}=\frac{\sum_k C_{kk}}{56},\qquad
P_{macro}=\frac{1}{8}\sum_k P_k,\qquad
R_{macro}=\frac{1}{8}\sum_k R_k,\qquad
F1_{macro}=\frac{1}{8}\sum_k F1_k.
\tag{6.4}
\]

Macro averaging assigns equal importance to each class, regardless of the number of examples. Macro F1 is the mean of class-specific F1 values; it is not generally the harmonic mean of macro precision and macro recall.

### 6.1.3 Observed aggregate results

**Table 6.2: Measured pooled out-of-fold performance**

| Metric | Observed value | Interpretation |
|---|---:|---|
| Accuracy | 51.79% | 29 of 56 labels predicted correctly |
| Macro precision | 18.63% | Low average reliability across the eight predicted classes |
| Macro recall | 15.91% | Weak recovery of most individual classes |
| Macro F1-score | 13.58% | Poor overall balance of class-wise precision and recall |
| Evaluation duration | 0.038 seconds | Evidence-export run of cross-validation and metric computation; not request inference latency |

The exact returned values were accuracy 0.5178571428571429, precision 0.18632075471698112, recall 0.1590909090909091, and F1 0.1358499095840868. Percentages in the tables are rounded to two decimal places. Runtime varies with hardware, library initialization, and competing processes; this single observation is not a throughput or cloud-latency benchmark.

### 6.1.4 Confusion matrix and class-wise results

The abbreviations below are BS: Banking Scam; FL: Fake Legal Notice Fraud; IS: Investment Scam; JS: Job Scam; LS: Lottery Scam; OF: OTP Fraud; PH: Phishing; and SA: Safe.

**Table 6.3: Confusion matrix, actual classes in rows and predicted classes in columns**

| Actual / Predicted | BS | FL | IS | JS | LS | OF | PH | SA | Support |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| BS | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 3 |
| FL | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 8 | 11 |
| IS | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 2 |
| JS | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 3 |
| LS | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 3 |
| OF | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 3 |
| PH | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 5 |
| SA | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 26 | 26 |
| Total | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 53 | 56 |

**Table 6.4: Per-class metrics derived from Table 6.3**

| Class | Precision | Recall | F1-score | Support |
|---|---:|---:|---:|---:|
| Banking Scam | 0.00% | 0.00% | 0.00% | 3 |
| Fake Legal Notice Fraud | 100.00% | 27.27% | 42.86% | 11 |
| Investment Scam | 0.00% | 0.00% | 0.00% | 2 |
| Job Scam | 0.00% | 0.00% | 0.00% | 3 |
| Lottery Scam | 0.00% | 0.00% | 0.00% | 3 |
| OTP Fraud | 0.00% | 0.00% | 0.00% | 3 |
| Phishing | 0.00% | 0.00% | 0.00% | 5 |
| Safe | 49.06% | 100.00% | 65.82% | 26 |

The matrix reveals a strong preference for the Safe class: 53 of 56 observations receive that prediction. Only three Fake Legal Notice Fraud examples are correctly recognized as a scam category. Six scam classes have no correct predictions and no predicted members. Their precision values are recorded as zero by the configured convention, rather than being evidence of successful negative detection.

An always-Safe classifier would obtain \(26/56=46.43\%\) accuracy on this corpus. The observed model improves on this simple baseline by only 5.36 percentage points. Thus, the apparent 51.79% accuracy must be interpreted together with the much lower macro recall and F1-score.

Collapsing the multiclass predictions into Scam versus Safe provides another diagnostic view: three of 30 scam examples are detected, while 27 are predicted Safe. Scam recall under this label-collapsing procedure is 10.00%, and the observed false-negative rate is 90.00%. All 26 Safe examples are predicted Safe. This is a post-hoc analysis of predicted class labels; it does not evaluate a separately tuned threshold on the application's aggregate non-Safe probability score.

### 6.1.5 Experimental discussion and validity limits

These results demonstrate that the evaluation pipeline is executable and exposes model weaknesses. They do not demonstrate that the current classifier is reliable for autonomous security decisions. A useful research outcome is precisely the identification of this gap between a functioning application and a sufficiently validated detector.

The small corpus, uneven class distribution, and limited vocabulary coverage are plausible contributors to the observed behavior. In particular, Investment Scam has only two examples, leaving one training example per fold. However, attributing the errors to any single cause would require controlled experiments. Class weighting, character n-grams, additional independently collected examples, and alternative regularization strengths are hypotheses to test, not demonstrated improvements.

A stronger follow-up study should expand the corpus, deduplicate related messages, group near-duplicate templates within the same partition, and reserve an independent final test set. Model selection should occur using training-side validation rather than repeated adjustment against the final test set. Results should include class-wise recall, calibration, confidence intervals, and threshold-dependent false-negative and false-positive trade-offs. Cross-validation variability cannot be inferred from a single pooled metric report.

The present results are not UNSW-NB15, NSL-KDD, or CICIDS benchmark results. The network-rule score and audio-metadata score are not evaluated by this text confusion matrix. No ROC-AUC, deepfake detection accuracy, production inference-latency distribution, or real honeypot containment rate is established by this experiment.

## 6.2 Feature Comparative Matrix

The comparison in Table 6.5 is an architectural comparison using explicitly defined reference configurations. “Traditional Firewall” refers here to a basic packet-filtering or stateful access-control configuration without added analytics services. “Academic Project” refers to a standalone offline classifier demonstration used as a comparison baseline. Academic projects vary widely, and this column is not a claim about all academic systems. Modern commercial security products may provide substantially broader functionality than the basic firewall configuration considered here.

**Table 6.5: Feature comparison of defined reference configurations and NeuroShield IDS**

| Comparison dimension | Traditional Firewall: basic reference configuration | Academic Project: offline-classifier reference configuration | NeuroShield IDS: inspected prototype |
|---|---|---|---|
| Inspection scope | Network access decisions based on configured addresses, ports, protocols, and connection state | One prepared dataset or input modality | Text classifier, URL checks, caller-supplied network-flow rules, audio metadata, and browser-side audio/image inspection |
| Response strategy | Enforce configured allow/deny policy at the network boundary | Display predicted label and evaluation output | Present evidence, risk index, analyst triage, and simulated mitigation/honeypot transitions; no confirmed infrastructure enforcement |
| Telemetry latency | Deployment-dependent; no common measurement supplied in this comparison | Batch or user-triggered output; no persistent telemetry assumed | Synthetic feed scheduled every 2.5 seconds, plus event-driven result presentation; end-to-end latency not benchmarked |
| Research delivery | Policy and event logs; academic report generation outside this reference scope | Dataset, model, and metric tables | Reproducible small-corpus evaluation, confusion matrix, editable fixtures, incident history, and IEEE-style PDF export |
| Explanation | Matched policy or rule | Depends on the selected classifier demonstration | Rule evidence and plain-English explanations; displayed rule impacts are not validated SHAP/LIME attributions |
| Interaction | Administrative rule configuration | Notebook, script, or basic form in this reference configuration | Integrated SOC topology, persistent investigation panel, scanning workspace, and Kanban triage |
| Operational status | Enforcement-capable when installed in the traffic path | Experimental analytical baseline | Integrated academic prototype; incident persistence and deception remain limited to the implemented application scope |

The principal contribution of NeuroShield is the integration of analysis, presentation, and incident handling into one evaluable workflow. The matrix does not establish superiority in detection accuracy, operational protection, or latency. Such claims would require named competing implementations, equivalent datasets and hardware, and repeatable measurements under a shared protocol.

The WebSocket producer interval is 2.5 seconds, equivalent to a nominal 0.4 events per second. This is not a sub-second interval. Time from a generated event to browser display is a separate quantity, influenced by transport, server scheduling, and browser rendering. Neither an interval setting nor a browser state-update timer is a substitute for a measured end-to-end latency distribution.

## 6.3 Detailed Descriptions of Test Case Fixtures

### 6.3.1 Purpose and scoring method

The network fixtures test whether the implemented flow-analysis rules respond predictably to controlled inputs. They are functional tests of a deterministic rule index, not samples from a benchmark capable of estimating detection accuracy.

The score combines four conditions: packet rate of at least 500 packets/s contributes 40 points; forward packets greater than ten times the maximum of one and backward packets contributes 30; a positive SYN count with zero ACK contributes 20; and byte rate of at least 100,000 bytes/s contributes 10. Thus:

\[
S=40I(r_p\ge500)+30I(n_f>10\max(1,n_b))+20I(n_{SYN}>0\land n_{ACK}=0)+10I(r_b\ge100000).
\tag{6.5}
\]

Here \(I\) is one when a condition is true and zero otherwise. A score of 100 means all configured conditions match; it is not a 100% probability that an attack is occurring.

**Table 6.6: Exact editable network fixture values**

| Input field | SYN Flood fixture | Normal Baseline fixture |
|---|---:|---:|
| Destination_Port | 80 | 443 |
| Flow_Duration | 500 | 15,000 |
| Total_Fwd_Packets | 850 | 25 |
| Total_Bwd_Packets | 2 | 30 |
| Flow_Bytes_s | 100,000 | 380 |
| Flow_Packets_s | 1,700 | 3.6 |
| SYN_Flag_Count | 1 | 1 |
| ACK_Flag_Count | 0 | 1 |

These fixtures supply duration, counts, and rates as independent fields. The scoring function does not reconstruct rates from duration and packet totals. They should therefore be presented as rule-triggering inputs rather than physically validated packet captures. Destination port and duration are contextual fields in this rule set; neither directly contributes score.

### 6.3.2 Test case TC-NIDS-01: SYN Flood fixture

**Objective:** verify that an asymmetric, high-rate, unacknowledged SYN pattern activates all four rules.

**Procedure:**

1. Open Network Intrusion Detection and load the SYN Flood preset.
2. Confirm that the populated fields match Table 6.6. Leave them unchanged for the reproducible baseline run.
3. Execute flow analysis and inspect the returned score and feature evidence.
4. Record the displayed severity and analysis method alongside the result.

The packet rate of 1,700 exceeds 500, producing 40 points. Forward traffic satisfies \(850>10\times2\), producing 30 points. SYN is present and ACK is absent, producing 20 points. The byte rate equals the inclusive threshold of 100,000, producing the remaining 10 points. The deterministic result is therefore **100/100, Critical**, with the analysis title “Possible flood pattern.”

The fixture resembles selected flow-level symptoms associated with an incomplete-handshake flood. It does not prove the existence of an attacker, count failed handshakes from raw packets, or measure service exhaustion. The SYN and ACK fields are caller-supplied summaries rather than flags extracted by an installed live capture sensor.

### 6.3.3 Test case TC-NIDS-02: Normal Baseline fixture

**Objective:** verify that the baseline input activates none of the configured rules.

**Procedure:**

1. Switch to the Normal traffic preset after the SYN Flood demonstration.
2. Confirm the baseline values in Table 6.6 and execute a new analysis.
3. Verify that the previous critical result is replaced by the baseline result.
4. Compare the evidence list and score against the preceding fixture.

The packet rate is below 500, forward packets do not exceed ten times backward packets, ACK is present, and the byte rate is below 100,000. The resulting score is **0/100**, with the title “Baseline flow review” and no matching rule evidence.

For report terminology, this may be described as the **low-risk baseline scenario**. However, the application's exact severity label for zero is **Safe**, not Low. The current severity mapping is Critical at 85 and above, High at 65–84, Medium at 35–64, Low at 1–34, and Safe at zero. A screenshot caption should preserve the displayed Safe label. Zero only means no configured rule matched; it is not proof that the traffic is benign.

**Table 6.7: Expected rule outcomes for the two fixtures**

| Rule | SYN Flood contribution | Normal contribution |
|---|---:|---:|
| High packet rate | 40 | 0 |
| Forward/reverse packet imbalance | 30 | 0 |
| SYN without ACK | 20 | 0 |
| Elevated byte rate | 10 | 0 |
| Total risk index | 100 | 0 |
| Application severity | Critical | Safe |

### 6.3.4 Interpretation and extended testing

The two fixtures demonstrate opposite ends of the rule index and support an understandable evaluator walkthrough. Passing them confirms these specific input-to-output mappings; it does not estimate precision, recall, or resistance to evasion on real network traffic.

Further experiments should probe boundaries: packet rates just below and at 500; byte rates just below and at 100,000; forward counts equal to and greater than ten times the reverse count; and ACK changing from zero to one. These are recommended additional experiments, not results claimed by this chapter. Realistic evaluation would also include legitimate high-volume transfers, asymmetric routing, retransmissions, and attacks that do not satisfy these four rules.

## 6.4 System Snapshot Placeholders and Figure Captions

The following markers indicate where actual screenshots should be inserted. They are not fabricated experimental evidence. Capture screenshots from the same identified build where possible, and retain the relevant input values, method labels, and connection state. Use prepared demonstration data instead of personal messages, credentials, or sensitive network information.

[INSERT FIGURE 6.1: Real-Time SOC Command Center]

**Figure 6.1: Integrated SOC Command Center with telemetry status, topology visualization, live event feed, and persistent investigation panel.**

The snapshot should show the connection badge, one selected incident, its timestamp, and the 65/35 monitoring-to-inspection layout. It demonstrates that incident selection links the main feed to a contextual detail view. The caption or surrounding text should identify the feed as synthetic demonstration telemetry. Animated node positions do not establish actual geolocation or a discovered physical network.

[INSERT FIGURE 6.2: Multi-Modal Scam Lab]

**Figure 6.2: Multi-Modal Scam Lab displaying editable prepared input and the resulting analysis evidence.**

Capture a completed text or URL scenario with the submitted input, score, method provenance, and explanation visible. This demonstrates the path from an editable fixture to an API result without requiring an evaluator to type from scratch. If audio inspection is included, distinguish locally computed descriptors or supplied spectral metadata from a trained synthetic-voice verdict. A single scenario result is illustrative and does not replace the corpus-level metrics in Section 6.1.

[INSERT FIGURE 6.3: SYN Flood Fixture — 100/100 Critical Risk]

**Figure 6.3: Deterministic network-rule analysis of the SYN Flood fixture, producing a 100/100 Critical index.**

The screenshot should include the populated flow values and the four contributing rules. Evaluators should be able to connect each condition to the 40, 30, 20, and 10 point contributions. This demonstrates traceable scoring rather than a trained NIDS model or an observed real attack.

[INSERT FIGURE 6.4: Normal Baseline Fixture — 0/100 Safe]

**Figure 6.4: Normal Baseline fixture producing a zero rule index and the application's Safe severity label.**

Show the new baseline input and result together so that the reduction from the preceding Critical result is unambiguous. This snapshot supports the low-risk baseline discussion while preserving the actual application label. Explain that none of the four configured conditions matched; do not describe zero as a security guarantee.

[INSERT FIGURE 6.5: Incidents Kanban and Analyst Triage]

**Figure 6.5: Incident lifecycle management using the Kanban board and explicit analyst status controls.**

Capture a readable incident card in Contained, alongside available status controls and, where accessible, its history. The image demonstrates workflow organization and manual triage. A card moved to Contained records an application-level decision; it does not prove that a firewall rule was installed or an endpoint was isolated. Identify the session-scoped nature of the prototype's incident storage in the discussion.

[INSERT FIGURE 6.6: Red Team and Simulated Honeypot Routing]

**Figure 6.6: Controlled injection scenario showing simulated scoring and honeypot-routing state transitions.**

Show the injected scenario, deception setting, and resulting event history. The snapshot demonstrates the simulator's response orchestration and the explanation of a deception-based response strategy. Label the routing as simulated. Evidence of actual network redirection would require separate packet captures, enforcement acknowledgments, and isolated-environment records, which this screenshot does not supply.

[INSERT FIGURE 6.7: Model Performance and Cross-Validation Results]

**Figure 6.7: Measured stratified two-fold text-classification results and the eight-class confusion matrix.**

Run the evaluation and capture dataset size, fold count, method description, and observed metrics. The screenshot should correspond to 51.79% accuracy, 18.63% macro precision, 15.91% macro recall, and 13.58% macro F1 for the evaluated version. Ensure the matrix axes are identifiable. If a later code or dataset revision changes the results, regenerate the tables and disclose that revision rather than combining mismatched evidence.

[INSERT FIGURE 6.8: IEEE-Style Incident PDF Report]

**Figure 6.8: Exported academic incident report containing incident metadata, feature evidence, response history, and a scoped SHA-256 digest.**

Use a PDF page that keeps the incident identifier and relevant analytical evidence readable. The report demonstrates portable documentation of an investigation. The digest covers the implementation's selected incident fields; it is not a digital signature or a hash of every original evidence file. “IEEE-style” describes formatting and does not imply IEEE certification or publication acceptance.

[INSERT FIGURE 6.9: Executive View and Guided Presentation Controls]

**Figure 6.9: Executive summary view with guided presentation controls for evaluator-led discussion.**

Show the summary view and, in a build containing the guided tour, the current step and pause/navigation controls. This demonstrates how a presenter can interrupt automation and discuss a result without entering new data. Capture this feature from a verified build that includes it; its local implementation does not by itself establish that it is deployed on the public domain.

### Evidence interpretation

Together, the figures should document coherent navigation, visible evidence, reproducible inputs, and traceable results. Their role is to establish usability and functional integration. Predictive effectiveness must be supported by the measured evaluation, while operational containment and latency require separate experiments. The strongest defensible conclusion is that NeuroShield provides an integrated academic security-analysis prototype whose current text evaluation reveals substantial room for improvement before operational reliance.

### References and reproducibility

[R1] scikit-learn, [Cross-validation: evaluating estimator performance](https://scikit-learn.org/stable/modules/cross_validation.html), especially the discussion of obtaining predictions by cross-validation.

Primary implementation evidence: `backend/research.py` for text evaluation and flow rules; `backend/models/training_examples.json` for the original corpus; `backend/models/manifest.json` for training provenance; `backend/main.py` for severity mapping; and `client/src/enterprise/networkInputs.js` for the editable presets.

From the repository root on Windows, the evaluated method can be reproduced using:

```powershell
.\backend\.venv\Scripts\python.exe -c "import json; from backend.research import evaluate_examples; print(json.dumps(evaluate_examples(), indent=2))"
```

The companion `chapter6-evaluation-results.json` records the output of this chapter's evaluation and the two fixture checks. It preserves the distinction between observed classifier metrics and deterministic network-rule results.
