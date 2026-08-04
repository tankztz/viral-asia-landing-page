import { createClient } from "@sanity/client";
import { parse } from "node-html-parser";
import {
  SANITY_CONFIG,
  assertRouteManifest,
  discoverContentRoutes,
} from "../src/lib/content-routes.mjs";

const fetchBaseUrl = (process.argv[2] || "https://viralasia.co").replace(/\/$/, "");
const canonicalBaseUrl = (process.argv[3] || fetchBaseUrl).replace(/\/$/, "");
const shouldExpectProductionRobots = fetchBaseUrl === canonicalBaseUrl;
const manifest = await discoverContentRoutes(createClient(SANITY_CONFIG));
const expectedCanonical = {
  "/": `${canonicalBaseUrl}/`,
  "/engage/": `${canonicalBaseUrl}/engage/`,
  "/work/": `${canonicalBaseUrl}/work/`,
  "/services/": `${canonicalBaseUrl}/services/`,
  "/clients/": `${canonicalBaseUrl}/clients/`,
  "/about/": `${canonicalBaseUrl}/about/`,
};
const checks = [];

console.log(
  `Discovered ${manifest.articleCount} published articles and ${manifest.categoryCount} categories`,
);

const addCheck = async (name, fn) => {
  try {
    await fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, message: error.message });
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const fetchText = async (path, options = {}) => {
  const response = await fetch(`${fetchBaseUrl}${path}`, options);
  const text = await response.text();
  return { response, text };
};

const attr = (root, selector, name) =>
  root.querySelector(selector)?.getAttribute(name);

const metaContent = (root, selector) => attr(root, selector, "content");

const parseJsonLd = (root) =>
  root
    .querySelectorAll('script[type="application/ld+json"]')
    .map((script) => {
      const raw = script.text.trim();
      assert(raw, "found empty JSON-LD script");
      try {
        return JSON.parse(raw);
      } catch (error) {
        throw new Error(`invalid JSON-LD: ${error.message}`);
      }
    });

const assertMetadata = async (path, canonicalUrl, options = {}) => {
  const { response, text } = await fetchText(path);
  assert(response.ok, `${path} returned ${response.status}`);
  const root = parse(text);
  const titles = root.querySelectorAll("title");
  assert(titles.length === 1, `${path} has ${titles.length} title tags`);
  const title = titles[0].text.trim();
  assert(title.length > 10, `${path} title is too short`);
  if (options.maxTitleLength) {
    assert(
      title.length <= options.maxTitleLength,
      `${path} title is too long: ${title.length}`,
    );
  }

  const description = metaContent(root, 'meta[name="description"]');
  assert(description, `${path} is missing meta description`);
  assert(
    description.length >= 50 && description.length <= 180,
    `${path} description length is ${description.length}`,
  );

  const canonicals = root.querySelectorAll('link[rel="canonical"]');
  assert(canonicals.length === 1, `${path} has ${canonicals.length} canonicals`);
  assert(
    canonicals[0].getAttribute("href") === canonicalUrl,
    `${path} canonical is ${canonicals[0].getAttribute("href")}`,
  );

  assert(metaContent(root, 'meta[property="og:title"]'), `${path} missing og:title`);
  assert(
    metaContent(root, 'meta[property="og:description"]'),
    `${path} missing og:description`,
  );
  assert(
    metaContent(root, 'meta[property="og:url"]') === canonicalUrl,
    `${path} og:url does not match canonical`,
  );
  assert(
    metaContent(root, 'meta[name="twitter:title"]'),
    `${path} missing twitter:title`,
  );

  if (options.expectJsonLd) {
    const jsonLd = parseJsonLd(root);
    assert(jsonLd.length > 0, `${path} is missing JSON-LD`);
    return { root, jsonLd };
  }
  return { root, jsonLd: parseJsonLd(root) };
};

await addCheck("Sanity content routes are discoverable", async () => {
  assert(manifest.articleCount > 0, "Sanity has no published article routes");
  assert(manifest.categoryCount > 0, "Sanity has no categories with slugs");
});

await addCheck("robots.txt matches the build environment", async () => {
  const { response, text } = await fetchText("/robots.txt");
  assert(response.ok, `/robots.txt returned ${response.status}`);
  if (!shouldExpectProductionRobots) {
    assert(text.includes("Disallow: /"), "staging robots.txt allows crawling");
    return;
  }
  assert(text.includes("Allow: /"), "robots.txt is not allowing crawling");
  assert(
    text.includes(`Sitemap: ${canonicalBaseUrl}/sitemap.xml`),
    "robots.txt is missing sitemap declaration",
  );
});

let sitemapUrls = [];
await addCheck("sitemap.xml exactly matches published article routes", async () => {
  const { response, text } = await fetchText("/sitemap.xml");
  assert(response.ok, `/sitemap.xml returned ${response.status}`);
  assert(
    response.headers.get("content-type")?.includes("xml"),
    "sitemap.xml content-type is not XML",
  );
  sitemapUrls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert(sitemapUrls.includes(`${canonicalBaseUrl}/`), "sitemap missing root");
  assert(sitemapUrls.includes(`${canonicalBaseUrl}/engage/`), "sitemap missing /engage/");
  assert(!sitemapUrls.includes(`${canonicalBaseUrl}/blog/`), "sitemap includes redirected /blog/");

  for (const url of sitemapUrls) {
    assert(
      new URL(url).origin === canonicalBaseUrl,
      `sitemap URL is outside the canonical origin: ${url}`,
    );
  }
  const sitemapArticlePaths = sitemapUrls
    .map((url) => new URL(url).pathname)
    .filter((path) => path.startsWith("/blog/") && path !== "/blog/");
  assertRouteManifest(
    manifest.articlePaths,
    sitemapArticlePaths,
    "sitemap article routes",
  );

  for (const url of sitemapUrls) {
    const parsedUrl = new URL(url);
    const response = await fetch(`${fetchBaseUrl}${parsedUrl.pathname}`, {
      redirect: "manual",
    });
    assert(response.status === 200, `${url} returned ${response.status}`);
  }
});

await addCheck("important pages have SEO metadata", async () => {
  for (const [path, canonicalUrl] of Object.entries(expectedCanonical)) {
    await assertMetadata(path, canonicalUrl, { maxTitleLength: 80 });
  }
});

await addCheck("root has WebSite and Blog structured data", async () => {
  const { jsonLd } = await assertMetadata("/", `${canonicalBaseUrl}/`, {
    expectJsonLd: true,
  });
  const types = jsonLd.flatMap((item) => {
    const graph = Array.isArray(item["@graph"]) ? item["@graph"] : [item];
    return graph.map((entry) => entry["@type"]);
  });
  assert(types.includes("WebSite"), "root JSON-LD missing WebSite");
  assert(types.includes("Blog"), "root JSON-LD missing Blog");
});

await addCheck("engage has Organization structured data", async () => {
  const { jsonLd } = await assertMetadata("/engage/", `${canonicalBaseUrl}/engage/`, {
    expectJsonLd: true,
  });
  const types = jsonLd.flatMap((item) => {
    const graph = Array.isArray(item["@graph"]) ? item["@graph"] : [item];
    return graph.map((entry) => entry["@type"]);
  });
  assert(
    types.some((type) => ["Organization", "ProfessionalService", "LocalBusiness"].includes(type)),
    "engage JSON-LD missing organization/service type",
  );
});

await addCheck("every published article has metadata and BlogPosting schema", async () => {
  for (const path of manifest.articlePaths) {
    const canonicalUrl = `${canonicalBaseUrl}${path}`;
    const { jsonLd } = await assertMetadata(path, canonicalUrl, {
      expectJsonLd: true,
    });
    const article = jsonLd.find((item) => item["@type"] === "BlogPosting");
    assert(article, `${path} JSON-LD missing BlogPosting`);
    assert(article.headline, `${path} BlogPosting missing headline`);
    assert(article.datePublished, `${path} BlogPosting missing datePublished`);
    assert(article.dateModified, `${path} BlogPosting missing dateModified`);
    assert(article.image, `${path} BlogPosting missing image`);
    assert(article.url === canonicalUrl, `${path} BlogPosting URL does not match canonical`);
  }
});

await addCheck("rss.xml covers every published article exactly", async () => {
  const { response, text } = await fetchText("/rss.xml");
  assert(response.ok, `/rss.xml returned ${response.status}`);
  assert(
    response.headers.get("content-type")?.includes("xml"),
    "rss.xml content-type is not XML",
  );
  assert(/<rss\s[^>]*version="2\.0"/.test(text), "rss.xml is not RSS 2.0");
  const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
  const rssArticlePaths = items.map((item) => {
    assert(/<title>[^<]+<\/title>/.test(item), "RSS item is missing a title");
    assert(/<guid\s[^>]*>[^<]+<\/guid>/.test(item), "RSS item is missing a guid");
    const link = item.match(/<link>([^<]+)<\/link>/)?.[1];
    assert(link, "RSS item is missing a link");
    const url = new URL(link);
    assert(url.origin === canonicalBaseUrl, `RSS item has non-canonical link: ${link}`);
    return url.pathname;
  });
  assertRouteManifest(manifest.articlePaths, rssArticlePaths, "RSS article routes");
});

await addCheck("retired blog index redirects to root", async () => {
  if (!shouldExpectProductionRobots) return;
  for (const path of ["/blog", "/blog/"]) {
    const response = await fetch(`${fetchBaseUrl}${path}`, { redirect: "manual" });
    assert([301, 308].includes(response.status), `${path} returned ${response.status}`);
    const location = response.headers.get("location") || "";
    assert(location === "/" || location === `${fetchBaseUrl}/`, `${path} redirects to ${location}`);
  }
});

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
  if (!check.ok) console.log(`  ${check.message}`);
}

if (failed.length > 0) {
  console.error(`\nSEO verification failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}

console.log(
  `\nSEO verification passed for ${fetchBaseUrl}: ${manifest.articleCount} article pages, sitemap entries, and RSS entries validated; ${manifest.categoryCount} categories discovered`,
);
