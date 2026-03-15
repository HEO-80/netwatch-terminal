import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Tauri expects a fixed port in development
  server: {
    port: 5173,
    strictPort: true,
    host: "localhost",
  },
  // Env vars exposed to the frontend
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    // Tauri uses Chromium — no need for old browser support
    target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
