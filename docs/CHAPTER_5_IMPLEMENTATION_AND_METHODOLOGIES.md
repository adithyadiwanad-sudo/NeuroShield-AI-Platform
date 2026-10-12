# CHAPTER 5
# IMPLEMENTATION AND METHODOLOGIES

NeuroShield IDS implements a security-analysis workspace that combines text classification, URL inspection, network-flow analysis, voice-metadata inspection, and incident triage. The implementation separates signal acquisition, feature preparation, scoring, explanation, transport, and presentation. This separation allows each result to retain its evidence source and methodological limitations while appearing in a common SOC interface.

The current system is an academic prototype. Its text pipeline uses a trained TF-IDF and logistic-regression model; its network and voice-metadata pipelines use transparent rules. Local audio and image inspection runs in the browser. Honeypot redirection is simulated, and the persistent WebSocket channel carries synthetic demonstration telemetry. Proposed operational enhancements are identified explicitly in this chapter so that implemented behavior is distinguishable from the methodology required for production deployment.

## 5.1 Machine Learning Pipelines and NLP Engine

### 5.1.1 Dataset preparation and model artifacts

The text engine is implemented in `backend/analysis.py`, with reproducible artifact generation in `backend/train_text_model.py`. The training manifest records 56 original project-authored examples and 164 examples after augmentation. The classifier recognizes eight labels: Banking Scam, Fake Legal Notice Fraud, Investment Scam, Job Scam, Lottery Scam, OTP Fraud, Phishing, and Safe.

The training script retains each original example and adds a lowercase version. Safe examples additionally receive punctuation variants. Since the vectorizer already lowercases text and its default word tokenizer discards punctuation delimiters, many of these variants produce identical feature vectors. This augmentation should therefore be understood mainly as repetition and class reweighting rather than independent linguistic diversity. The augmented sample count must not be presented as the number of independently collected observations.

The fitted artifacts are saved as `scam_tfidf.pkl` and `scam_model.pkl`. A manifest records the class labels, example counts, scikit-learn version, random seed, and SHA-256 digest of the original example file. This information supports reproducibility and identifies the training input. It does not constitute a held-out benchmark or prove that the model generalizes to unseen real-world scams.

At service startup, `TextModel` loads the operator-installed vectorizer and classifier, checks for the Safe class, and performs a small inference check. If loading fails, the service reports that the model is unavailable and uses transparent text rules. Uploaded model files are not accepted. This is important because pickle-compatible deserialization must be restricted to trusted artifacts.

### 5.1.2 TF-IDF vectorization

The implemented vectorizer uses word unigrams, bigrams, and trigrams with a maximum vocabulary of 6,000 features. Lowercasing is enabled. The pipeline does not add stemming, lemmatization, or a custom stop-word list. Phrase features allow the model to distinguish expressions such as “verify account,” “share OTP,” and “legal action” from isolated words.

Let the training collection contain \(M\) documents, and let \(c_{t,d}\) denote the count of term or n-gram \(t\) in document \(d\). With the vectorizer's default count-based term frequency and smoothed inverse document frequency, the weighting is:

\[
\operatorname{tf}(t,d)=c_{t,d}
\tag{5.1}
\]

\[
\operatorname{idf}(t)=\ln\left(\frac{1+M}{1+\operatorname{df}(t)}\right)+1
\tag{5.2}
\]

where \(\operatorname{df}(t)\) is the number of training documents containing \(t\). The unnormalized weight and the final L2-normalized feature are:

\[
z_{t,d}=\operatorname{tf}(t,d)\operatorname{idf}(t),\qquad
x_{t,d}=\frac{z_{t,d}}{\sqrt{\sum_j z_{j,d}^{2}}}.
\tag{5.3}
\]

A document with no recognized vocabulary features remains a zero vector rather than being divided by zero. The classifier may still produce probabilities from its intercepts; absence of recognized terms does not establish that a message is safe. The vectorizer uses raw term counts, not logarithmic term frequency, because `sublinear_tf` is not enabled. These choices correspond to the configured scikit-learn TF-IDF behavior. [R1]

Inference always calls `transform` on the fitted vectorizer. It does not refit the vocabulary or IDF values on the submitted message. This maintains compatibility between the feature coordinates used during training and those supplied to the classifier.

### 5.1.3 Logistic-regression classification

For a feature vector \(\mathbf{x}\in\mathbb{R}^{V}\), where \(V\leq6000\), the multinomial model assigns each of the eight classes a linear score:

\[
a_k=\mathbf{w}_k^{\mathsf{T}}\mathbf{x}+b_k.
\tag{5.4}
\]

The class probabilities follow the softmax function:

\[
P(y=k\mid\mathbf{x})=
\frac{\exp(a_k)}{\sum_{j=1}^{K}\exp(a_j)},
\qquad K=8.
\tag{5.5}
\]

The predicted category is the class with the largest probability. Under an unweighted summed-loss convention, the L2-regularized training objective can be written as:

\[
\mathcal{J}(W,b)=
-\sum_{i=1}^{M}\log P(y_i\mid\mathbf{x}_i)
+\frac{1}{2C}\lVert W\rVert_F^2.
\tag{5.6}
\]

Equivalent average-loss expressions rescale the regularization term. The implementation specifies `C=3.0`, `max_iter=800`, and `random_state=42`, while using the library's default L-BFGS solver and L2 regularization configuration. The parameter \(C\) is the inverse regularization strength: smaller values impose stronger coefficient shrinkage. The iteration limit is a convergence limit, not the number of examples or epochs reported as an evaluation result. [R2]

The displayed text risk score is derived from the complement of the Safe-class probability:

\[
R_{\text{text}}=
\operatorname{round}\left(100\,[1-P(y=\text{Safe}\mid\mathbf{x})]\right).
\tag{5.7}
\]

This is an aggregate non-Safe estimate across seven categories. Although the response field is named `smishingProbability`, its implementation is not limited to SMS phishing. The value is uncalibrated and does not establish that fraud occurred. A particular predicted class and the aggregate non-Safe score describe different aspects of the output and should both be explained during evaluation.

**Algorithm 5.1 Text training and inference**

```text
TRAIN(original examples):
    create the documented repetition and punctuation variants
    fit a word TF-IDF vectorizer with n-grams 1 through 3
    cap the vocabulary at 6000 features
    transform training text into a sparse matrix
    fit logistic regression with C = 3 and max_iter = 800
    save the vectorizer, classifier and training manifest

ANALYZE_TEXT(message):
    validate the message and extract transparent language cues
    if the trusted fitted model is available:
        vector = fitted_vectorizer.transform(message)
        probabilities = classifier.predict_proba(vector)
        category = class with maximum probability
        score = round(100 * (1 - probability_of_Safe))
        provenance = model
    otherwise:
        score = bounded sum of matched language-rule weights
        category = unavailable
        provenance = heuristic
    return score, category, rule evidence and normalized incident
```

### 5.1.4 Rule-based explanations and fallback scoring

The language-rule subsystem scans the input for psychological manipulation cues. Each rule family contributes its weight once when a qualifying match is present. Repeated matches affect the illustrative language-axis display, but they do not repeatedly add the family weight to the rule score.

| Cue family | Weight | Example indicator |
|---|---:|---|
| Urgency | 22 | “immediately,” “final notice” |
| Authority | 16 | “bank,” “police,” “manager” |
| Coercion | 23 | “arrest,” “suspended,” “penalty” |
| Payment | 21 | “wire,” “gift card,” “registration fee” |
| Credentials | 25 | Request to share or enter an OTP, password or PIN |
| Secrecy | 16 | “confidential,” “do not tell” |
| Link with persuasion cues | 12 | HTTP or HTTPS link accompanying another matched cue |

The fallback score is:

\[
R_{\text{rules}}=\min\left(100,\sum_j w_j I_j\right),
\tag{5.8}
\]

where \(I_j\) indicates whether rule \(j\) matched. The credential rule includes a limited check for explicit warnings such as “never share” or “do not share.” This check reduces a specific false-positive pattern; it is not a full semantic negation model.

When the classifier is active, these rule weights are supporting evidence rather than a decomposition of its probability. Consequently, the feature bars may not sum to the displayed text score. The implementation does not run SHAP or LIME. Calling the displayed bars measured model attribution would misrepresent the methodology.

### 5.1.5 URL feature extraction

The URL analyzer performs structural inspection without downloading the destination webpage. It validates the scheme, hostname and port; normalizes the hostname through IDNA; and checks for properties associated with suspicious links. The current scoring contributions are:

| URL observation | Contribution |
|---|---:|
| Unencrypted HTTP scheme | 20 |
| User information before the hostname | 25 |
| Internationalized hostname marker | 15 |
| Brand lookalike outside an official domain | 34 |
| Credential-themed hostname or path terms | 12 |
| IP-literal destination instead of a domain | 18 |
| Known registration age below three days | 24 |

The score is the sum of observed contributions capped at 100. Brand resemblance is computed using Python's `SequenceMatcher` against a configured set of brand-domain tokens. A simplified description of its matching-block ratio is \(2m/(a+b)\), where \(m\) is the number of matched elements and \(a,b\) are the two string lengths. The code also considers brand-token containment. This is a lexical resemblance heuristic, not an exhaustive homoglyph or trademark classifier.

For eligible public hostnames, the analyzer resolves addresses once and rejects external inspection when any returned address is non-public. The TLS connection uses a vetted literal address while retaining the hostname for SNI and certificate verification. Registry lookup uses a fixed RDAP provider and currently supports `.com` and `.net`. Reserved demonstration names and nonstandard ports bypass these external checks.

Domain age is calculated as a non-negative difference between the current UTC time and the registry registration time. If registration information cannot be obtained, age remains unknown. TLS failure is reported as an observation and is not automatically assigned a maliciousness score. These distinctions prevent unavailable network evidence from being treated as proof of safety or fraud.

### 5.1.6 Audio and visual metadata methodologies

The system has two separate audio paths. The local-file path extracts browser-side descriptors from a recording. The REST voice path accepts supplied metadata and an optional transcript. The current demonstration does not connect these paths into a trained end-to-end deepfake classifier.

For local recordings, Web Audio decodes the file using an audio context requested at 16 kHz. Channels are averaged to create a mono sample sequence. The feature function uses the actual decoded sample rate. Files must satisfy the format and 15 MB size checks, and decoded recordings must not exceed 60 seconds.

The feature extractor samples at most 100 frames across the recording, using a frame size of \(N=1024\). For each frame it applies the Hamming window:

\[
w[n]=0.54-0.46\cos\left(\frac{2\pi n}{N-1}\right),
\qquad 0\leq n<N.
\tag{5.9}
\]

It then computes a radix-2 FFT and the one-sided power spectrum:

\[
X[k]=\sum_{n=0}^{N-1}x[n]w[n]e^{-j2\pi kn/N},
\qquad P[k]=\frac{|X[k]|^2}{N}.
\tag{5.10}
\]

The spectral centroid is the magnitude-weighted mean frequency:

\[
SC=\frac{\sum_k f_k\sqrt{P[k]}}{\sum_k\sqrt{P[k]}},
\qquad f_k=\frac{k f_s}{N}.
\tag{5.11}
\]

The displayed centroid averages frames with non-negligible spectral magnitude. This excludes silent frames from the centroid average rather than dividing by a near-zero denominator.

For MFCC calculation, frequencies are mapped onto the Mel scale:

\[
\operatorname{mel}(f)=2595\log_{10}\left(1+\frac{f}{700}\right).
\tag{5.12}
\]

Twenty-six triangular filters accumulate spectral energy. For filter \(m\), the implementation takes the natural logarithm of its energy with a floor of \(10^{-12}\). The first 13 cosine-transform coefficients are calculated as:

\[
E_m=\sum_k P[k]H_m[k],\qquad
c_r=\sum_{m=0}^{25}\ln\bigl(\max(E_m,10^{-12})\bigr)
\cos\left(\frac{\pi r(m+0.5)}{26}\right),
\quad r=0,\ldots,12.
\tag{5.13}
\]

The implementation averages these coefficients across sampled frames and does not apply an additional orthonormal DCT scaling factor. Whole-recording amplitude is summarized using root mean square:

\[
\operatorname{RMS}=\sqrt{\frac{1}{L}\sum_{n=0}^{L-1}x[n]^2}.
\tag{5.14}
\]

These are signal descriptors, not a synthetic-speech verdict. In particular, the current local feature function does not calculate the pitch variance and spectral flatness required by the separate REST metadata schema. The synthetic-vishing scenario supplies illustrative values for those fields.

The REST voice review index is:

\[
R_{\text{voice}}=
25\,\mathbb{1}[V_p<8]
+25\,\mathbb{1}[F_s>0.65]
+15\,\mathbb{1}[SC>3500]
+30\,\mathbb{1}[R_{\text{transcript}}\geq35].
\tag{5.15}
\]

Here \(V_p\), \(F_s\), and \(SC\) are caller-supplied pitch variance, spectral flatness, and spectral centroid. \(R_{\text{transcript}}\) is the language-rule score, not the logistic-regression score. The current weights total at most 95 on the common 0–100 scale. A validated pitch estimator, a calibrated voice model, and evidence of how these metadata fields were measured would be required for a defensible deepfake probability. The current API therefore returns `syntheticVoiceLikelihood=null`.

For images, the browser decodes supported files, limits image dimensions, attempts QR extraction through jsQR, and performs OCR using Tesseract.js. Extracted text and URL candidates are displayed as evidence. Local OCR may download its engine and language assets, but the selected image is not submitted to the FastAPI scanner by this local workflow. A decoded payment receipt is not proof of payment; the current implementation does not query a bank or payment provider to establish transaction authenticity.

### 5.1.7 Evaluation methodology

The evaluation endpoint uses the 56 original examples rather than the augmented training copies. It constructs a pipeline containing a TF-IDF vectorizer and logistic regression, then obtains out-of-fold predictions using two stratified folds with shuffling and seed 42. The vocabulary and classifier are fitted independently within each training fold. This prevents fitting preprocessing on examples that belong to that fold's validation partition. [R3]

For class \(k\), precision, recall, and F1 are:

\[
P_k=\frac{TP_k}{TP_k+FP_k},\quad
Q_k=\frac{TP_k}{TP_k+FN_k},\quad
F1_k=\frac{2P_kQ_k}{P_k+Q_k}.
\tag{5.16}
\]

Undefined divisions are assigned zero by the configured metric calculation. Macro metrics average each class's value equally:

\[
P_{\text{macro}}=\frac{1}{K}\sum_k P_k,\quad
Q_{\text{macro}}=\frac{1}{K}\sum_k Q_k,\quad
F1_{\text{macro}}=\frac{1}{K}\sum_k F1_k.
\tag{5.17}
\]

Accuracy is the number of correct out-of-fold predictions divided by the number of examples. Macro F1 is the mean of per-class F1 values; it is not generally equal to the harmonic mean of macro precision and macro recall. A confusion matrix presents actual classes as rows and predicted classes as columns.

The endpoint caches the resulting study in the backend process. Repeated requests retrieve that reproducible evaluation until the process restarts. The results describe a small, authored corpus with related templates, not an independently sampled production benchmark. A later research study should use external data, grouped or temporal splits where appropriate, class-support reporting, confidence intervals and probability calibration.

## 5.2 Real-Time Network Intrusion Detection System Implementation

### 5.2.1 Input acquisition and feature schema

The NIDS implementation analyzes caller-supplied flow statistics through `/api/scan-network`. The browser prepares editable fixtures and numeric CSV batches; the server validates one to 100 records per request. The current application does not directly capture packets from an interface or calculate counters from a PCAP file. Real-time behavior refers to interactive analysis and live demonstration telemetry, rather than continuous capture from a protected production network.

The canonical record contains eight fields:

| Field | Meaning | Unit or representation |
|---|---|---|
| `Destination_Port` | Destination transport port | Integer, 0–65535 |
| `Flow_Duration` | Reported duration | Microseconds |
| `Total_Fwd_Packets` | Forward-direction packet count | Non-negative integer |
| `Total_Bwd_Packets` | Reverse-direction packet count | Non-negative integer |
| `Flow_Bytes_s` | Reported aggregate byte rate | Bytes per second |
| `Flow_Packets_s` | Reported aggregate packet rate | Packets per second |
| `SYN_Flag_Count` | Reported SYN count | Non-negative integer |
| `ACK_Flag_Count` | Reported ACK count | Non-negative integer |

The browser rejects malformed numeric CSV values, duplicate headers and missing required columns. Server validation independently rejects invalid ranges, non-finite values and unknown fields. Browser validation improves error feedback; server validation is the authoritative boundary.

### 5.2.2 Flow rate and directional balance

For a future packet-derived flow with forward count \(N_f\), reverse count \(N_b\), total bytes \(B_f+B_b\), and duration \(T\) seconds, conventional rates are:

\[
\lambda_p=\frac{N_f+N_b}{\max(T,\varepsilon)},\qquad
\lambda_B=\frac{B_f+B_b}{\max(T,\varepsilon)}.
\tag{5.18}
\]

Here \(\varepsilon\) is a documented positive duration floor that avoids division by zero. When duration is supplied in microseconds, \(T=T_{\mu s}/10^6\). A sensor integration must define capture boundaries, timeout handling, and treatment of incomplete flows before using these equations.

The implemented API trusts the supplied rate fields after type and range validation; it does not recompute them from counts and duration. Prepared fixtures are independent values selected to demonstrate rule thresholds, not reconstructed packet captures. A production feature adapter should additionally verify semantic consistency between counts, rates and duration.

The implemented directionality rule measures **packet imbalance**:

\[
I_{\text{imbalance}}=
\mathbb{1}\left[N_f>10\max(1,N_b)\right].
\tag{5.19}
\]

Byte balance is a related but distinct feature. If a future sensor provides separate directional byte counters, a normalized byte-balance measure could be:

\[
\beta_B=\frac{B_f-B_b}{B_f+B_b+\varepsilon_B},
\tag{5.20}
\]

where \(\varepsilon_B>0\) has byte units. Values near +1 indicate predominantly forward bytes; values near zero indicate similar directional byte totals. The present eight-field schema does not include \(B_f\) and \(B_b\), so this feature is proposed and cannot be inferred from `Flow_Bytes_s` alone. Current byte-related detection is an aggregate byte-rate threshold.

### 5.2.3 TCP flag inspection and rule scoring

A SYN flood can produce a high rate of connection initiation and a large imbalance between initiation and return traffic. The prototype approximates this pattern using positive SYN count and zero ACK count together with rate and directionality rules. It does not reconstruct a complete TCP handshake or track the state of individual half-open connections.

The implemented score is:

\[
R_{\text{NIDS}}=
40\,\mathbb{1}[\lambda_p\geq500]
+30\,\mathbb{1}[N_f>10\max(1,N_b)]
+20\,\mathbb{1}[SYN>0\land ACK=0]
+10\,\mathbb{1}[\lambda_B\geq100000].
\tag{5.21}
\]

The rule contributions make the score reproducible and explainable. A score of at least 65 produces the title “Possible flood pattern.” A nonzero score below 65 produces “Network flow review,” while zero produces “Baseline flow review.” These labels express review priority, not proof of a particular attack family.

The API also maps scores to common severity categories: Critical at 85 or above; High at 65–84; Medium at 35–64; Low above zero and below 35; and Safe at zero. A zero score indicates no match to the configured rules, not a guarantee that every aspect of the flow is benign.

**Algorithm 5.2 Deterministic network-flow inspection**

```text
ANALYZE_NETWORK(batch):
    validate batch size and every required numeric field
    for each flow:
        evidence = empty list
        if packet_rate >= 500:
            append high packet rate, 40 points
        if forward_packets > 10 * max(1, reverse_packets):
            append directional packet imbalance, 30 points
        if SYN_count > 0 and ACK_count == 0:
            append SYN without ACK, 20 points
        if byte_rate >= 100000:
            append elevated byte rate, 10 points
        risk = sum of evidence weights
        assign review title and common severity
        create incident with original flow and heuristic provenance
    return all records and number with risk >= 65
```

### 5.2.4 SYN flood versus normal-traffic demonstration

The prepared examples demonstrate how each rule contributes to a result:

| Property | SYN flood fixture | Normal fixture |
|---|---:|---:|
| Destination port | 80 | 443 |
| Forward packets | 850 | 25 |
| Reverse packets | 2 | 30 |
| Packet rate | 1700/s | 3.6/s |
| Byte rate | 100000/s | 380/s |
| SYN count | 1 | 1 |
| ACK count | 0 | 1 |
| High-rate contribution | 40 | 0 |
| Packet-imbalance contribution | 30 | 0 |
| SYN-without-ACK contribution | 20 | 0 |
| Byte-rate contribution | 10 | 0 |
| Total review score | **100/100** | **0/100** |

For the flood example, \(850>10\times2\), the packet and byte rates meet their thresholds, and ACK count is zero. For the baseline, none of the four predicates is true. The resulting comparison is a deterministic test of implementation logic. It is not a sensitivity, specificity or accuracy measurement on a representative traffic dataset.

### 5.2.5 Operational limitations and extension methodology

Legitimate flash crowds, asymmetric routing, sampled traffic and incomplete capture can resemble parts of the rule pattern. Conversely, low-rate distributed activity can fall below static thresholds. The absence of a protocol field also means the server does not independently verify that a supplied record represents TCP. The interpretation of SYN and ACK fields therefore depends on the producer's schema discipline.

A future sensor should attach protocol, verified endpoints, capture timestamps, sensor identity, packet-loss counters and a feature-schema version. A trained NIDS adapter would require the exact feature ordering and preprocessing used during model training. Results on CICIDS2017, UNSW-NB15 or NSL-KDD should only be reported after an appropriate dataset-specific integration and evaluation; the current four-rule implementation does not establish those benchmark results.

## 5.3 Active Deception and Honeypot Routing Architecture

### 5.3.1 Implemented deception workflow

The current deception workflow is implemented in the browser's SOC context and domain-transition functions. A simulator action creates a synthetic incident with a unique identifier, explanatory features and an initial phase. Timers advance it to Scoring after approximately 650 ms and to a terminal demonstration phase after approximately 2 seconds.

When honeypot mode is enabled at injection time, the terminal phase is Redirected. Otherwise, the terminal phase is Blocked. An automatically managed incident becomes Contained, and its history explicitly states that honeypot redirection or blocking was simulated and no infrastructure changed.

This behavior exercises the same visual investigation and triage interfaces as other findings, but it does not issue operating-system routing commands, create a VM, intercept packets, or change an external firewall. The redirection setting is sampled when the scenario begins, making the subsequent demonstration consistent even if the toggle changes while that scenario is running.

Manual analyst decisions take precedence. Changing the triage status disables automatic management. If a later scheduled terminal transition encounters such an incident, the code preserves the manual status, sets the demonstration phase to Scored, and records that the automatic response was skipped.

**Algorithm 5.3 Implemented deception simulation**

```text
INJECT_DEMO(scenario):
    incident = create synthetic incident for scenario
    add incident to shared state and select it
    redirect = current honeypot setting
    schedule Scoring phase after 650 ms
    schedule terminal phase after 2000 ms:
        if analyst has disabled automatic management:
            preserve triage status
            record that the demo response was skipped
        otherwise:
            phase = Redirected if redirect else Blocked
            status = Contained
            append simulated-response history entry
```

### 5.3.2 Proposed dynamic routing decision

Real traffic redirection would require a server-side policy and enforcement layer. The browser should request an approved operation by incident identifier and scope; it should not supply an arbitrary firewall command for execution.

A proposed decision predicate is:

\[
\operatorname{Redirect}(i)=
\mathbb{1}[R_i\geq\tau]
\land A_i\land S_i\land H_i\land\neg E_i.
\tag{5.22}
\]

In this expression, \(R_i\) is the incident risk, \(\tau\) is an operational policy threshold, \(A_i\) indicates authorization or explicit preapproval, \(S_i\) indicates a verified in-scope target, \(H_i\) indicates an available and healthy honeypot, and \(E_i\) indicates an exempt or protected target. No production value for \(\tau\) is asserted: it must be chosen using validation evidence and the cost of false-positive disruption.

The policy should use multiple signals and target context rather than interpreting one suspicious string or one source IP as sufficient evidence. Shared NAT addresses, spoofed packets and third-party infrastructure can make automatic source-based intervention inappropriate. Unknown identity, ambiguous ownership or unavailable honeypot capacity should result in review rather than an uncontrolled redirect.

### 5.3.3 Isolated honeypot execution environment

The proposed honeypot environment would host decoy services in a separate VM or isolated network segment. It should use disposable images, restricted compute resources, no production secrets, and no writable shared production volumes. The management plane must remain separate from the network exposed to the decoy service. Outbound connectivity should be denied by default, with a narrowly scoped telemetry channel to a collector.

A routing adapter could apply a destination-NAT or SDN policy for a verified flow or narrowly defined class of new connections. The design must maintain a consistent return path and explicitly handle connection tracking. Redirecting an already established session to another host is not equivalent to applying a rule for a new connection. In particular, an existing TLS session cannot simply be transferred to an unrelated honeypot while preserving its authenticated cryptographic context.

Decoy interactions should be collected as observations, associated with the triggering incident, and retained under an explicit policy. A collector should record the action identifier, target scope, deployment revision, start and expiry times, execution acknowledgement and rollback result. These are proposed durable audit records; the current browser history does not provide that guarantee.

### 5.3.4 Proposed response algorithm and rollback

**Algorithm 5.4 Authorized operational redirection — proposed extension**

```text
REQUEST_REDIRECTION(incident_id, action_id, approved_scope, expiry):
    authenticate the caller and authorize the requested scope
    load the durable incident and verify its current revision
    reject duplicates using action_id, or return the existing result
    validate source evidence, protected-target exclusions and expiry
    verify the selected honeypot is isolated and healthy
    if policy requires approval and approval is absent:
        retain Pending Review and return without enforcement
    persist an action intent with rollback information
    ask the allowlisted adapter to apply the scoped policy
    verify adapter acknowledgement and effective policy state
    if application fails:
        roll back partial changes and record Failed
    otherwise:
        record Confirmed Redirected and schedule expiry removal
    publish the committed, redacted outcome to authorized subscribers
```

The visual incident state should distinguish requested, pending, confirmed, failed and reverted actions. A failed or unacknowledged adapter operation must not be displayed as confirmed containment. Time-limited rules, idempotent retries and a kill switch bound the impact of mistakes. This extension remains a design methodology rather than a feature already executed by NeuroShield's demonstration controls.

## 5.4 Real-Time Telemetry via Persistent WebSockets

### 5.4.1 Persistent transport and emission frequency

The frontend establishes a persistent connection to `wss://neuroshield-live-api.onrender.com/ws/live-feed` in the configured cloud deployment. The local development equivalent uses `ws://localhost:8000/ws/live-feed`. WSS encrypts the transport; it does not, by itself, provide user authorization or tenant isolation.

The backend demonstration producer waits for the configured interval, normally 2.5 seconds, and emits a synthetic incident when subscribers exist. The nominal frequency is:

\[
f_{\text{event}}=\frac{1}{2.5}=0.4\ \text{events per second}.
\tag{5.23}
\]

Thus, 2.5 seconds is not a sub-second interval. Persistent transport removes the need for the browser to issue a new polling request for each event. Delivery and rendering after an event is emitted may occur in less than one second, but that latency must be measured separately and is not guaranteed by the 2.5-second schedule. Runtime scheduling, network conditions, browser load and hosting cold starts can all affect observed behavior.

### 5.4.2 Event producer and queue management

FastAPI initializes the broker and the background producer in its application lifespan. The producer cycles through demonstration scenarios such as DDoS bursts, brute-force attempts, smishing, prompt injection, baseline traffic and synthetic voice lures. Each event contains an incident and an emission timestamp. These records are generated examples, not observations from a network tap.

For each connection, the server creates an `asyncio.Queue` with capacity 32. Publishing inserts an event into each active subscriber's queue. If a queue is already full, the oldest item is removed before the new event is appended, and a dropped-event counter is incremented. With \(n\) connected clients and queue capacity \(Q\), the number of queued references is bounded by \(nQ\); actual memory also depends on object sizes and sharing.

The implementation permits up to 64 simultaneous WebSocket clients and applies a five-second timeout to sending an event. The drop-oldest policy prioritizes recent demonstration state. It does not preserve a complete audit trail or guarantee replay after disconnect.

**Algorithm 5.5 Broadcast production and delivery**

```text
START_SERVICE:
    initialize broker, model, rate counters and analysis semaphore
    if demonstration feed is enabled:
        start one producer task

PRODUCER:
    repeat until shutdown:
        wait configured interval, normally 2.5 seconds
        if active subscribers exist:
            create next synthetic incident and envelope
            for every subscriber queue:
                if full: discard oldest event and increment drop counter
                enqueue the new envelope

ON_CONNECTION:
    enforce origin policy and connection limit
    accept socket, allocate bounded queue, send ready message
    concurrently send queued events and receive client messages
    on disconnect, timeout or shutdown:
        unregister queue, cancel tasks and close socket
```

The broker exists in one process. Adding independent Uvicorn workers would create separate subscriber sets and producers rather than a shared event bus. A multi-worker deployment requires an external broker or equivalent shared distribution mechanism. This is the same limitation described for in-memory WebSocket connection management in the FastAPI documentation. [R4]

### 5.4.3 Event envelopes and privacy boundaries

An incident envelope follows this logical shape; the application validates the full nested incident contract before accepting it:

```text
{
    type: "incident",
    incident: {
        id, timestamp, title, source, signalType,
        score, severity, explanation, features,
        demo, provenance, status, phase, history, ...
    },
    emittedAt: UTC timestamp
}
```

Connection messages use types such as `ready` and `pong`. A ready message reports whether the demonstration feed is enabled. Unknown non-incident messages are not converted into findings. Invalid incident records are ignored with an explicit feed error.

The private REST analysis path is independent of this broadcaster. A submitted message, URL or transcript is returned to its requesting browser and added to that browser's state; it is not published to every subscriber. Operational multi-user notifications would require authentication, per-tenant channels, redaction, access checks and durable event identifiers before private findings could safely be distributed.

### 5.4.4 Reconnection, heartbeat and teardown

The client sends a textual `ping` every 15 seconds while the connection is open. If it has received no message for more than 45 seconds, it closes the stale connection and lets reconnection proceed. The server places a `pong` message on the connection queue when capacity permits.

Reconnect delay increases exponentially and is capped, with a small random jitter:

\[
D_a=\min\left(30000,1000\cdot2^{\min(a,5)}\right)+U(0,300)
\quad\text{milliseconds}.
\tag{5.24}
\]

Here \(a\) is the retry-attempt index. A successful open resets the counter. The jitter helps avoid synchronized reconnection attempts after a shared outage. Cleanup cancels retry and heartbeat timers and closes the socket when streaming is paused or the component lifecycle ends. Reconnection resumes newly emitted events; it does not recover missing historical events from the current in-memory broker.

### 5.4.5 Client state updates and latency measurement

For a valid event, the client removes any existing record with the same identifier, prepends the new record, and keeps at most 100 entries. Automatic follow mode updates the selected identifier; manual selection disables follow mode so new events do not unexpectedly replace the incident under discussion.

The dashboard measures time from handling a valid incoming event to React's layout-effect phase after the corresponding state update:

\[
L_{\text{commit}}=
t_{\text{layout effect}}-t_{\text{valid event received}}.
\tag{5.25}
\]

Both timestamps use the browser's monotonic performance clock. This measurement is not backend inference time, network one-way delay, or a guarantee that the next display frame has already painted. A low displayed value therefore supports a claim about client update responsiveness only. Measuring end-to-end latency would require defined server timestamps, clock considerations, transport observations and paint instrumentation.

### 5.4.6 Failure behavior and operational extension

The interface displays connecting, connected, paused or reconnecting states and retains local findings when transport becomes unavailable. An unavailable feed must not be represented as an absence of threats. Similarly, a dropped-event counter signals loss of demonstration updates rather than a verified count of missed attacks.

A production telemetry service should add authenticated subscriptions, sequence or revision numbers, tenant-scoped event channels, an external durable broker, replay cursors and explicit delivery semantics. High-rate sources should be aggregated or coalesced before visualization. Increasing event frequency alone would not turn synthetic telemetry into real packet monitoring or establish a sub-second detection guarantee.

## 5.5 Frontend SOC Command Center and User Interface Implementation

### 5.5.1 React composition and Vite build pipeline

The frontend combines React 18, React Router, JavaScript/JSX and TypeScript components. Vite builds the application and splits route modules into separately loaded chunks. The persistent SOC shell supplies navigation, theme controls and workspace status, while page modules implement the Command Center, Scam Lab, Network NIDS, findings board, simulator, integrations and model evaluation.

The application root opens the Command Center, with the former marketing page available separately. Cloud configuration builds `client/dist` and rewrites application routes to the SPA entry point. The app also emits build-identification metadata and displays the source revision, allowing an evaluator or maintainer to distinguish an updated deployment from an older build.

API configuration supports `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` through Vite's public environment handling and compile-time definitions. These are public endpoint settings, not secret storage. Production builds use HTTPS and WSS; local development falls back to localhost. Changing a build-time setting requires rebuilding the frontend.

### 5.5.2 Tailwind CSS v4 and visual hierarchy

Tailwind v4 is imported through the main stylesheet, and `@theme` declarations define reusable colors and shadows. The cyber palette includes a dark base, cyan processing accents, magenta threat accents, emerald safe-state accents and amber warnings. The workspace also supports ember and aurora accent themes and adjustable glass opacity through CSS variables.

The desktop monitoring–inspector split is approximately 65:35. Monitoring panels emphasize trends, distribution and event selection; the persistent inspector emphasizes explanation and response. Monospaced text improves the readability of incident identifiers, addresses and terminal output, while sans-serif headings establish page hierarchy. Status text and numeric scores accompany color so severity is not conveyed by hue alone.

Framer Motion provides transitions, panel changes and small interaction animations. Reduced-motion preferences are honored for major motion effects. Loading, disabled, empty and failed states communicate the progress of requests. Animation supports orientation and presentation; it must not imply that a prediction or enforcement action has completed before the relevant operation succeeds.

### 5.5.3 Interactive 2D and 3D topology visualization

The 3D globe uses React Three Fiber to compose Three.js geometry, including a wireframe sphere, point cloud, signal nodes and connecting curves. Node selection updates the same shared incident identifier used by the event stream and inspector. Rotation and pulse positions are linked to the demonstration replay frame, allowing the visualization to correspond to an explanatory sequence rather than a separate timing loop.

For a quadratic connection curve with endpoints \(P_0,P_2\), control point \(P_1\), and animation parameter \(u\in[0,1]\), the rendered path can be expressed as:

\[
B(u)=(1-u)^2P_0+2(1-u)uP_1+u^2P_2.
\tag{5.26}
\]

A moving indicator along this path illustrates information flow. It is not a packet trace. Node coordinates and region labels are illustrative, so spatial proximity on the globe must not be interpreted as measured network adjacency or verified geographic attribution.

Recharts supplies 2D radar, area, bar and distribution views. The activity matrix provides an additional way to select events, and keyboard-accessible controls expose the same investigation operations. If WebGL cannot initialize, the event stream remains available, preserving access to incident evidence without the 3D canvas.

### 5.5.4 Kanban triage and shared incident state

The incident workspace supports Open, Triaged, In Progress, Resolved and Contained states. A paginated list is the default view, with 12 findings per page. A board view arranges cards into status columns with independent scrolling. Search, severity filters and status filters limit the visible collection without deleting records.

Selecting a card updates the persistent inspector. Dragging a card to another column or using the selected-finding status selector calls the same domain update function. The update appends a timestamped history entry and sets `autoManaged=false`, ensuring later demonstration timers do not silently override the analyst's choice.

**Algorithm 5.6 Manual triage transition**

```text
CHANGE_STATUS(incident, target_status):
    reject a status outside the allowed lifecycle vocabulary
    if target_status equals current_status: return unchanged incident
    create updated incident with target_status
    set autoManaged to false
    append timestamped status transition to history
    replace the incident in shared state
    persist the bounded session collection when storage is available
```

The shared store retains the latest 100 findings and persists them in browser session storage. This supports continuity across page navigation and reloads within a session. It does not supply cross-user synchronization, guaranteed retention or tamper-resistant evidence storage. CSV export serializes the filtered collection, escapes quotes, and guards cells that begin with spreadsheet-formula prefixes.

### 5.5.5 Guided presentation and human control

The Guided Presentation controller operates above the route pages. Each page registers named actions, such as running a prepared URL scan, submitting a SYN-flood fixture, showing report actions or requesting model evaluation. The controller waits for a lazy page to register its action before dispatching it, which avoids invoking an operation on an unmounted or unavailable view.

The sequence covers Command Center, Scam Lab, Network NIDS, incident response, red-team deception, model evaluation and Executive Q&A. Within a feature, a four-second reading period precedes the action and approximately 4.5 seconds follows the completed result. API latency is additional; the controller does not advance solely because a fixed animation time has elapsed.

Pause cancels scheduled tour work and aborts tour-owned client requests. Previous and Next change the feature section; Exit removes the banner without deleting findings. Clicking outside the controls or navigating manually pauses the tour. Resume returns to the active feature and retries its current sub-action. The final Executive view remains paused for questions.

The tour uses actual API responses rather than hardcoded classification results. Synthetic inputs and simulated response operations retain their labels. It highlights the PDF export option but does not automatically download a report. A failed analysis pauses with a retry or skip option, avoiding fabricated demonstration success.

### 5.5.6 IEEE-style incident PDF generation

The report engine dynamically imports jsPDF when an export is requested. It creates an academic two-column layout with a title, incident abstract, metadata, evidence digest, feature contribution matrix and response history. Text is wrapped to fit the column width; a layout helper moves content to the next column or page before it exceeds the available vertical space.

Before rendering, the engine serializes a fixed set of incident fields in a consistent order, including the identifier, timestamp, source, title, severity, score, explanation, features, demonstration flag and provenance. It hashes the UTF-8 encoded representation through the Web Crypto API:

\[
h=\operatorname{SHA256}\left(
\operatorname{UTF8}\left(\operatorname{JSON}(F_i)\right)\right),
\tag{5.27}
\]

where \(F_i\) is that selected field object. The digest is formatted as hexadecimal and included in the report.

The digest is not a hash of the original uploaded file or raw packet, and the chosen field set does not include every possible history or response field. It supports comparison of that incident representation but does not authenticate the report author or provide a digital signature. “IEEE-style” describes the typography and organization, not certification, acceptance or publication by IEEE.

**Algorithm 5.7 Incident report export**

```text
EXPORT_REPORT(incident, response_status, history):
    create the defined incident field object
    serialize it consistently and encode it as UTF-8
    compute SHA-256 using Web Crypto
    load jsPDF and initialize an academic two-column document
    write abstract, provenance and incident metadata
    write the digest and its scope description
    wrap and paginate feature evidence and response history
    sanitize the incident identifier used in the filename
    request the PDF download and display export outcome
```

A future forensic-report service should additionally preserve original evidence hashes, authenticated collection metadata, immutable history revisions and a verifiable signature. Those additions would address evidence integrity beyond the current browser-generated academic report.

### 5.5.7 Verification strategy and reproducibility

The implementation is verified at several boundaries. Text-pipeline tests check response contracts and explicit fallback behavior. Audio-feature tests use known signals and silence to check finite descriptors. Network tests exercise valid fixtures, malformed CSV, numeric bounds and deterministic scoring. Incident tests check status changes, replay progress, evidence hashing and safe exports. Transport tests check endpoint configuration and WebSocket behavior. Tour tests and browser checks exercise progression, cancellation, manual takeover and the final Q&A state.

Reproducibility depends on more than a random seed. The project records dependency versions, input examples, training configuration and artifact provenance. Model evaluation refits preprocessing inside each fold, and deployment builds identify the source revision. Research claims should report the exact data, split, feature schema, model configuration and metric definition used for the experiment.

The prototype demonstrates a coherent full-stack security-analysis workflow. Moving from that demonstration to an operational IDS requires authenticated data acquisition, validated modality-specific models, durable incident storage, controlled enforcement and measured performance under realistic workloads. These additions should retain the same methodological rule used throughout the implementation: present observed evidence, inferred risk, simulated activity and confirmed response as distinct facts.

### Implementation source map

| Section | Principal source modules |
|---|---|
| 5.1 | `backend/train_text_model.py`, `backend/analysis.py`, `backend/research.py`, `backend/models/manifest.json`, `client/src/components/dashboard/audioFeatures.js`, `MultiModalScanner.jsx` |
| 5.2 | `backend/main.py`, `backend/research.py`, `client/src/enterprise/networkInputs.js`, `client/src/pages/NetworkIntrusion.jsx` |
| 5.3 | `client/src/enterprise/SocContext.tsx`, `domain.ts`, `SimulatorPage.tsx` |
| 5.4 | `backend/main.py`, `client/src/enterprise/SocContext.tsx`, `transport.ts`, `apiConfig.ts` |
| 5.5 | `client/src/App.jsx`, `pages/Dashboard.jsx`, `enterprise/IncidentsPage.tsx`, `enterprise/GuidedTour.jsx`, `enterprise/tourPlan.js`, `components/dashboard/ThreatGlobe.jsx`, `components/dashboard/incidentReport.js` |

### References

[R1] scikit-learn, “TfidfVectorizer.” Configuration and TF-IDF defaults. https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html

[R2] scikit-learn, “LogisticRegression.” Regularization, solver and multiclass behavior. https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html

[R3] scikit-learn, “Cross-validation: evaluating estimator performance.” https://scikit-learn.org/stable/modules/cross_validation.html

[R4] FastAPI, “WebSockets.” Connection management and the scope of in-memory state. https://fastapi.tiangolo.com/advanced/websockets/

Equations describe the inspected implementation where stated. Byte-balance extraction, authenticated operational redirection and production telemetry extensions are proposed methods, not assertions that those integrations are currently installed.
