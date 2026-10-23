import test from "node:test";
import assert from "node:assert/strict";
import * as feature from "../src/lib/featured-story.mjs";
const caps = {
  _id: "caps",
  title: "CAPS Expo",
  slug: { current: "singapore-expo-halloween-trading-card-show-caps-2026" },
};
const dwell = {
  _id: "dwell",
  title: "Delilah",
  slug: { current: "ex-tiktok-gm-delilah-chan-dwelldrop-local-shops" },
};
const newer = { _id: "newer", title: "Newer post", slug: { current: "newer" } };
const active = Date.parse("2026-10-23T04:30:00Z");
test("CAPS replaces Delilah as the main feature without relying on publication order", () => {
  assert.equal(
    feature.selectFeaturedPost([newer, dwell, caps], active)._id,
    "caps",
  );
});
test("Delilah returns to ordinary posts when its feature slot is disabled", () => {
  const posts = [newer, dwell, caps];
  assert.equal(
    feature.selectSecondaryFeaturedPost(posts, caps, active),
    undefined,
  );
  assert.equal(feature.selectFeaturedPost(posts, active), caps);
  assert.equal(feature.selectFeaturedPost([newer, dwell], active), newer);
  const featured = feature.selectFeaturedPost(posts, active);
  const secondary = feature.selectSecondaryFeaturedPost(
    posts,
    featured,
    active,
  );
  const regular = posts.filter(
    (post) => post._id !== featured?._id && post._id !== secondary?._id,
  );
  assert(regular.includes(dwell));
});
test("disabled Delilah slot never returns a secondary feature", () => {
  assert.equal(typeof feature.selectSecondaryFeaturedPost, "function");
  const posts = [newer, dwell, caps];
  assert.equal(
    feature.selectSecondaryFeaturedPost(posts, caps, active),
    undefined,
  );
  assert.equal(
    feature.selectSecondaryFeaturedPost(posts, dwell, active),
    undefined,
  );
  assert.equal(
    feature.selectSecondaryFeaturedPost([newer, caps], caps, active),
    undefined,
  );
  assert.equal(
    feature.selectSecondaryFeaturedPost([], undefined, active),
    undefined,
  );
  assert.equal(
    feature.selectSecondaryFeaturedPost(
      posts,
      caps,
      Date.parse(feature.TEMPORARY_FEATURE.startsAt) - 1,
    ),
    undefined,
  );
  assert.equal(
    feature.selectSecondaryFeaturedPost(
      posts,
      caps,
      Date.parse(feature.TEMPORARY_FEATURE.expiresAt),
    ),
    undefined,
  );
  assert.equal(
    feature.selectFeaturedPost(
      posts,
      Date.parse(feature.TEMPORARY_FEATURE.expiresAt),
    ),
    caps,
  );
});
test("both templates render the secondary feature below the lead and exclude it from other lists", async () => {
  const { readFileSync } = await import("node:fs");
  for (const path of [
    "../src/pages/index.astro",
    "../src/pages/blog/index.astro",
  ]) {
    const text = readFileSync(new URL(path, import.meta.url), "utf8");
    assert(text.includes('class="lead-stack"'));
    assert(text.includes("data-emdash-secondary-featured-post"));
    assert(
      text.indexOf("data-emdash-secondary-featured-post") >
        text.indexOf("data-emdash-featured-post"),
    );
    assert(
      text.indexOf("data-emdash-secondary-featured-post") <
        text.indexOf('class="side-stack"'),
    );
    assert.match(text, /post\._id !== secondaryFeaturedPost\?\._id/);
    assert.match(
      text,
      /\[featuredPost, secondaryFeaturedPost, \.\.\.topPosts, \.\.\.latestPosts\]/,
    );
    assert(
      text.includes(".lead-stack:not(:has(> article:not([hidden])))"),
      "Hide the empty lead column when category filters hide both features",
    );
  }
});
