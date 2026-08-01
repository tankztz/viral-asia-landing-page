import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@sanity/client";
import { parse } from "node-html-parser";

const categorySlug = process.argv[2] || "sg-food";
const indexPath = process.argv[3] || "dist/index.html";
const client = createClient({
  projectId: "3an9f3n5",
  dataset: "production",
  apiVersion: "2024-03-19",
  useCdn: false,
});

const [html, posts] = await Promise.all([
  readFile(indexPath, "utf8"),
  client.fetch(
    `*[
      _type == "post"
      && !(_id in path("drafts.**"))
      && defined(slug.current)
      && $categorySlug in categories[]->slug.current
    ]|order(publishedAt desc){title, "slug": slug.current}`,
    { categorySlug },
  ),
]);

if (posts.length === 0) {
  throw new Error(`Sanity has no published posts in category ${categorySlug}`);
}

const root = parse(html);
const archiveSection = root.querySelector("[data-category-archive-section]");
const stylesheetTexts = await Promise.all(
  root.querySelectorAll('link[rel="stylesheet"][href]').map((link) => {
    const href = link.getAttribute("href");
    const path = href.startsWith("/")
      ? resolve(dirname(indexPath), `.${href}`)
      : resolve(dirname(indexPath), href);
    return readFile(path, "utf8");
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

const renderedHrefs = new Set(
  root.querySelectorAll("a[href]").map((link) => link.getAttribute("href")),
);
const missing = posts.filter(
  (post) => !renderedHrefs.has(`/blog/${post.slug}`),
);

if (missing.length > 0) {
  console.error(
    `FAIL ${categorySlug}: ${missing.length}/${posts.length} published posts are absent from ${indexPath}`,
  );
  for (const post of missing) {
    console.error(`  /blog/${post.slug} — ${post.title}`);
  }
  process.exit(1);
}

console.log(
  `PASS ${categorySlug}: all ${posts.length} published posts are present in ${indexPath}`,
);
