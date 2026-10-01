import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import * as metadata from "../src/lib/article-metadata.mjs";
test("long excerpts produce bounded metadata without changing article copy", () => {
  assert.equal(typeof metadata.articleMetaDescription, "function");
  const excerpt = "Singapore travel destinations and itineraries. ".repeat(15);
  const post = { title: "A travel guide", excerpt };
  const description = metadata.articleMetaDescription(post);
  assert.ok(description.length >= 50 && description.length <= 180);
  assert.ok(description.endsWith("…"));
  assert.equal(post.excerpt, excerpt);
});
test("normal excerpts stay intact and short ones use the existing title fallback", () => {
  assert.equal(typeof metadata.articleMetaDescription, "function");
  const excerpt =
    "Explore Singapore food, events and regional travel stories with this detailed guide.";
  assert.equal(
    metadata.articleMetaDescription({ title: "Guide", excerpt }),
    excerpt,
  );
  assert.ok(
    metadata
      .articleMetaDescription({ title: "Guide", excerpt: "Short" })
      .startsWith("Guide."),
  );
});
test("page templates cannot bypass the shared content snapshot", async () => {
  for (const file of [
    "index.astro",
    "blog/index.astro",
    "blog/[slug].astro",
    "rss.xml.ts",
    "sitemap.xml.ts",
  ]) {
    const source = await readFile(
      new URL(`../src/pages/${file}`, import.meta.url),
      "utf8",
    );
    assert.ok(source.includes("getContentSnapshot"), file);
    assert.doesNotMatch(
      source,
      /sanityClient\.fetch|discoverContentRoutes\(/,
      file,
    );
  }
});
