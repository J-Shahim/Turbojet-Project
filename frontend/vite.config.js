import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoName = "Turbojet-Project";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "production" ? `/${repoName}/` : "/",
  server: {
    port: 5173
  }
}));
