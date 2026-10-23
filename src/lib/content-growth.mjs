import { isDeepStrictEqual } from "node:util";
import imageUrlBuilder from "@sanity/image-url";
import { SANITY_CONFIG } from "./content-routes.mjs";
import { authorArchives } from "./seo-foundation.mjs";

// Read-only content diagnostics. No CMS writes or traffic/demand inference.
export const SITE_ORIGIN = "https://viralasia.co";
const unique = (values) => [...new Set(values)];
const text = (value) => typeof value === "string" && value.trim().length > 0;
const validDate = (value) => {
  if (
    !text(value) ||
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    return false;
  const day = value.slice(0, 10);
  return new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
};
const slugOf = (post) => post?.slug?.current;
const validSlug = (slug) =>
  text(slug) && !/[\s/?#%\\]/u.test(slug) && slug !== "." && slug !== "..";
const articleUrl = (post) =>
  validSlug(slugOf(post)) ? `${SITE_ORIGIN}/blog/${slugOf(post)}/` : null;
const socialHost = (host) =>
  /(^|\.)(instagram\.com|tiktok\.com|facebook\.com|fb\.com|youtube\.com|youtu\.be|x\.com|twitter\.com|xiaohongshu\.com|xhslink\.com|reddit\.com|threads\.net|threads\.com)$/i.test(
    host,
  );
function httpUrl(value, base) {
  if (
    !text(value) ||
    value !== value.trim() ||
    /[\s\\]/u.test(value) ||
    /%(?![\da-f]{2})/i.test(value)
  )
    return null;
  try {
    const url = new URL(value, base);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url
      : null;
  } catch {
    return null;
  }
}
function renderableImage(block) {
  if (block?._type !== "image" || !block.asset) return false;
  try {
    return Boolean(
      imageUrlBuilder({
        projectId: SANITY_CONFIG.projectId,
        dataset: SANITY_CONFIG.dataset,
      })
        .image(block.asset)
        .width(1400)
        .fit("max")
        .auto("format")
        .url(),
    );
  } catch {
    return false;
  }
}
function bodyDetails(post) {
  const blocks = Array.isArray(post?.body) ? post.body : [];
  const bodyText = blocks
    .filter((b) => b?._type === "block")
    .map((b) => (b.children ?? []).map((c) => c.text ?? "").join(""))
    .join("\n");
  const contextual = [];
  const references = [];
  for (const block of blocks) {
    if (!block) continue;
    const usedMarks = new Set(
      (block.children ?? [])
        .filter((c) => text(c.text))
        .flatMap((c) => c.marks ?? []),
    );
    for (const mark of block._type === "block" ? (block.markDefs ?? []) : []) {
      if (mark?._type === "link" && usedMarks.has(mark._key)) {
        contextual.push(mark.href);
        references.push(mark.href);
      }
    }
    if (
      renderableImage(block) &&
      text(block.sourceUrl) &&
      text(block.sourceLabel)
    )
      references.push(block.sourceUrl);
    if (block._type === "socialEmbed" && text(block.url))
      references.push(block.url);
  }
  const sourceUrls = unique(
    references.filter((href) => {
      const url = httpUrl(href);
      return url && !SITE_HOSTS.has(url.hostname);
    }),
  );
  const contextualInternalLinks = unique(
    contextual.filter((href) => {
      const url = httpUrl(href, SITE_ORIGIN);
      return url && SITE_HOSTS.has(url.hostname);
    }),
  );
  return {
    bodyText,
    bodyWordCount:
      bodyText.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0,
    sourceUrls,
    contextualInternalLinks,
    references,
  };
}
function essentials(post, details) {
  const missing = [];
  if (!text(post?.title)) missing.push("title");
  if (!validSlug(slugOf(post))) missing.push("slug.current");
  if (!validDate(post?.publishedAt)) missing.push("publishedAt");
  if (!text(post?.author?.name)) missing.push("author.name");
  if (
    !Array.isArray(post?.categories) ||
    !post.categories.some((c) => text(c?.title) && validSlug(c?.slug?.current))
  )
    missing.push("categories");
  if (!httpUrl(post?.mainImage?.asset?.url))
    missing.push("mainImage.asset.url");
  if (!text(post?.excerpt)) missing.push("excerpt");
  if (!text(details.bodyText)) missing.push("body");
  return missing;
}
function inspectPost(post) {
  const details = bodyDetails(post);
  const socialOnlyReferences =
    details.sourceUrls.length > 0 &&
    details.sourceUrls.every((url) => socialHost(new URL(url).hostname));
  const searchCue =
    /\b(how to|guide|best|where to|things to do|itinerary|cost|opening hours)\b|攻略|指南|怎么|如何/u.test(
      (post?.title ?? "").toLowerCase(),
    );
  const editorialClassificationHeuristic = searchCue
    ? "search-led-review"
    : socialOnlyReferences
      ? "social-brief-review"
      : "editor-review";
  return {
    id: post?._id ?? null,
    url: articleUrl(post),
    title: post?.title ?? null,
    categories: (post?.categories ?? [])
      .filter(Boolean)
      .map((c) => ({ title: c.title ?? null, slug: c.slug?.current ?? null })),
    publishedAt: post?.publishedAt ?? null,
    updatedAt: post?._updatedAt ?? null,
    author: post?.author?.name ?? null,
    bodyWordCount: details.bodyWordCount,
    sourceUrls: details.sourceUrls,
    contextualInternalLinks: details.contextualInternalLinks,
    missingEssentials: essentials(post, details),
    socialOnlyReferences,
    editorialClassificationHeuristic,
    reviewFlags: [
      !details.sourceUrls.length && "evidence-attribution-review",
      !details.contextualInternalLinks.length && "contextual-link-opportunity",
      socialOnlyReferences && "social-only-evidence-review",
      searchCue && "search-intent-and-demand-unverified",
    ].filter(Boolean),
  };
}
const routeKey = (url) => url.pathname.replace(/\/$/, "") || "/";
const SITE_HOSTS = new Set(["viralasia.co", "www.viralasia.co"]);

export function checkCandidate(post, brief, snapshot) {
  const inventory = createInventory(snapshot);
  const row = inspectPost(post);
  const details = bodyDetails(post);
  const errors = row.missingEssentials.map(
    (field) => `Missing or invalid publication essential: ${field}`,
  );
  for (const field of ["audienceQuestion", "intentEntity", "valueAdded"]) {
    if (!text(brief?.[field])) errors.push(`Missing editorial brief: ${field}`);
  }
  if (!["social-brief", "search-led-guide"].includes(brief?.classification))
    errors.push(
      "Brief classification must be social-brief or search-led-guide",
    );
  if (!Array.isArray(brief?.sources) || !brief.sources.length)
    errors.push("Evidence attribution requires brief.sources URLs");
  else
    for (const source of brief.sources) {
      if (!httpUrl(source) || !details.sourceUrls.includes(source))
        errors.push(
          `Missing visible evidence attribution for brief source: ${source}`,
        );
    }
  if (!details.sourceUrls.length)
    errors.push("Missing evidence attribution in the article body");
  const knownRoutes = new Set([
    "/",
    "/blog",
    "/bio",
    "/engage",
    "/work",
    "/services",
    "/clients",
    "/about",
    "/contact",
    "/editorial",
    ...authorArchives(
      snapshot.posts.filter((p) => !p._id?.startsWith("drafts.")),
    ).map((a) => routeKey(new URL(a.path, SITE_ORIGIN))),
    ...inventory.rows.filter((r) => r.url).map((r) => routeKey(new URL(r.url))),
  ]);
  if (row.url) knownRoutes.add(routeKey(new URL(row.url)));
  const warnings = [...row.reviewFlags];
  for (const href of details.references) {
    if (/^(mailto:|tel:)/i.test(href ?? "")) continue;
    const url = httpUrl(href, row.url ?? SITE_ORIGIN);
    if (!url || /%(?![\da-f]{2})/i.test(href)) {
      errors.push(`Invalid link: ${href}`);
      continue;
    }
    if (SITE_HOSTS.has(url.hostname)) {
      if (url.origin !== SITE_ORIGIN || !knownRoutes.has(routeKey(url)))
        errors.push(
          `Invalid internal link (use a known canonical route): ${href}`,
        );
      if (url.hash) warnings.push(`Fragment target not verified: ${href}`);
    }
  }
  return {
    schemaVersion: 1,
    kind: "prepublication-check",
    dryRun: true,
    ok: errors.length === 0,
    errors: unique(errors),
    warnings: unique(warnings),
    article: row,
    classification: brief?.classification ?? null,
    note: "No content changed. No word-count minimum. Human editors must verify claim accuracy and value added; this validates attribution presence and known internal routes, not HTTP reachability or evidence quality.",
  };
}

// Strict RFC-style comma CSV: quoted delimiters, escaped quotes and CRLF.
export function parseCsv(input) {
  const value = input.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [],
    field = "",
    quoted = false,
    closed = false;
  const finishField = () => {
    row.push(field);
    field = "";
    closed = false;
  };
  const finishRow = () => {
    finishField();
    if (row.some((cell) => cell !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (quoted) {
      if (c === '"' && value[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else field += c;
    } else if (c === ",") finishField();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && value[i + 1] === "\n") i++;
      finishRow();
    } else if (closed)
      throw new Error("Malformed CSV: characters after closing quote");
    else if (c === '"') {
      if (field) throw new Error("Malformed CSV: quote inside unquoted field");
      quoted = true;
    } else field += c;
  }
  if (quoted) throw new Error("Malformed CSV: unclosed quote");
  if (field || closed || row.length) finishRow();
  return rows;
}
const METRICS = ["clicks", "impressions", "ctr", "position"];
function parseMetric(raw, metric, row) {
  if (
    raw === undefined ||
    /^(?:|—|-|~|n\/a|null|unavailable)$/i.test(raw.trim())
  )
    return null;
  let value = raw.trim();
  const percent = metric === "ctr" && value.endsWith("%");
  if (percent) value = value.slice(0, -1);
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value))
    throw new Error(`Invalid ${metric} metric at row ${row}`);
  const number = Number(value.replaceAll(",", "")) / (percent ? 100 : 1);
  if (
    !Number.isFinite(number) ||
    number < 0 ||
    (["clicks", "impressions"].includes(metric) &&
      !Number.isSafeInteger(number)) ||
    (metric === "ctr" && number > 1)
  )
    throw new Error(`Invalid ${metric} metric at row ${row}`);
  return number;
}
export function parseGscPages(csv) {
  const [rawHeaders, ...records] = parseCsv(csv);
  if (!rawHeaders) throw new Error("Missing GSC CSV header");
  const headers = rawHeaders.map((h) => h.trim().toLowerCase());
  if (new Set(headers).size !== headers.length)
    throw new Error("Duplicate CSV header");
  const urlColumns = headers
    .map((h, i) => (["top pages", "pages", "page", "url"].includes(h) ? i : -1))
    .filter((i) => i !== -1);
  if (urlColumns.length !== 1)
    throw new Error("Expected one GSC Pages URL header");
  if (
    headers.some(
      (h) => !["top pages", "pages", "page", "url", ...METRICS].includes(h),
    )
  )
    throw new Error(
      "Unsupported GSC CSV header: use separate single-period English Pages exports",
    );
  const seen = new Set();
  return records.map((fields, index) => {
    const row = index + 2;
    if (fields.length !== headers.length)
      throw new Error(
        `Malformed CSV row ${row}: expected ${headers.length} fields, got ${fields.length}`,
      );
    const url = fields[urlColumns[0]];
    const parsed = httpUrl(url);
    if (!parsed || !SITE_HOSTS.has(parsed.hostname) || parsed.port)
      throw new Error(`Foreign or invalid URL at row ${row}: ${url}`);
    if (seen.has(url)) throw new Error(`Duplicate URL at row ${row}: ${url}`);
    seen.add(url);
    const result = {
      url,
      ...Object.fromEntries(
        METRICS.map((metric) => [
          metric,
          parseMetric(fields[headers.indexOf(metric)], metric, row),
        ]),
      ),
    };
    if (
      result.clicks !== null &&
      result.impressions !== null &&
      result.clicks > result.impressions
    )
      throw new Error(`Clicks exceed impressions at row ${row}`);
    // GSC exports can encode unavailable values as zero. With no observed
    // impressions a zero cannot establish zero traffic; preserve uncertainty.
    if (result.impressions === 0) {
      result.impressions = null;
      result.ctr = null;
      result.position = null;
    }
    if (result.impressions === null && result.clicks === 0)
      result.clicks = null;
    if (result.impressions === null && result.ctr === 0) result.ctr = null;
    if (result.position === 0) result.position = null;
    return result;
  });
}

function measurementWindow(window, label) {
  if (!window?.start || !window?.end)
    throw new Error(`${label} window requires start and end dates`);
  for (const value of [window.start, window.end]) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !validDate(value) ||
      new Date(value).toISOString().slice(0, 10) !== value
    )
      throw new Error(`Invalid ${label} date: ${value}`);
  }
  const days =
    (Date.parse(window.end) - Date.parse(window.start)) / 86400000 + 1;
  if (days < 1) throw new Error(`${label} end date precedes start`);
  return {
    start: window.start,
    end: window.end,
    days,
    boundaries: "inclusive",
    timezone: "America/Los_Angeles",
  };
}
const emptyMetrics = () =>
  Object.fromEntries(METRICS.map((key) => [key, null]));
const metricsOf = (row) =>
  row
    ? Object.fromEntries(METRICS.map((key) => [key, row[key]]))
    : emptyMetrics();
const difference = (current, previous, multiplier = 1) =>
  current === null || previous === null
    ? null
    : Number(((current - previous) * multiplier).toFixed(10));
export function createMeasurement({
  currentCsv,
  currentWindow,
  previousCsv,
  previousWindow,
  inventory,
}) {
  if (typeof currentCsv !== "string")
    throw new Error(
      "Actual current GSC Pages CSV is required; metrics unavailable",
    );
  const current = measurementWindow(currentWindow, "current");
  const hasPrevious = previousCsv !== undefined;
  if (!hasPrevious && previousWindow)
    throw new Error("Previous dates require a previous CSV");
  const previous = hasPrevious
    ? measurementWindow(previousWindow, "previous")
    : null;
  if (previous && previous.days !== current.days)
    throw new Error("Comparison windows must have equal length");
  if (previous && previous.end >= current.start)
    throw new Error(
      "Previous window must end before current window; no overlap",
    );
  const currentRows = parseGscPages(currentCsv);
  const previousRows = hasPrevious ? parseGscPages(previousCsv) : [];
  const currentMap = new Map(currentRows.map((r) => [r.url, r]));
  const previousMap = new Map(previousRows.map((r) => [r.url, r]));
  const contentMap = new Map(
    (inventory?.rows ?? []).filter((r) => r.url).map((r) => [r.url, r]),
  );
  const rows = unique([...currentMap.keys(), ...previousMap.keys()]).map(
    (url) => {
      const c = metricsOf(currentMap.get(url));
      const p = metricsOf(previousMap.get(url));
      const publishedAt = contentMap.get(url)?.publishedAt ?? null;
      const publishedDay = validDate(publishedAt)
        ? publishedAt.length === 10
          ? publishedAt
          : new Intl.DateTimeFormat("sv-SE", {
              timeZone: "America/Los_Angeles",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date(publishedAt))
        : null;
      return {
        url,
        current: c,
        previous: p,
        delta: {
          clicks: difference(c.clicks, p.clicks),
          impressions: difference(c.impressions, p.impressions),
          ctrPercentagePoints: difference(c.ctr, p.ctr, 100),
          position: difference(c.position, p.position),
        },
        observedIn: currentMap.has(url)
          ? previousMap.has(url)
            ? "both"
            : "current-only"
          : "previous-only",
        publishedAt,
        newPageDuringCurrentWindow:
          publishedDay === null
            ? null
            : publishedDay >= current.start && publishedDay <= current.end,
      };
    },
  );
  return {
    schemaVersion: 1,
    kind: "gsc-pages-measurement",
    windows: { current, previous },
    rows,
    summary: {
      currentExportRows: currentRows.length,
      previousExportRows: hasPrevious ? previousRows.length : null,
      distinctExportUrls: rows.length,
      comparisonAvailable: hasPrevious,
      currentOnly: rows.filter((r) => r.observedIn === "current-only").length,
      previousOnly: hasPrevious
        ? rows.filter((r) => r.observedIn === "previous-only").length
        : null,
      note: "Exported Pages rows only, not a complete site total. Missing metrics/rows are unavailable, not zero. Current-only means newly observed in this export, not necessarily newly published. Exact URL joins only. Date ranges are operator-supplied and must match exports. Descriptive changes do not establish ranking causality.",
    },
  };
}

export function createInventory(snapshot) {
  if (!Array.isArray(snapshot?.posts))
    throw new Error("Snapshot must contain a posts array");
  const rows = [];
  const byId = new Map();
  const byUrl = new Map();
  let excludedDrafts = 0;
  let duplicateRecords = 0;
  for (const post of snapshot.posts) {
    if (!post || typeof post !== "object" || Array.isArray(post))
      throw new Error("Malformed post record");
    if (post._id?.startsWith("drafts.")) {
      excludedDrafts++;
      continue;
    }
    const url = articleUrl(post);
    const prior = byId.get(post._id) ?? (url && byUrl.get(url));
    if (prior) {
      if (!isDeepStrictEqual(prior, post))
        throw new Error(`Conflicting duplicate article: ${post._id ?? url}`);
      duplicateRecords++;
      continue;
    }
    if (post._id) byId.set(post._id, post);
    if (url) byUrl.set(url, post);
    rows.push(inspectPost(post));
  }
  const manifestArticles = snapshot.manifest?.articleCount ?? null;
  if (manifestArticles !== null && manifestArticles !== rows.length)
    throw new Error(
      `Manifest article count ${manifestArticles} does not match ${rows.length}`,
    );
  if (snapshot.manifest?.articlePaths) {
    const paths = new Set(rows.map((r) => r.url && new URL(r.url).pathname));
    const manifestPaths = snapshot.manifest.articlePaths;
    if (
      manifestPaths.length !== rows.length ||
      new Set(manifestPaths).size !== rows.length ||
      manifestPaths.some((path) => !paths.has(path))
    )
      throw new Error("Manifest article paths do not match inventory");
  }
  const counts = {
    input: snapshot.posts.length,
    excludedDrafts,
    publishedRecords: snapshot.posts.length - excludedDrafts,
    duplicateRecords,
    uniqueArticles: rows.length,
    manifestArticles,
    verified:
      snapshot.posts.length === rows.length + excludedDrafts + duplicateRecords,
  };
  return {
    schemaVersion: 1,
    kind: "content-inventory",
    rows,
    summary: {
      counts,
      missingEssentials: rows.filter((r) => r.missingEssentials.length).length,
      withoutAttributedSources: rows.filter((r) => !r.sourceUrls.length).length,
      withoutContextualInternalLinks: rows.filter(
        (r) => !r.contextualInternalLinks.length,
      ).length,
      socialOnlyReferences: rows.filter((r) => r.socialOnlyReferences).length,
      editorialHeuristics: Object.fromEntries(
        ["search-led-review", "social-brief-review", "editor-review"].map(
          (label) => [
            label,
            rows.filter((r) => r.editorialClassificationHeuristic === label)
              .length,
          ],
        ),
      ),
      metrics: null,
      note: "Word count is diagnostic, not a gate. Editorial labels are heuristics, not measured search demand or traffic. Related-story template links are not contextual body links.",
    },
  };
}
