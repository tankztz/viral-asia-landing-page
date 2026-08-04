import { readFile } from "node:fs/promises";
import { createClient } from "@sanity/client";
import {
  SANITY_CONFIG,
  discoverContentRoutes,
} from "../src/lib/content-routes.mjs";

const baseUrl = (process.argv[2] || "https://viralasia.co").replace(/\/$/, "");
const canonicalBaseUrl = (process.argv[3] || baseUrl).replace(/\/$/, "");
const shouldExpectEdgeRedirects = baseUrl === canonicalBaseUrl;
const manifest = await discoverContentRoutes(createClient(SANITY_CONFIG));
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

const fetchText = async (path) => {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();
  return { response, text };
};

const fetchManual = (path) =>
  fetch(`${baseUrl}${path}`, { redirect: "manual" });

await addCheck("Sanity content routes are discoverable", async () => {
  assert(manifest.articleCount > 0, "Sanity has no published article routes");
  assert(manifest.categoryCount > 0, "Sanity has no categories with slugs");
});

await addCheck("root renders the content homepage", async () => {
  const { response, text } = await fetchText("/");
  assert(response.ok, `/ returned ${response.status}`);
  assert(
    text.includes('data-emdash-collection="posts"'),
    "/ is missing the content homepage marker",
  );
  assert(
    text.includes("Latest happenings in Singapore"),
    "/ is missing the content homepage title",
  );
  assert(!text.includes("We make"), "/ still looks like the marketing homepage");
});

await addCheck("root navigation points to Engage instead of Blog", async () => {
  const { text } = await fetchText("/");
  assert(text.includes('href="/engage"'), "/ nav is missing /engage");
  assert(!text.includes('href="/blog"'), "/ nav still links to /blog index");
});

await addCheck("engage renders the marketing homepage", async () => {
  const { response, text } = await fetchText("/engage/");
  assert(response.ok, `/engage returned ${response.status}`);
  assert(text.includes("We make"), "/engage is missing marketing hero copy");
  assert(
    text.includes("Singapore's social media agency"),
    "/engage is missing marketing positioning copy",
  );
  assert(
    !text.includes('data-emdash-collection="posts"'),
    "/engage still looks like the content homepage",
  );
});

await addCheck("blog index redirect remains configured", async () => {
  if (!shouldExpectEdgeRedirects) {
    const redirects = await readFile("public/_redirects", "utf8");
    assert(/^\/blog \/ 301$/m.test(redirects), "_redirects is missing /blog -> /");
    assert(/^\/blog\/ \/ 301$/m.test(redirects), "_redirects is missing /blog/ -> /");
    return;
  }

  for (const path of ["/blog", "/blog/"]) {
    const response = await fetchManual(path);
    assert(
      [301, 302, 307, 308].includes(response.status),
      `${path} returned ${response.status}, expected a redirect`,
    );
    const location = response.headers.get("location") || "";
    assert(
      location === "/" || location === `${baseUrl}/`,
      `${path} redirects to ${location}`,
    );
  }
});

await addCheck("every published article remains available under /blog/slug", async () => {
  for (const post of manifest.posts) {
    const path = post.path;
    const { response, text } = await fetchText(path);
    assert(response.ok, `${path} returned ${response.status}`);
    assert(
      text.includes(`data-emdash-entry="${post.slug}"`),
      `${path} did not render the discovered article`,
    );
    assert(
      text.includes(`${canonicalBaseUrl}${path}`),
      `${path} is missing its canonical URL`,
    );
  }
});

await addCheck("service pages keep marketing logo routing to Engage", async () => {
  const { response, text } = await fetchText("/services/");
  assert(response.ok, `/services returned ${response.status}`);
  assert(
    text.includes('href="/engage"'),
    "/services logo/nav does not include /engage",
  );
});

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
  if (!check.ok) console.log(`  ${check.message}`);
}

if (failed.length > 0) {
  console.error(`\nRoute migration verification failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}

console.log(
  `\nRoute migration verification passed for ${baseUrl}: ${manifest.articleCount} article routes validated; ${manifest.categoryCount} categories discovered`,
);
