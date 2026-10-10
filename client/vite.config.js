import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  let revision = process.env.VERCEL_GIT_COMMIT_SHA || "local";
  if (revision === "local") {
    try {
      revision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    } catch { /* Source archives may not contain Git metadata. */ }
  }
  return {
    plugins: [react(), {
      name: "neuroshield-build-info",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "build-info.json",
          source: JSON.stringify({ app: "NeuroShield Cyber-SOC", revision, builtAt: new Date().toISOString() }),
        });
      },
    }],
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    define: {
      "import.meta.env.VITE_BUILD_COMMIT": JSON.stringify(revision.slice(0, 8)),
      "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(
        env.NEXT_PUBLIC_API_URL || "",
      ),
      "process.env.NEXT_PUBLIC_WS_URL": JSON.stringify(
        env.NEXT_PUBLIC_WS_URL || "",
      ),
    },
    server: {
      port: 3000,
      proxy: {
        "/api": { target: "http://localhost:5000", changeOrigin: true },
      },
    },
  };
});
