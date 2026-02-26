import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@sim": path.resolve(__dirname, "src/sim"),
      "@gen": path.resolve(__dirname, "src/gen"),
      "@game": path.resolve(__dirname, "src/game"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: "ES2020",
    outDir: "dist",
    // base is "/" since we use a custom domain (no subpath needed)
  },
  base: "/",
});
