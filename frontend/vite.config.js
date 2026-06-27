import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When running inside Docker Compose the backend is reachable at http://backend:8000.
// For local dev outside Docker, override with VITE_API_TARGET=http://localhost:8000.
const apiTarget = process.env.VITE_API_TARGET || "http://backend:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
