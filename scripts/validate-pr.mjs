import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = process.env.VALIDATION_PORT || "4322";
const localBaseUrl = `http://${host}:${port}`;
const baseUrl = (process.env.VALIDATION_BASE_URL || localBaseUrl).replace(/\/$/, "");
const canonicalBaseUrl = (
  process.env.CANONICAL_BASE_URL || "https://viralasia.co"
).replace(/\/$/, "");

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code ?? signal}`));
    });
  });

const waitForPreview = async (url, preview) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (preview.exitCode !== null) {
      throw new Error(`Astro preview exited with ${preview.exitCode}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
};

await run("npm", ["run", "build:staging"]);
await run(process.execPath, ["scripts/smoke-staging-dist.mjs"]);
await run(process.execPath, ["--test", "scripts/content-routes.test.mjs"]);

let preview;
try {
  if (!process.env.VALIDATION_BASE_URL) {
    preview = spawn(
      process.execPath,
      ["node_modules/astro/astro.js", "preview", "--host", host, "--port", port],
      { stdio: "inherit" },
    );
    await waitForPreview(`${baseUrl}/`, preview);
  }

  for (const script of [
    "scripts/verify-route-migration.mjs",
    "scripts/verify-category-inventory.mjs",
    "scripts/verify-seo.mjs",
  ]) {
    await run(process.execPath, [script, baseUrl, canonicalBaseUrl]);
  }
} finally {
  preview?.kill("SIGTERM");
}
