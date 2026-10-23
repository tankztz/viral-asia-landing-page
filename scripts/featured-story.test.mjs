import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const module = await import("../src/lib/featured-story.mjs").catch((error) => {
  if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
  return {};
});
const temporarySlug = "ex-tiktok-gm-delilah-chan-dwelldrop-local-shops";
const legacySlug =
  "this-dating-app-lets-users-attend-private-dating-events-without-revealing-their-identities";
const posts = [
  { _id: "new", title: "Newest story", slug: { current: "newest-story" } },
  { _id: "legacy", title: "Existing feature", slug: { current: legacySlug } },
  { _id: "dwell", title: "Dwell feature", slug: { current: temporarySlug } },
];
test("cancelled temporary feature no longer overrides the normal lead", () => {
  assert.equal(
    typeof module.selectFeaturedPost,
    "function",
    "timed feature selection is not implemented",
  );
  assert.equal(
    module.selectFeaturedPost(posts, Date.parse("2026-10-20T00:00:00Z"))._id,
    "legacy",
  );
});

test("cancelled temporary feature remains inactive across its old expiry", () => {
  const end = Date.parse(module.TEMPORARY_FEATURE.expiresAt);
  assert.equal(module.selectFeaturedPost(posts, end - 1)._id, "legacy");
  assert.equal(module.selectFeaturedPost(posts, end)._id, "legacy");
  assert.equal(module.selectFeaturedPost(posts, end + 1)._id, "legacy");
});

test("both homepage templates use the same timed selector", () => {
  for (const path of [
    "../src/pages/index.astro",
    "../src/pages/blog/index.astro",
  ]) {
    const text = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(
      text,
      /const featuredPost = selectFeaturedPost\(latestSingaporePosts\)/,
    );
  }
});

test("slot lasts seven days and normal fallback remains available", () => {
  const start = Date.parse(module.TEMPORARY_FEATURE.startsAt);
  const end = Date.parse(module.TEMPORARY_FEATURE.expiresAt);
  assert.equal(end - start, 7 * 24 * 60 * 60 * 1000);
  assert.equal(module.selectFeaturedPost(posts, start - 1)._id, "legacy");
  assert.equal(module.selectFeaturedPost(posts, start)._id, "legacy");
  assert.equal(
    module.selectFeaturedPost(posts.slice(0, 2), start)._id,
    "legacy",
  );
  assert.equal(module.selectFeaturedPost([posts[0]], end)._id, "new");
  assert.equal(module.selectFeaturedPost([], end), undefined);
});
