import { createClient } from "@sanity/client";
import { parse } from "node-html-parser";
import {
  SANITY_CONFIG,
  compareRouteManifest,
  discoverContentRoutes,
} from "../src/lib/content-routes.mjs";

const baseUrl = (process.argv[2] || "https://viralasia.co").replace(/\/$/, "");
const manifest = await discoverContentRoutes(createClient(SANITY_CONFIG));
if (!manifest.articleCount || !manifest.categoryCount) {
  throw new Error(
    `Expected published content, found ${manifest.articleCount} articles and ${manifest.categoryCount} categories`,
  );
}
console.log(
  `Discovered ${manifest.articleCount} published articles and ${manifest.categoryCount} categories`,
);
const response = await fetch(`${baseUrl}/`);
if (!response.ok) throw new Error(`/ returned ${response.status}`);

const root = parse(await response.text());
const archiveSection = root.querySelector("[data-category-archive-section]");
const stylesheetTexts = await Promise.all(
  root.querySelectorAll('link[rel="stylesheet"][href]').map(async (link) => {
    const url = new URL(link.getAttribute("href"), `${baseUrl}/`);
    if (url.origin !== new URL(baseUrl).origin) return "";
    const stylesheet = await fetch(url);
    if (!stylesheet.ok) throw new Error(`${url.pathname} returned ${stylesheet.status}`);
    return stylesheet.text();
  }),
);
const cssText = [
  ...root.querySelectorAll("style").map((style) => style.text),
  ...stylesheetTexts,
].join("\n");

if (!archiveSection?.hasAttribute("hidden")) {
  throw new Error("The category archive must be hidden on the default Latest view");
}
if (!cssText.includes("[data-category-archive-section][hidden]")) {
  throw new Error("CSS must preserve the hidden state of the category archive");
}

const buttons = new Map(
  root
    .querySelectorAll("[data-category-filter] button[data-filter]")
    .map((button) => [button.getAttribute("data-filter"), button.text.trim()]),
);
for (const category of manifest.categories) {
  if (buttons.get(category.slug) !== category.title.trim()) {
    throw new Error(
      `Homepage category filter is missing ${category.slug} — ${category.title}`,
    );
  }
}

const cards = root.querySelectorAll("[data-filter-card][data-category]");
const renderedArticlePaths = root
  .querySelectorAll('a[href^="/blog/"]')
  .map((link) => new URL(link.getAttribute("href"), `${baseUrl}/`).pathname)
  .map((path) => path.endsWith("/") ? path : `${path}/`);
const routeComparison = compareRouteManifest(
  manifest.articlePaths,
  renderedArticlePaths,
);
if (routeComparison.missing.length) {
  throw new Error(
    `Homepage is missing article routes: ${routeComparison.missing.join(", ")}`,
  );
}

for (const post of manifest.posts) {
  for (const category of post.categories || []) {
    if (!category?.slug) continue;
    const represented = cards.some((card) => {
      const href = card.querySelector('a[href^="/blog/"]')?.getAttribute("href");
      const categories = (card.getAttribute("data-category") || "").split(/\s+/);
      return href === post.path.replace(/\/$/, "") && categories.includes(category.slug);
    });
    if (!represented) {
      throw new Error(
        `${post.slug} is not represented in homepage category ${category.slug}`,
      );
    }
  }
}

console.log(
  `PASS homepage category inventory: ${manifest.articleCount} articles and ${manifest.categoryCount} categories discovered and validated for ${baseUrl}`,
);
