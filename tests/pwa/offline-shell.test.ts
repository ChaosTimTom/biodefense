import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("pwa shell contract", () => {
  it("links the manifest and registers the service worker", () => {
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    expect(html).toContain('rel="manifest" href="/manifest.json"');
    expect(html).toContain('navigator.serviceWorker.register("/sw.js")');
  });

  it("keeps the manifest configured for installable standalone play", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, "public", "manifest.json"), "utf8"),
    ) as { display: string; start_url: string; icons: Array<{ src: string }> };

    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  it("pre-caches the app shell and injects build assets into the service worker", () => {
    const sw = fs.readFileSync(path.join(root, "public", "sw.js"), "utf8");
    expect(sw).toContain('"/manifest.json"');
    expect(sw).toContain('"/icons/icon-192.png"');
    expect(sw).toContain("const BUILD_ASSETS = __BUILD_ASSETS__;");
    expect(sw).toContain("...BUILD_ASSETS");
  });
});
