import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoName = "turbojet-web-tool";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "production" ? `/${repoName}/` : "/",
  server: {
    port: 5173
  }
}));
