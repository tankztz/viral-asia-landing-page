import { parse } from "node-html-parser";

const fetchBaseUrl = (process.argv[2] || "https://viralasia.co").replace(/\/$/, "");
const canonicalBaseUrl = (process.argv[3] || fetchBaseUrl).replace(/\/$/, "");
const shouldExpectEdgeRedirects = fetchBaseUrl === canonicalBaseUrl;
const expectedCanonical = {
  "/": `${canonicalBaseUrl}/`,
  "/engage/": `${canonicalBaseUrl}/engage/`,
  "/work/": `${canonicalBaseUrl}/work/`,
  "/services/": `${canonicalBaseUrl}/services/`,
  "/clients/": `${canonicalBaseUrl}/clients/`,
  "/about/": `${canonicalBaseUrl}/about/`,
};
const articlePath =
  "/blog/sgd19-lok-lok-buffet-in-singapore-the-ultimate-late-night-feast/";

const checks = [];

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
  assert(title.length <= 70, `${path} title is too long: ${title.length}`);

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

await addCheck("robots.txt allows production crawling and declares sitemap", async () => {
  const { response, text } = await fetchText("/robots.txt");
  assert(response.ok, `/robots.txt returned ${response.status}`);
  assert(text.includes("Allow: /"), "robots.txt is not allowing crawling");
  assert(
    text.includes(`Sitemap: ${canonicalBaseUrl}/sitemap.xml`),
    "robots.txt is missing sitemap declaration",
  );
});

let sitemapUrls = [];
await addCheck("sitemap.xml exposes canonical 200 URLs only", async () => {
  const { response, text } = await fetchText("/sitemap.xml");
  assert(response.ok, `/sitemap.xml returned ${response.status}`);
  assert(
    response.headers.get("content-type")?.includes("xml"),
    "sitemap.xml content-type is not XML",
  );
  sitemapUrls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert(sitemapUrls.length >= 10, `sitemap has only ${sitemapUrls.length} URLs`);
  assert(sitemapUrls.includes(`${canonicalBaseUrl}/`), "sitemap missing root");
  assert(sitemapUrls.includes(`${canonicalBaseUrl}/engage/`), "sitemap missing /engage/");
  assert(
    sitemapUrls.includes(`${canonicalBaseUrl}${articlePath}`),
    "sitemap missing known article",
  );
  assert(!sitemapUrls.includes(`${canonicalBaseUrl}/blog/`), "sitemap includes redirected /blog/");

  for (const url of sitemapUrls) {
    const { pathname } = new URL(url);
    const response = await fetch(`${fetchBaseUrl}${pathname}`, { redirect: "manual" });
    assert(response.status === 200, `${url} returned ${response.status}`);
  }
});

await addCheck("important pages have SEO metadata", async () => {
  for (const [path, canonicalUrl] of Object.entries(expectedCanonical)) {
    await assertMetadata(path, canonicalUrl);
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

await addCheck("known article keeps article metadata and BlogPosting schema", async () => {
  const canonicalUrl = `${canonicalBaseUrl}${articlePath}`;
  const { jsonLd } = await assertMetadata(articlePath, canonicalUrl, {
    expectJsonLd: true,
  });
  const article = jsonLd.find((item) => item["@type"] === "BlogPosting");
  assert(article, "article JSON-LD missing BlogPosting");
  assert(article.headline, "BlogPosting missing headline");
  assert(article.datePublished, "BlogPosting missing datePublished");
  assert(article.dateModified, "BlogPosting missing dateModified");
  assert(article.image, "BlogPosting missing image");
});

await addCheck("retired blog index redirects to root", async () => {
  if (!shouldExpectEdgeRedirects) return;
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

console.log(`\nSEO verification passed for ${fetchBaseUrl}`);
