import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as growth from "../src/lib/content-growth.mjs";
import { authorArchives } from "../src/lib/seo-foundation.mjs";

// All test posts and metrics are SYNTHETIC, never production evidence.
const paragraph = (text, href) => ({
  _type: "block",
  children: [{ _type: "span", text, marks: href ? ["link1"] : [] }],
  markDefs: href ? [{ _key: "link1", _type: "link", href }] : [],
});
const post = (overrides = {}) => ({
  _id: "synthetic-a",
  title: "Synthetic local update",
  slug: { current: "synthetic-a" },
  publishedAt: "2026-09-01T00:00:00Z",
  _updatedAt: "2026-09-02T00:00:00Z",
  excerpt: "Synthetic useful update.",
  author: { name: "Synthetic Reporter" },
  categories: [{ title: "Singapore", slug: { current: "singapore" } }],
  mainImage: { asset: { url: "https://example.org/photo.jpg" } },
  body: [paragraph("A useful short update.", "https://example.org/source")],
  ...overrides,
});
const snapshot = (posts) => ({ posts, categories: [] });
const brief = (overrides = {}) => ({
  audienceQuestion: "What changed locally?",
  intentEntity: "Synthetic local opening",
  sources: ["https://example.org/source"],
  valueAdded: "Explains the practical change for residents.",
  classification: "social-brief",
  ...overrides,
});

test("synthetic gate accepts a useful short article and rejects missing essentials, unattributed evidence and bad internal routes", () => {
  assert.equal(typeof growth.checkCandidate, "function");
  const content = snapshot([
    post({ _id: "synthetic-b", slug: { current: "synthetic-b" } }),
  ]);
  const good = post({
    body: [
      paragraph("Complete useful answer.", "https://example.org/source"),
      paragraph("Related context", "/blog/synthetic-b/"),
    ],
  });
  assert.equal(growth.checkCandidate(good, brief(), content).ok, true);
  assert.equal(
    growth.checkCandidate(
      good,
      brief({ classification: "search-led-guide" }),
      content,
    ).ok,
    true,
  );
  const missing = growth.checkCandidate(
    post({
      author: null,
      publishedAt: null,
      body: [paragraph("No attributed evidence")],
    }),
    brief(),
    content,
  );
  assert.equal(missing.ok, false);
  assert.ok(missing.errors.some((e) => e.includes("author.name")));
  assert.ok(missing.errors.some((e) => e.includes("attribution")));
  assert.equal(
    growth.checkCandidate(good, brief({ audienceQuestion: "" }), content).ok,
    false,
  );
  assert.equal(
    growth.checkCandidate(
      good,
      brief({ sources: ["https://example.org/uncredited"] }),
      content,
    ).ok,
    false,
  );
  for (const href of [
    "/blog/not-published/",
    "javascript:alert(1)",
    "/blog/%zz/",
    "https://viralasia.co:444/blog/synthetic-b/",
  ]) {
    assert.equal(
      growth.checkCandidate(
        post({ body: [...good.body, paragraph("Bad link", href)] }),
        brief(),
        content,
      ).ok,
      false,
      href,
    );
  }
  assert.equal(
    growth.checkCandidate(
      post({
        body: [
          paragraph(
            "Short but complete.",
            "https://www.instagram.com/p/synthetic/",
          ),
        ],
      }),
      brief({ sources: ["https://www.instagram.com/p/synthetic/"] }),
      content,
    ).ok,
    true,
  );
});

test("gate accepts real editorial and author routes, not invented author archives", () => {
  const data = snapshot([post()]);
  const path = authorArchives(data.posts)[0].path;
  for (const href of ["/editorial/", path]) {
    const candidate = post({
      body: [...post().body, paragraph("More information", href)],
    });
    assert.equal(
      growth.checkCandidate(candidate, brief(), data).ok,
      true,
      href,
    );
  }
  assert.equal(
    growth.checkCandidate(
      post({
        body: [
          ...post().body,
          paragraph("Wrong author", "/authors/not-an-author/"),
        ],
      }),
      brief(),
      data,
    ).ok,
    false,
  );
});

test("only actually rendered image credits count as source attribution", () => {
  const credit = {
    sourceUrl: "https://example.org/source",
    sourceLabel: "Source",
  };
  const asset = { _type: "reference", _ref: "image-abc123-100x100-png" };
  for (const block of [
    { ...paragraph("Hidden fields"), ...credit },
    { _type: "image", ...credit },
    { _type: "image", asset: {}, ...credit },
    { _type: "unknown", asset, ...credit },
    { ...paragraph("Hidden link", credit.sourceUrl), _type: "unknown" },
  ]) {
    const candidate = post({ body: [paragraph("Article text."), block] });
    assert.equal(
      growth.checkCandidate(candidate, brief(), snapshot([])).ok,
      false,
      JSON.stringify(block),
    );
  }
  const candidate = post({
    body: [paragraph("Article text."), { _type: "image", asset, ...credit }],
  });
  assert.equal(
    growth.checkCandidate(candidate, brief(), snapshot([])).ok,
    true,
  );
});

test("synthetic GSC CSV preserves exact URLs and parses quoted BOM percent metrics; missing is null", () => {
  assert.equal(typeof growth.parseGscPages, "function");
  const csv =
    '\uFEFFTop pages,Clicks,Impressions,CTR,Position\r\n"https://viralasia.co/blog/synthetic-a/?x=1,2","1,200","12,000",10%,2.5\r\nhttps://viralasia.co/blog/synthetic-b/,0,0,,\r\nhttps://viralasia.co/blog/synthetic-c/,,,N/A,—\r\n';
  const rows = growth.parseGscPages(csv);
  assert.deepEqual(rows[0], {
    url: "https://viralasia.co/blog/synthetic-a/?x=1,2",
    clicks: 1200,
    impressions: 12000,
    ctr: 0.1,
    position: 2.5,
  });
  assert.deepEqual(rows[1], {
    url: "https://viralasia.co/blog/synthetic-b/",
    clicks: null,
    impressions: null,
    ctr: null,
    position: null,
  });
  assert.equal(
    growth.parseGscPages(
      "Top pages,Clicks,Impressions,CTR,Position\nhttps://viralasia.co/blog/observed/,0,10,0%,2",
    )[0].clicks,
    0,
  );
  assert.deepEqual(rows[2], {
    url: "https://viralasia.co/blog/synthetic-c/",
    clicks: null,
    impressions: null,
    ctr: null,
    position: null,
  });
  assert.deepEqual(
    growth.parseGscPages("Page,Clicks\nhttps://viralasia.co/blog/a/,2")[0],
    {
      url: "https://viralasia.co/blog/a/",
      clicks: 2,
      impressions: null,
      ctr: null,
      position: null,
    },
  );
  for (const bad of [
    "Top pages,Clicks\nhttps://foreign.example/blog/a/,1",
    "Top pages,Clicks\nhttps://viralasia.co.evil.example/blog/a/,1",
    "Top pages,Clicks\nhttps://viralasia.co/blog/a/,nope",
    "Top pages,Clicks\nhttps://viralasia.co/blog/a/,-1",
    "Top pages,Clicks\nhttps://viralasia.co/blog/a/,1,2",
    'Top pages,Clicks\n"https://viralasia.co/blog/a/,1',
    "Top pages,Clicks\nhttps://viralasia.co/blog/a/,1\nhttps://viralasia.co/blog/a/,2",
    "Top pages,CTR\nhttps://viralasia.co/blog/a/,105%",
    "Top pages,Clicks,Clicks\nhttps://viralasia.co/blog/a/,1,1",
    "Top pages,Clicks,Impressions\nhttps://viralasia.co/blog/a/,2,1",
    "Query,Clicks\nsynthetic,1",
  ])
    assert.throws(
      () => growth.parseGscPages(bad),
      /row|CSV|header|duplicate|URL|metric/i,
    );
});

test("synthetic measurement compares labelled equal windows without inventing missing metrics or treating new observations as new pages", () => {
  assert.equal(typeof growth.createMeasurement, "function");
  const currentCsv =
    "Top pages,Clicks,Impressions,CTR,Position\nhttps://viralasia.co/blog/synthetic-a/,10,100,10%,3\nhttps://viralasia.co/blog/synthetic-b/,1,10,10%,5\nhttps://viralasia.co/blog/unknown/,2,10,20%,4";
  const previousCsv =
    "Top pages,Clicks,Impressions,CTR,Position\nhttps://viralasia.co/blog/synthetic-a/,8,100,8%,4\nhttps://viralasia.co/blog/old-only/,1,10,10%,9";
  const args = {
    currentCsv,
    previousCsv,
    currentWindow: { start: "2026-09-01", end: "2026-09-28" },
    previousWindow: { start: "2026-08-04", end: "2026-08-31" },
    inventory: growth.createInventory(
      snapshot([
        post({ publishedAt: "2026-09-01T12:00:00Z" }),
        post({
          _id: "synthetic-b",
          slug: { current: "synthetic-b" },
          publishedAt: "2026-08-01T00:00:00Z",
        }),
      ]),
    ),
  };
  const report = growth.createMeasurement(args);
  assert.equal(report.windows.current.days, 28);
  assert.equal(report.rows.length, 4);
  const a = report.rows.find((r) => r.url.endsWith("/synthetic-a/"));
  assert.deepEqual(a.delta, {
    clicks: 2,
    impressions: 0,
    ctrPercentagePoints: 2,
    position: -1,
  });
  assert.equal(a.newPageDuringCurrentWindow, true);
  const b = report.rows.find((r) => r.url.endsWith("/synthetic-b/"));
  assert.equal(b.observedIn, "current-only");
  assert.equal(b.newPageDuringCurrentWindow, false);
  assert.deepEqual(b.previous, {
    clicks: null,
    impressions: null,
    ctr: null,
    position: null,
  });
  assert.equal(b.delta.clicks, null);
  assert.equal(
    report.rows.find((r) => r.url.endsWith("/unknown/"))
      .newPageDuringCurrentWindow,
    null,
  );
  assert.equal(
    report.rows.find((r) => r.url.endsWith("/old-only/")).current.clicks,
    null,
  );
  const single = growth.createMeasurement({
    currentCsv,
    currentWindow: args.currentWindow,
  });
  assert.equal(single.windows.previous, null);
  assert.equal(single.rows[0].observedIn, "current-only");
  assert.equal(single.rows[0].previous.clicks, null);
  assert.throws(
    () =>
      growth.createMeasurement({
        ...args,
        previousWindow: { start: "2026-08-01", end: "2026-08-31" },
      }),
    /equal|same/i,
  );
  assert.throws(
    () =>
      growth.createMeasurement({ ...args, previousWindow: args.currentWindow }),
    /before|overlap/i,
  );
  assert.throws(
    () =>
      growth.createMeasurement({
        ...args,
        currentWindow: { start: "2026-02-30", end: "2026-03-29" },
      }),
    /date/i,
  );
  assert.throws(
    () => growth.createMeasurement({ ...args, previousWindow: undefined }),
    /previous/i,
  );
});

test("synthetic CLI loads the public snapshot once, writes reports, replays saved JSON and gates without writes to CMS", async () => {
  const { main } = await import("./content-growth.mjs");
  const dir = await mkdtemp(join(tmpdir(), "synthetic-content-growth-"));
  let requests = 0;
  const context = {
    loadSnapshot: async () => {
      requests++;
      return snapshot([post()]);
    },
    stdout: () => {},
  };
  try {
    assert.equal(
      await main(["inventory", "--out", dir, "--expected-count", "1"], context),
      0,
    );
    assert.equal(requests, 1);
    const saved = join(dir, "snapshot.json");
    const json = JSON.parse(
      await readFile(join(dir, "inventory.json"), "utf8"),
    );
    const csv = growth.parseCsv(
      await readFile(join(dir, "inventory.csv"), "utf8"),
    );
    assert.equal(json.rows.length, 1);
    assert.equal(csv.length, 2);
    assert.equal(
      await main(["inventory", "--snapshot", saved, "--out", dir], context),
      0,
    );
    assert.equal(requests, 1);
    await assert.rejects(
      () =>
        main(
          [
            "inventory",
            "--snapshot",
            saved,
            "--expected-count",
            "2",
            "--out",
            dir,
          ],
          context,
        ),
      /count/i,
    );
    await writeFile(join(dir, "candidate.json"), JSON.stringify(post()));
    await writeFile(join(dir, "brief.json"), JSON.stringify(brief()));
    assert.equal(
      await main(
        [
          "check",
          "--candidate",
          join(dir, "candidate.json"),
          "--brief",
          join(dir, "brief.json"),
          "--snapshot",
          saved,
          "--out",
          dir,
          "--dry-run",
        ],
        context,
      ),
      0,
    );
    await writeFile(join(dir, "brief.json"), "{}");
    assert.equal(
      await main(
        [
          "check",
          "--candidate",
          join(dir, "candidate.json"),
          "--brief",
          join(dir, "brief.json"),
          "--snapshot",
          saved,
          "--out",
          dir,
        ],
        context,
      ),
      1,
    );
    await writeFile(
      join(dir, "synthetic-pages.csv"),
      "Top pages,Clicks,Impressions,CTR,Position\nhttps://viralasia.co/blog/synthetic-a/,1,10,10%,2",
    );
    assert.equal(
      await main(
        [
          "measure",
          "--current",
          join(dir, "synthetic-pages.csv"),
          "--current-start",
          "2026-09-01",
          "--current-end",
          "2026-09-28",
          "--out",
          dir,
        ],
        context,
      ),
      0,
    );
    const measured = JSON.parse(
      await readFile(join(dir, "measurement.json"), "utf8"),
    );
    assert.equal(measured.rows[0].current.clicks, 1);
    assert.equal(requests, 1);
    await assert.rejects(
      () => main(["measure", "--out", dir], context),
      /current.*CSV|current/i,
    );
    await assert.rejects(
      () => main(["inventory", "--typo"], context),
      /unknown|option/i,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("synthetic measurement treats unavailable positions as null and aligns publication timestamps to GSC Pacific dates", () => {
  const csv =
    "Top pages,Clicks,Impressions,CTR,Position\nhttps://viralasia.co/blog/synthetic-a/,0,0,0%,0\nhttps://viralasia.co/blog/unavailable/,~,~,~,~";
  const rows = growth.parseGscPages(csv);
  assert.equal(rows[0].ctr, null);
  assert.equal(rows[0].position, null);
  assert.equal(rows[1].clicks, null);
  const report = growth.createMeasurement({
    currentCsv: csv,
    currentWindow: { start: "2026-09-01", end: "2026-09-28" },
    inventory: growth.createInventory(
      snapshot([post({ publishedAt: "2026-09-01T00:00:00Z" })]),
    ),
  });
  assert.equal(report.rows[0].newPageDuringCurrentWindow, false);
  assert.equal(report.windows.current.timezone, "America/Los_Angeles");
});

test("synthetic edge cases keep missing metadata visible, dedupe semantic records and require real visible attribution", () => {
  const a = post();
  const reordered = Object.fromEntries(Object.entries(a).reverse());
  assert.equal(
    growth.createInventory(snapshot([a, reordered])).summary.counts
      .duplicateRecords,
    1,
  );
  const malformed = growth.createInventory(
    snapshot([
      post({ slug: null, title: "", publishedAt: "2026-02-30", author: null }),
    ]),
  ).rows[0];
  assert.equal(malformed.url, null);
  assert.ok(malformed.missingEssentials.includes("publishedAt"));
  assert.ok(malformed.missingEssentials.includes("title"));
  const unused = post({
    body: [
      {
        _type: "block",
        children: [
          {
            _type: "span",
            text: "A claim without an actual citation.",
            marks: [],
          },
        ],
        markDefs: [
          { _key: "unused", _type: "link", href: "https://example.org/source" },
        ],
      },
    ],
  });
  assert.equal(growth.checkCandidate(unused, brief(), snapshot([])).ok, false);
  const invisibleImageCredit = post({
    body: [
      paragraph("Actual article text."),
      { _type: "image", sourceUrl: "https://example.org/source" },
    ],
  });
  assert.equal(
    growth.checkCandidate(invisibleImageCredit, brief(), snapshot([])).ok,
    false,
  );
  assert.equal(
    growth.checkCandidate(
      post({
        body: [
          ...a.body,
          {
            _type: "image",
            asset: { _type: "reference", _ref: "image-abc123-100x100-png" },
            sourceLabel: "Invalid internal credit",
            sourceUrl: "/not-a-real-page/",
          },
        ],
      }),
      brief(),
      snapshot([]),
    ).ok,
    false,
  );
  assert.deepEqual(
    growth.createInventory(
      snapshot([
        post({
          body: [
            paragraph(
              "An own-site link",
              "http://www.viralasia.co/blog/synthetic-a/",
            ),
          ],
        }),
      ]),
    ).rows[0].sourceUrls,
    [],
  );
  assert.deepEqual(growth.parseCsv('a,b\n"line 1\nline 2","say ""hello"""'), [
    ["a", "b"],
    ["line 1\nline 2", 'say "hello"'],
  ]);
  assert.throws(
    () =>
      growth.parseGscPages(
        "Top pages,Clicks\nhttps://viralasia.co/blog/%zz/,1",
      ),
    /URL/,
  );
});

test("synthetic inventory enumerates unique published articles and contextual sources without a length gate", () => {
  assert.equal(typeof growth.createInventory, "function");
  const a = post({
    body: [
      paragraph("A useful short update.", "https://example.org/source"),
      paragraph("Another article", "/blog/synthetic-b/"),
      { _type: "socialEmbed", url: "https://www.instagram.com/p/synthetic/" },
    ],
  });
  const b = post({
    _id: "synthetic-b",
    slug: { current: "synthetic-b" },
    title: "Best places: a guide",
    body: [
      paragraph("Tiny but complete.", "https://www.instagram.com/p/synthetic/"),
    ],
  });
  const result = growth.createInventory(
    snapshot([a, b, a, post({ _id: "drafts.synthetic" })]),
  );
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.summary.counts, {
    input: 4,
    excludedDrafts: 1,
    publishedRecords: 3,
    duplicateRecords: 1,
    uniqueArticles: 2,
    manifestArticles: null,
    verified: true,
  });
  assert.equal(result.rows[0].bodyWordCount, 6);
  assert.deepEqual(result.rows[0].sourceUrls, [
    "https://example.org/source",
    "https://www.instagram.com/p/synthetic/",
  ]);
  assert.deepEqual(result.rows[0].contextualInternalLinks, [
    "/blog/synthetic-b/",
  ]);
  assert.deepEqual(result.rows[0].missingEssentials, []);
  assert.equal(result.rows[1].socialOnlyReferences, true);
  assert.equal(
    result.rows[1].editorialClassificationHeuristic,
    "search-led-review",
  );
  assert.equal(result.rows[0].publishedAt, a.publishedAt);
  assert.throws(
    () =>
      growth.createInventory({
        ...snapshot([a]),
        manifest: {
          articleCount: 2,
          articlePaths: ["/blog/synthetic-a/", "/blog/synthetic-b/"],
        },
      }),
    /count|manifest/i,
  );
  assert.throws(
    () =>
      growth.createInventory(
        snapshot([a, post({ title: "Conflicting duplicate" })]),
      ),
    /conflict/i,
  );
});
