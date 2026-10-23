#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";
import {
  createInventory,
  checkCandidate,
  createMeasurement,
} from "../src/lib/content-growth.mjs";

const HELP = `Read-only Viral Asia content workflow (Node built-ins; no new dependencies).
  node scripts/content-growth.mjs inventory [--snapshot saved.json] [--expected-count N] --out DIRECTORY
  node scripts/content-growth.mjs check --candidate post.json --brief brief.json [--snapshot saved.json] [--dry-run] --out DIRECTORY
  node scripts/content-growth.mjs measure --current Pages.csv --current-start YYYY-MM-DD --current-end YYYY-MM-DD [--previous Pages.csv --previous-start YYYY-MM-DD --previous-end YYYY-MM-DD] [--snapshot saved.json] --out DIRECTORY
All checks are dry runs. Dates are inclusive GSC reporting dates. Missing metrics are null.
Default output: ~/.hermes/cache/viralasia-growth/. See docs/content-growth-workflow.md.
Exit 0 success, 1 rejected candidate, 2 invalid input/network/IO error.`;
const readJson = async (path) =>
  JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
const toCsv = (rows, columns) => {
  const cell = (value) => {
    const string =
      value == null
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
    return `"${string.replaceAll('"', '""')}"`;
  };
  return (
    [columns, ...rows.map((row) => columns.map((key) => row[key]))]
      .map((row) => row.map(cell).join(","))
      .join("\r\n") + "\r\n"
  );
};
const inventoryColumns = [
  "id",
  "url",
  "title",
  "categories",
  "publishedAt",
  "updatedAt",
  "author",
  "bodyWordCount",
  "sourceUrls",
  "contextualInternalLinks",
  "missingEssentials",
  "socialOnlyReferences",
  "editorialClassificationHeuristic",
  "reviewFlags",
];
const measurementColumns = [
  "url",
  "observedIn",
  "publishedAt",
  "newPageDuringCurrentWindow",
  ...["current", "previous"].flatMap((period) =>
    ["clicks", "impressions", "ctr", "position"].map(
      (metric) => `${period}.${metric}`,
    ),
  ),
  ...["clicks", "impressions", "ctrPercentagePoints", "position"].map(
    (metric) => `delta.${metric}`,
  ),
];
const flattenMeasurement = (row) => ({
  url: row.url,
  observedIn: row.observedIn,
  publishedAt: row.publishedAt,
  newPageDuringCurrentWindow: row.newPageDuringCurrentWindow,
  ...Object.fromEntries(
    ["current", "previous", "delta"].flatMap((period) =>
      Object.entries(row[period]).map(([key, value]) => [
        `${period}.${key}`,
        value,
      ]),
    ),
  ),
});
function optionsFor(argv) {
  const [command, ...args] = argv;
  const allowed = {
    inventory: ["snapshot", "expected-count", "out"],
    check: ["snapshot", "candidate", "brief", "out", "dry-run"],
    measure: [
      "snapshot",
      "current",
      "current-start",
      "current-end",
      "previous",
      "previous-start",
      "previous-end",
      "out",
    ],
  }[command];
  if (!allowed) throw new Error("Unknown command; use --help");
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i].startsWith("--") ? args[i].slice(2) : "";
    if (!allowed.includes(key) || key in options)
      throw new Error(`Unknown or duplicate option: ${args[i]}`);
    if (key === "dry-run") options[key] = true;
    else {
      const value = args[++i];
      if (!value || value.startsWith("--"))
        throw new Error(`Missing option value: --${key}`);
      options[key] = value;
    }
  }
  return { command, options };
}
async function defaultSnapshot() {
  // The existing loader shares/caches its single public origin request.
  const { getContentSnapshot } = await import("../src/lib/build-content.mjs");
  return getContentSnapshot();
}
export async function main(
  argv,
  { loadSnapshot = defaultSnapshot, stdout = console.log } = {},
) {
  if (argv.length === 0 || argv.includes("--help")) {
    stdout(HELP);
    return 0;
  }
  const { command, options: o } = optionsFor(argv);
  const out = resolve(
    o.out ?? join(homedir(), ".hermes/cache/viralasia-growth"),
  );
  let report, snapshot, filenames;
  const provenance = {
    generatedAt: new Date().toISOString(),
    snapshotSource: o.snapshot ? resolve(o.snapshot) : null,
    publicSnapshotRequests: 0,
  };
  if (command === "inventory" || command === "check") {
    if (command === "check" && (!o.candidate || !o.brief))
      throw new Error("check requires --candidate and --brief JSON paths");
    snapshot = o.snapshot ? await readJson(o.snapshot) : await loadSnapshot();
    provenance.publicSnapshotRequests = o.snapshot ? 0 : 1;
    provenance.snapshotSource ??= "getContentSnapshot public origin";
    if (command === "inventory") {
      report = createInventory(snapshot);
      if (
        o["expected-count"] !== undefined &&
        (!/^\d+$/.test(o["expected-count"]) ||
          Number(o["expected-count"]) !== report.rows.length)
      )
        throw new Error(
          `Expected article count ${o["expected-count"]}, found ${report.rows.length}`,
        );
      filenames = [
        "inventory.json",
        "inventory.csv",
        "inventory-summary.json",
        "snapshot.json",
      ];
    } else {
      report = checkCandidate(
        await readJson(o.candidate),
        await readJson(o.brief),
        snapshot,
      );
      filenames = ["check.json"];
    }
  } else {
    if (!o.current)
      throw new Error(
        "Actual --current GSC Pages CSV is required; metrics unavailable (not zero)",
      );
    report = createMeasurement({
      currentCsv: await readFile(o.current, "utf8"),
      currentWindow: { start: o["current-start"], end: o["current-end"] },
      previousCsv: o.previous ? await readFile(o.previous, "utf8") : undefined,
      previousWindow:
        o.previous || o["previous-start"] || o["previous-end"]
          ? { start: o["previous-start"], end: o["previous-end"] }
          : undefined,
      inventory: o.snapshot
        ? createInventory(await readJson(o.snapshot))
        : undefined,
    });
    provenance.currentExport = resolve(o.current);
    provenance.previousExport = o.previous ? resolve(o.previous) : null;
    filenames = [
      "measurement.json",
      "measurement.csv",
      "measurement-summary.json",
    ];
  }
  report.provenance = provenance;
  await mkdir(out, { recursive: true });
  const json = (file, value) =>
    writeFile(join(out, file), JSON.stringify(value, null, 2) + "\n", {
      mode: 0o600,
    });
  if (command === "inventory") {
    await json("snapshot.json", snapshot);
    await json("inventory.json", report);
    await json("inventory-summary.json", { ...report.summary, provenance });
    await writeFile(
      join(out, "inventory.csv"),
      toCsv(report.rows, inventoryColumns),
      { mode: 0o600 },
    );
  } else if (command === "check") await json("check.json", report);
  else {
    await json("measurement.json", report);
    await json("measurement-summary.json", {
      ...report.summary,
      windows: report.windows,
      provenance,
    });
    await writeFile(
      join(out, "measurement.csv"),
      toCsv(report.rows.map(flattenMeasurement), measurementColumns),
      { mode: 0o600 },
    );
  }
  stdout(
    JSON.stringify(
      {
        command,
        ...("ok" in report
          ? { ok: report.ok, errors: report.errors, warnings: report.warnings }
          : { summary: report.summary }),
        provenance,
        files: filenames.map((file) => join(out, file)),
      },
      null,
      2,
    ),
  );
  return command === "check" && !report.ok ? 1 : 0;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`[content-growth] ${error.message}`);
      process.exitCode = 2;
    });
}
