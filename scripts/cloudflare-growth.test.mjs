import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { periodFor, summarizeRum } from "./cloudflare-growth.mjs";

test("failed repeat collection cannot leave an available report or stale CSV", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cf-failure-"));
  try {
    await writeFile(
      join(dir, "cloudflare-report.json"),
      JSON.stringify({ status: "available", estimatedPageLoads: 100 }),
    );
    await writeFile(join(dir, "cloudflare-pages.csv"), "old,metrics");
    const result = spawnSync(
      process.execPath,
      ["scripts/cloudflare-growth.mjs", "--out", dir],
      {
        cwd: new URL("..", import.meta.url),
        encoding: "utf8",
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: "",
          CLOUDFLARE_ACCOUNT_ID: "",
        },
      },
    );
    assert.equal(result.status, 1);
    assert.equal(
      JSON.parse(await readFile(join(dir, "cloudflare-report.json"), "utf8"))
        .status,
      "unavailable",
    );
    await assert.rejects(access(join(dir, "cloudflare-pages.csv")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("Cloudflare period uses complete UTC days and an exclusive end", () => {
  assert.deepEqual(periodFor({ now: new Date("2026-10-23T13:05:00Z") }), {
    start: "2026-09-25T00:00:00.000Z",
    end: "2026-10-23T00:00:00.000Z",
  });
  assert.throws(() => periodFor({ start: "bad", end: "2026-10-23" }));
  assert.throws(() => periodFor({ start: "2026-10-23", end: "2026-10-22" }));
});

test("synthetic RUM fixtures retain sampling and distinguish AI referrals from citations", () => {
  const row = (dimensions, count) => ({
    dimensions,
    count,
    sum: { visits: count },
    avg: { sampleInterval: 10 },
  });
  const result = summarizeRum(
    {
      pages: [row({ requestPath: "/blog/example/" }, 20)],
      sources: [
        row({ refererHost: "chatgpt.com" }, 10),
        row({ refererHost: "" }, 10),
      ],
    },
    { start: "2026-09-25", end: "2026-10-23" },
  );
  assert.equal(result.estimatedPageLoads, 20);
  assert.equal(result.pages[0].estimatedPageLoads, 20);
  assert.equal(result.maxSampleInterval, 10);
  assert.equal(result.aiReferralPageLoads, 10);
  assert.equal(result.googleSearchConsoleClicks, null);
  assert.equal(result.aiCitations, null);
  assert.match(result.measurementNote, /sample/i);
});

test("reject incomplete, capped or contradictory analytics instead of manufacturing totals", () => {
  assert.throws(() => summarizeRum({}, {}));
  assert.throws(() =>
    summarizeRum({ pages: Array(10000).fill({}), sources: [] }, {}),
  );
  assert.throws(() =>
    summarizeRum(
      {
        pages: [
          {
            count: -1,
            sum: { visits: 0 },
            avg: { sampleInterval: 10 },
            dimensions: { requestPath: "/" },
          },
        ],
        sources: [],
      },
      {},
    ),
  );
  assert.throws(() =>
    summarizeRum(
      {
        pages: [
          {
            count: 1,
            sum: { visits: 1 },
            avg: { sampleInterval: 10 },
            dimensions: { requestPath: "//foreign.example/" },
          },
        ],
        sources: [],
      },
      {},
    ),
  );
});
