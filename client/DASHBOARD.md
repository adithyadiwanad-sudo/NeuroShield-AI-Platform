# NeuroShield Cyber-SOC presentation workspace

For the live FastAPI feed, API scenarios, and deployment setup, see [Live prototype guide](../docs/LIVE_PROTOTYPE.md).

Run `npm run dev` from `client` and open `/dashboard`. Run `npm test` for replay, audio descriptor, normalization, report integrity, and pagination checks; `npm run build` produces the application bundle.

## Presentation walkthrough

1. Select **Explore demo**, or inject one of the three synthetic attacks in the simulation lab.
2. Follow the animated agent workflow in **Details**. All active investigations stay in the persistent right panel.
3. Pause the replay, scrub the timeline, or use previous/next frame. The waveform-style network chart, globe pulse/paths, trace, and workflow follow the same 81-frame sequence. This is a presentation sequence, not captured packet replay.
4. Open **XAI Feature Attribution** for the scenario's illustrative feature weights and narrative. Real scan records do not invent missing attribution.
5. Open **Actions**, simulate a response, and export the IEEE-style PDF. It contains an evidence hash, UTC timestamp, attribution matrix, and this session's mitigation history. Responses and history are not persisted after reload.
6. Use **Model Stats** to discuss planned UNSW-NB15 / NSL-KDD evaluation. The specified numbers are clearly labeled example targets, not measured benchmarks.
7. Toggle Executive / Deep SOC with the header button or Cmd/Ctrl + Shift + L. The shortcut is ignored inside editable controls.

## Scanner verification

The files under `test-fixtures` are synthetic and contain no private data:

- `synthetic-1000hz.wav`: two-second 1 kHz sine wave. Browser analysis should report a centroid close to 1000 Hz, 13 mean MFCCs, and an RMS amplitude near 0.345. Audio is decoded to mono 16 kHz; the analyzer samples up to 100 Hamming-windowed frames, each 1024 samples, with 26 mel filters and an unnormalized DCT.
- `synthetic-qr.png`: decodes to `https://example.com/neuroshield-demo`.
- `synthetic-receipt.png`: sample receipt text with an HTTP URL. OCR can misread characters; extracted text is preserved verbatim and must be checked against the image.

QR and OCR extraction run in the browser. Tesseract downloads its worker/engine/language assets on first use, so initial OCR needs internet access. Files are not sent to an analysis service. The scanner supports audio up to 60 seconds and 15 MB, and PNG/JPEG/WebP up to 16 megapixels and 15 MB. Acoustic descriptors are not a trained voice-cloning classifier, and OCR cannot validate payment receipt authenticity.

## Integration boundaries

- `/api/dashboard/analytics` is polled every 30 seconds. Connection failures are visible; demo data is opt-in. Missing numeric risk scores or confidence remain unavailable.
- The globe is an illustrative topology, not IP geolocation. WebGL failure falls back to the event feed.
- Model scoring, SHAP/LIME computation, calibrated voice classification, raw packet capture, and live mitigation are not implemented by these frontend components. Connect validated backend services before presenting those capabilities as operational.
- The report's SHA-256 covers normalized incident metadata and explanation. It does not hash original media or packet evidence. Its typography is IEEE-inspired; it is not an IEEE publication or certification.
- Tailwind v4 neon tokens live in `src/index.css`; the responsive 65/35 grid and component styles live in `src/components/layout/dashboard.css`. At mobile widths, the panels stack. Reduced-motion preferences suppress decorative motion.

## Validation performed

Production compilation and all four automated tests pass. Browser checks cover incident injection, tab selection, frame navigation, per-incident actions, XAI values, dataset selection, workstation mode shortcut, actual audio processing, QR decoding, OCR extraction, and desktop/mobile overflow. The PDF generator was rendered for visual verification; the app confirms requesting a download, but the embedded preview's download event was not independently observed.
