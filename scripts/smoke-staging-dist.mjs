import { readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const distDirectory = fileURLToPath(new URL("../dist/", import.meta.url));
const indexFile = fileURLToPath(new URL("../dist/index.html", import.meta.url));
const hashedAssetPattern = /\.[A-Za-z0-9_-]{8,}\.(?:css|js|mjs)$/;

const listFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;

    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
};

let indexStats;

try {
  indexStats = await stat(indexFile);
} catch {
  throw new Error("Staging deploy smoke check failed: dist/index.html is missing");
}

if (!indexStats.isFile()) {
  throw new Error("Staging deploy smoke check failed: dist/index.html is not a file");
}

const files = await listFiles(distDirectory);
const hashedAssets = files.filter((file) => hashedAssetPattern.test(file));

if (hashedAssets.length === 0) {
  throw new Error(
    "Staging deploy smoke check failed: dist/ has no hashed CSS or JavaScript assets",
  );
}

console.log(
  `Staging deploy smoke check passed: dist/index.html and ${hashedAssets.length} hashed asset(s) found`,
);
