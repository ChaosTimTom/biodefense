import { defineConfig, type Plugin } from "vite";
import path from "path";
import fs from "fs";

/** Vite plugin: dev-mode play-session extraction endpoints */
function devlogPlugin(): Plugin {
  const outFile = path.resolve(__dirname, "devlog-output.json");
  return {
    name: "devlog-extract",
    configureServer(server) {
      // POST /__devlog-save  — browser sends localStorage data, we write to file
      server.middlewares.use("/__devlog-save", (req, res) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
          req.on("end", () => {
            fs.writeFileSync(outFile, body, "utf-8");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, file: outFile }));
          });
          return;
        }
        res.writeHead(405);
        res.end("POST only");
      });

      // GET /__devlog-extract — serves a page that reads localStorage and POSTs it
      server.middlewares.use("/__devlog-extract", (_req, res) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<!DOCTYPE html>
<html><head><title>Extracting devlog…</title></head>
<body style="font-family:monospace;background:#111;color:#0f0;padding:2em">
<h2>Extracting dev play logs…</h2>
<pre id="out">Reading localStorage…</pre>
<script>
(async () => {
  const el = document.getElementById("out");
  const raw = localStorage.getItem("bio_defence_devlog");
  if (!raw) { el.textContent = "No devlog data found in localStorage."; return; }
  const logs = JSON.parse(raw);
  el.textContent = "Found " + logs.length + " session(s). Sending to server…";
  const resp = await fetch("/__devlog-save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw
  });
  const result = await resp.json();
  el.textContent = "Done! " + logs.length + " sessions saved to:\\n" + result.file;
})();
</script></body></html>`);
      });
    },
  };
}

export default defineConfig({
  plugins: [devlogPlugin()],
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
