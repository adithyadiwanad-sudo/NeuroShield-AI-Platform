import React, { useEffect, useRef, useState } from "react";
import { Mic, ScanLine, UploadCloud } from "lucide-react";
import { analyzeAudio } from "./audioFeatures";

export default function MultiModalScanner() {
  const [mode, setMode] = useState("voice"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [result, setResult] = useState(null),
    [audioUrl, setAudioUrl] = useState(""),
    [position, setPosition] = useState(0);
  const canvas = useRef(),
    audio = useRef(),
    input = useRef(),
    worker = useRef(),
    generation = useRef(0),
    objectUrl = useRef(""),
    wave = useRef([]),
    busyRef = useRef(false);
  useEffect(
    () => () => {
      generation.current++;
      const activeWorker = worker.current;
      worker.current = null;
      activeWorker?.terminate().catch(() => {});
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );
  useEffect(() => {
    if (!canvas.current) return;
    const c = canvas.current,
      ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#06080f";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const values = wave.current;
    values.forEach((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * c.width;
      ctx.moveTo(x, c.height / 2 - v * c.height * 0.45);
      ctx.lineTo(x, c.height / 2 + v * c.height * 0.45);
    });
    ctx.stroke();
    ctx.strokeStyle = "#ff007f";
    ctx.beginPath();
    ctx.moveTo(position * c.width, 0);
    ctx.lineTo(position * c.width, c.height);
    ctx.stroke();
  }, [result, position, mode]);
  const reset = (next) => {
    setMode(next);
    setResult(null);
    setMessage("");
    wave.current = [];
    setPosition(0);
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = "";
    }
    setAudioUrl("");
  };
  const scan = async (file) => {
    if (!file || busyRef.current) return;
    const supported =
      mode === "voice"
        ? /^audio\//.test(file.type) ||
          /\.(wav|mp3|ogg|m4a|flac)$/i.test(file.name)
        : /image\/(png|jpeg|webp)/.test(file.type);
    if (!supported || file.size > 15 * 1024 * 1024) {
      setMessage("Choose supported audio or PNG/JPEG/WebP up to 15 MB.");
      return;
    }
    busyRef.current = true;
    wave.current = [];
    setPosition(0);
    setBusy(true);
    setResult(null);
    setMessage("Reading file locally…");
    const job = ++generation.current;
    let engine;
    try {
      if (mode === "voice") {
        if (objectUrl.current) {
          URL.revokeObjectURL(objectUrl.current);
          objectUrl.current = "";
          setAudioUrl("");
        }
        const context = new AudioContext({ sampleRate: 16000 });
        let buffer;
        try {
          buffer = await context.decodeAudioData(await file.arrayBuffer());
        } finally {
          await context.close();
        }
        if (buffer.duration > 60)
          throw new Error("Use a recording of 60 seconds or less.");
        const samples = new Float32Array(buffer.length);
        for (let c = 0; c < buffer.numberOfChannels; c++) {
          const channel = buffer.getChannelData(c);
          for (let i = 0; i < samples.length; i++)
            samples[i] += channel[i] / buffer.numberOfChannels;
        }
        const metrics = analyzeAudio(samples, buffer.sampleRate);
        if (job !== generation.current) return;
        wave.current = Array.from({ length: 240 }, (_, i) => {
          let max = 0;
          const start = Math.floor((i * samples.length) / 240),
            end = Math.floor(((i + 1) * samples.length) / 240);
          for (let n = start; n < end; n++)
            max = Math.max(max, Math.abs(samples[n]));
          return max;
        });
        objectUrl.current = URL.createObjectURL(file);
        setAudioUrl(objectUrl.current);
        setPosition(0);
        setResult({ name: file.name, ...metrics });
        setMessage(
          "Signal features extracted. Deepfake classification requires a trained voice model.",
        );
      } else {
        const bitmap = await createImageBitmap(file);
        if (bitmap.width * bitmap.height > 16000000) {
          bitmap.close();
          throw new Error("Use an image smaller than 16 megapixels.");
        }
        const c = document.createElement("canvas");
        c.width = bitmap.width;
        c.height = bitmap.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const { default: jsQR } = await import("jsqr");
        const pixels = ctx.getImageData(0, 0, c.width, c.height);
        const qr = jsQR(pixels.data, c.width, c.height);
        if (job !== generation.current) return;
        if (qr) {
          setResult({
            name: file.name,
            text: qr.data,
            urls: extractUrls(qr.data),
            method: "QR decode",
          });
          setMessage(
            "QR decoded locally. Extracted destinations are not opened automatically.",
          );
        } else {
          setMessage("Loading OCR engine; first use needs internet access…");
          const { createWorker } = await import("tesseract.js");
          engine = await createWorker("eng", 1, {
            logger: (m) => {
              if (job === generation.current && m.status === "recognizing text")
                setMessage(
                  `Extracting image text · ${Math.round(m.progress * 100)}%`,
                );
            },
          });
          worker.current = engine;
          if (job !== generation.current) return;
          const { data } = await engine.recognize(c);
          if (job !== generation.current) return;
          setResult({
            name: file.name,
            text: data.text || "No readable text found.",
            urls: extractUrls(data.text),
            method: "OCR extraction",
            confidence: data.confidence,
          });
          setMessage(
            "OCR complete. Characters may be misread; compare extracted URLs with the original image. Receipt authenticity is not verified.",
          );
        }
      }
    } catch (err) {
      if (job === generation.current)
        setMessage(
          `Unable to analyze: ${err.message || "Unsupported or damaged file."}`,
        );
    } finally {
      if (engine && worker.current === engine) {
        worker.current = null;
        await engine.terminate().catch(() => {});
      }
      if (job === generation.current) {
        setBusy(false);
        busyRef.current = false;
      }
    }
  };
  return (
    <section className="soc-card soc-scanner">
      <div className="soc-card-heading">
        <h2>
          <ScanLine size={16} /> Multimodal inspection lab
        </h2>
        <span className="soc-eyebrow">LOCAL FILE ANALYSIS</span>
      </div>
      <div className="soc-scanner-body">
        <div className="soc-segmented" role="group" aria-label="Scanner mode">
          <button
            aria-pressed={mode === "voice"}
            disabled={busy}
            onClick={() => reset("voice")}
          >
            <Mic size={14} /> Voice signal
          </button>
          <button
            aria-pressed={mode === "visual"}
            disabled={busy}
            onClick={() => reset("visual")}
          >
            <ScanLine size={14} /> QR / receipt
          </button>
        </div>
        <button
          className="soc-dropzone"
          disabled={busy}
          onClick={() => input.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            scan(e.dataTransfer.files[0]);
          }}
        >
          <UploadCloud size={25} />
          <strong>
            {busy
              ? "Analyzing…"
              : mode === "voice"
                ? "Drop a voice recording or browse"
                : "Drop a QR code or payment receipt"}
          </strong>
          <small>
            {mode === "voice"
              ? "WAV, MP3, OGG, M4A, FLAC · up to 60s"
              : "PNG, JPEG, WebP · up to 16 megapixels"}{" "}
            · 15 MB max
          </small>
        </button>
        <input
          ref={input}
          hidden
          type="file"
          accept={
            mode === "voice" ? "audio/*" : "image/png,image/jpeg,image/webp"
          }
          onChange={(e) => {
            scan(e.target.files[0]);
            e.target.value = "";
          }}
        />
        {mode === "voice" && (
          <>
            <canvas
              className="soc-waveform"
              ref={canvas}
              width="720"
              height="92"
              aria-label="Audio amplitude waveform"
            />
            <label className="soc-wave-seek">
              Seek recording
              <input
                type="range"
                min="0"
                max="100"
                step=".1"
                value={position * 100}
                disabled={!audioUrl}
                onChange={(e) => {
                  const value = Number(e.target.value) / 100;
                  setPosition(value);
                  if (audio.current)
                    audio.current.currentTime = value * result.duration;
                }}
              />
            </label>
            {audioUrl && (
              <audio
                ref={audio}
                controls
                src={audioUrl}
                onTimeUpdate={(e) =>
                  setPosition(e.target.currentTime / (result?.duration || 1))
                }
              />
            )}
          </>
        )}
        <p role="status" className="soc-muted">
          {message ||
            "Files stay in your browser. OCR downloads its engine and language data on first use."}
        </p>
        {result && (
          <div className="soc-scanner-result">
            <strong>{result.name}</strong>
            {mode === "voice" ? (
              <>
                <dl className="soc-facts">
                  <div>
                    <dt>Spectral centroid</dt>
                    <dd>{result.centroid.toFixed(1)} Hz</dd>
                  </div>
                  <div>
                    <dt>RMS amplitude</dt>
                    <dd>{result.rms.toFixed(4)}</dd>
                  </div>
                  <div>
                    <dt>Sampled frames</dt>
                    <dd>{result.frames} · 1024 samples / frame</dd>
                  </div>
                </dl>
                <span className="soc-eyebrow">MEAN MFCC · 13 COEFFICIENTS</span>
                <code>{result.mfcc.map((v) => v.toFixed(2)).join(" · ")}</code>
                <p className="soc-muted">
                  Mono 16 kHz · Hamming window · 26 mel filters · log energy +
                  DCT. Acoustic descriptors alone do not establish voice
                  cloning.
                </p>
              </>
            ) : (
              <>
                <span className="soc-eyebrow">{result.method}</span>
                {result.confidence != null && (
                  <p className="soc-muted">
                    OCR text confidence: {result.confidence.toFixed(1)}% (not
                    threat confidence).
                  </p>
                )}
                <pre>{result.text.slice(0, 6000)}</pre>
                <strong>Extracted URLs ({result.urls.length})</strong>
                {result.urls.map((url) => (
                  <code key={url}>{url}</code>
                ))}
                {!result.urls.length && (
                  <p className="soc-muted">
                    No HTTP(S) URL detected in the extracted text.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
function extractUrls(text) {
  return [...new Set(text.match(/https?:\/\/[^\s<>"']+/gi) || [])].slice(0, 20);
}
