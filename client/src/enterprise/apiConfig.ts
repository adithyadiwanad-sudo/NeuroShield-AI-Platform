export function resolveEndpoints(
  env: Record<string, string | undefined>,
  development: boolean,
) {
  const base = (
    env.VITE_API_URL ||
    env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000"
  )
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
  const explicit = (env.VITE_WS_URL || env.NEXT_PUBLIC_WS_URL || "").trim();
  if (!base)
    return {
      apiUrl: "",
      wsUrl: explicit,
      error:
        "Set NEXT_PUBLIC_API_URL (or VITE_API_URL) to the deployed FastAPI origin.",
    };
  try {
    const api = new URL(base);
    if (
      !["http:", "https:"].includes(api.protocol) ||
      api.username ||
      api.password ||
      api.search ||
      api.hash
    )
      throw new Error();
    const ws = new URL(
      explicit || `${base.replace(/^http/, "ws")}/ws/live-feed`,
    );
    if (!["ws:", "wss:"].includes(ws.protocol) || ws.username || ws.password)
      throw new Error();
    if (!development && (api.protocol !== "https:" || ws.protocol !== "wss:"))
      return {
        apiUrl: base,
        wsUrl: ws.href,
        error: "Cloud deployment requires HTTPS API and WSS WebSocket URLs.",
      };
    return { apiUrl: base, wsUrl: ws.href, error: "" };
  } catch {
    return {
      apiUrl: "",
      wsUrl: "",
      error: "Invalid API / WebSocket environment configuration.",
    };
  }
}
