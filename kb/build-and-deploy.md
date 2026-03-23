# Build, Deploy & CI/CD

> Build: Vite 7.3 · TypeScript 5.9 (strict)  
> Test: Vitest 4.x · 122 tests  
> Deploy: GitHub Actions → GitHub Pages  
> Mobile: Capacitor 8.1 (Android + iOS)  
> Domain: biodefence.theimmersivesaga.com

---

## NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start dev server (port 3000, auto-open browser) |
| `build` | `tsc --noEmit && vite build` | Type-check then bundle to `dist/` |
| `preview` | `vite preview` | Serve production build locally |
| `test` | `vitest run` | Single test run |
| `test:watch` | `vitest` | Watch mode (re-run on changes) |
| `cap:sync` | `vite build && cap sync` | Build web + sync to native projects |
| `cap:android` | `cap open android` | Open Android project in Android Studio |
| `cap:ios` | `cap open ios` | Open iOS project in Xcode |

---

## Vite Configuration (`vite.config.ts`)

```typescript
export default defineConfig({
  base: "/",                      // root path (custom domain, no subpath)
  build: {
    target: "es2020",             // modern browsers
    outDir: "dist"                // output directory
  },
  resolve: {
    alias: {
      "@sim": resolve(__dirname, "src/sim"),
      "@game": resolve(__dirname, "src/game"),
      "@gen": resolve(__dirname, "src/gen")
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
```

### Key Points

- **ES2020 target** — supports optional chaining, nullish coalescing, BigInt, dynamic imports
- **No subpath** — since we use a custom domain, base is `/` (not `/repo-name/`)
- **Path aliases** — `@sim`, `@game`, `@gen` resolve to `src/sim`, `src/game`, `src/gen`

---

## TypeScript Configuration (`tsconfig.json`)

```typescript
{
  "compilerOptions": {
    "strict": true,               // all strict flags
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,               // Vite handles bundling
    "jsx": "preserve",
    "paths": {
      "@sim/*": ["./src/sim/*"],
      "@game/*": ["./src/game/*"],
      "@gen/*": ["./src/gen/*"]
    }
  },
  "include": ["src"]
}
```

### Key Points

- **`strict: true`** — enables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, etc.
- **`noEmit: true`** — TypeScript is used only for type checking. Vite/esbuild handles compilation.
- **`moduleResolution: "bundler"`** — modern resolution that understands package.json exports
- **`isolatedModules: true`** — required for esbuild compatibility (no cross-file type inference during emit)

---

## Test Configuration (`vitest.config.ts`)

```typescript
export default defineConfig({
  test: {
    globals: true,                // no need to import describe/it/expect
    environment: "node",          // no browser environment needed
    include: ["tests/**/*.test.ts"]
  }
});
```

### Key Points

- **Node environment** — the sim layer has zero browser deps, so tests run purely in Node
- **Globals** — `describe`, `it`, `expect` available without imports
- **Test location** — all tests under `tests/sim/`

---

## GitHub Actions CI/CD

### Workflow: `.github/workflows/deploy.yml`

Triggers: push to `main` branch, or manual dispatch.

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: "dist"

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Pipeline Steps

1. **Checkout** — clone repo
2. **Setup Node 20** — with npm cache for faster installs
3. **`npm ci`** — clean install from lockfile
4. **`npm run build`** — `tsc --noEmit` (type-check) + `vite build` (bundle)
5. **Upload artifact** — `dist/` directory as GitHub Pages artifact
6. **Deploy** — publish to Pages environment

### Concurrency

`cancel-in-progress: false` ensures deployments complete. Only one Pages deployment can run at a time within the `"pages"` group.

---

## Domain Configuration

| Setting | Value |
|---------|-------|
| Domain | `biodefence.theimmersivesaga.com` |
| DNS | CNAME record → GitHub Pages |
| HTTPS | Let's Encrypt (auto-provisioned by GitHub) |
| CNAME file | `public/CNAME` (copied to `dist/` during build) |

The `CNAME` file in `public/` ensures the custom domain persists across deployments.

---

## Entry HTML (`index.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport"
    content="width=device-width, initial-scale=1.0,
             maximum-scale=1.0, user-scalable=no,
             viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style"
        content="black-translucent" />
  
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap"
        rel="stylesheet" />
  
  <title>Bio Defence</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0a1a; }
    body {
      padding: env(safe-area-inset-top)
               env(safe-area-inset-right)
               env(safe-area-inset-bottom)
               env(safe-area-inset-left);
      touch-action: none;
    }
  </style>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### Mobile Optimizations

- `viewport-fit=cover` — extends into device notches/safe areas
- `user-scalable=no, maximum-scale=1.0` — prevents pinch zoom
- `apple-mobile-web-app-capable` — iOS standalone mode
- `env(safe-area-inset-*)` — respects device notches
- `touch-action: none` — prevents browser touch gestures (scroll, back)
- `overflow: hidden` — no scrollbars

---

## Dependencies

### Runtime

| Package | Version | Purpose |
|---------|---------|---------|
| `phaser` | ^3.90.0 | Game engine |
| `@capacitor/core` | ^8.1.0 | Mobile runtime |
| `@capacitor/android` | ^8.1.0 | Android bridge |
| `@capacitor/ios` | ^8.1.0 | iOS bridge |

### Development

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.9.3 | Type checking |
| `vite` | ^7.3.1 | Bundler + dev server |
| `vitest` | ^4.0.18 | Test runner |
| `@capacitor/cli` | ^8.1.0 | Mobile tooling |

---

## Capacitor Mobile Config (`capacitor.config.ts`)

```typescript
const config: CapacitorConfig = {
  appId: "com.biodefence.app",
  appName: "Bio Defence",
  webDir: "dist",
  server: {
    androidScheme: "https"       // required for modern APIs on Android
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile"
  },
  android: {
    backgroundColor: "#0a0a1a"   // match game background
  }
};
```

### Mobile Build Flow

```bash
npm run cap:sync    # 1. Build web → sync to android/ and ios/
npm run cap:android # 2. Open in Android Studio → build APK/AAB
npm run cap:ios     # 2. Open in Xcode → build IPA
```

The `cap:sync` command:
1. Runs `vite build` to produce `dist/`
2. Copies `dist/` into `android/app/src/main/assets/public/` and `ios/App/App/public/`
3. Syncs any Capacitor plugin configs

---

## Asset Pipeline

### Shipped Assets (`public/assets/`)

| Directory | Files | Total |
|-----------|-------|-------|
| `tiles/` | 10 PNGs (empty + wall × 5 variants) | 10 |
| `germs/` | 24 PNGs (9 pathogen + 9 medicine + extras) | 24 |
| `bg/` | 4 world background PNGs | 4 |

Total: ~38 image files.

### Runtime-Generated Assets

Created in `BootScene` via `UIFactory`:
- Tool icons (20 textures: 10 normal + 10 selected)
- Lock icon
- 1×1 white pixel
- UI panels, buttons, gradients (generated per-scene as needed)

### Generation Scripts (`scripts/`)

Python scripts for generating art assets using AI models or procedural methods:

| Script | Input | Output |
|--------|-------|--------|
| `generate_flux_tiles.py` | FLUX.1-schnell model | Tile PNGs |
| `generate_tiles.py` | Procedural | Tile PNGs |
| `generate_sprites.py` | AI model | Germ/medicine PNGs |
| `generate_backgrounds.py` | AI model | World background PNGs |
| `generate_ui_assets.py` | Procedural | UI element PNGs |
| `compress_assets.py` | Raw PNGs | Optimized PNGs |

These scripts are for development only — not part of the build pipeline.
