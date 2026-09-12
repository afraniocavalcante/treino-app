// Ships one deploy to both targets: the Vercel-hosted PWA and the OTA manifest
// the native app's Settings screen checks against.
//
// Uses `vercel build` + `vercel deploy --prebuilt` (not a plain `vercel --prod`)
// so the exact local build — the one with the zip/manifest injected into it —
// is what gets deployed, instead of Vercel re-running `next build` remotely
// (which would silently drop the OTA files and bake a different version).
//
// Usage: node scripts/deploy.mjs [--skip-vercel] [--skip-cap-sync]

import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VERCEL_STATIC_DIR = path.join(ROOT, ".vercel", "output", "static");
const OUT_DIR = path.join(ROOT, "out");
const PROD_URL = "https://treino-app-snowy.vercel.app";
const ZIP_NAME = "treino-bundle.zip";

const args = process.argv.slice(2);
const skipVercel = args.includes("--skip-vercel");
const skipCapSync = args.includes("--skip-cap-sync");

function run(cmd, { cwd = ROOT, env = {} } = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", env: { ...process.env, ...env } });
}

// e.g. 20260912-2214 — monotonic and human-readable.
const version = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .slice(0, 13);

console.log(`Building version ${version}...`);
rmSync(path.join(ROOT, ".vercel", "output"), { recursive: true, force: true });
rmSync(OUT_DIR, { recursive: true, force: true });

run("npx vercel pull --yes --environment production");
run("npx vercel build --prod --yes", { env: { NEXT_PUBLIC_BUILD_VERSION: version } });

if (!existsSync(VERCEL_STATIC_DIR)) {
  console.error("vercel build did not produce .vercel/output/static — aborting.");
  process.exit(1);
}

console.log("\nZipping bundle for OTA updates...");
run(`zip -r -q ${ZIP_NAME} .`, { cwd: VERCEL_STATIC_DIR });

writeFileSync(
  path.join(VERCEL_STATIC_DIR, "updates.json"),
  JSON.stringify({ version, url: `${PROD_URL}/${ZIP_NAME}` }, null, 2)
);
console.log(`Wrote updates.json (version ${version}).`);

// Capacitor's webDir points at out/ — mirror the exact same build there for `cap sync`.
// (`next build` with output:"export" also writes out/ on its own as a side effect;
// wipe it first so this copy — the one with the zip/manifest — wins.)
rmSync(OUT_DIR, { recursive: true, force: true });
cpSync(VERCEL_STATIC_DIR, OUT_DIR, { recursive: true });

if (!skipCapSync) {
  run("npx cap sync ios");
}

if (!skipVercel) {
  run("npx vercel deploy --prebuilt --prod --yes");
}

console.log(`\nDone. Shipped version ${version}.`);
