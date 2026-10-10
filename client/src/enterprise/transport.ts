import { resolveEndpoints } from "./apiConfig";
import { isIncident } from "./domain";
import type { Incident } from "./domain";
import type { Analysis } from "./analysis";
export const endpoints = resolveEndpoints(
  {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_WS_URL: import.meta.env.VITE_WS_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  import.meta.env.DEV,
);
export type ScanKind = "url" | "text" | "audio";
export type ScanResponse = {
  success: true;
  analysis: Analysis;
  incident: Incident;
  threatScore: number;
  smishingProbability: number | null;
  syntheticVoiceLikelihood: number | null;
};
export async function scanSignal(
  kind: ScanKind,
  input: string,
  signal: AbortSignal,
  demo = false,
): Promise<ScanResponse> {
  if (endpoints.error) throw new Error(endpoints.error);
  const body =
    kind === "audio"
      ? {
          transcript: input,
          metadata: {
            spectralCentroid: 4100,
            spectralFlatness: 0.78,
            pitchVariance: 3.2,
            durationSeconds: 12,
          },
          demo: true,
        }
      : { [kind === "url" ? "url" : "text"]: input, demo };
  const response = await fetch(`${endpoints.apiUrl}/api/scan-${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      typeof error?.detail === "string"
        ? error.detail
        : `Analysis service returned ${response.status}. Check the input and retry.`,
    );
  }
  const data = await response.json();
  if (
    data.success !== true ||
    !isIncident(data.incident) ||
    !Array.isArray(data.analysis?.checks) ||
    !Array.isArray(data.analysis?.features) ||
    !Array.isArray(data.analysis?.phrases) ||
    !Array.isArray(data.analysis?.axes)
  )
    throw new Error("Analysis service returned an invalid response.");
  return data;
}
