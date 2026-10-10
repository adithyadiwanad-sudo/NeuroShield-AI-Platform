import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    define: {
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
