import assert from "node:assert/strict";
import test from "node:test";

import {
  contentSnapshotIntegration,
  getContentSnapshot,
  resetContentSnapshot,
} from "../src/lib/build-content.mjs";
const snapshotModule = await import("../src/lib/content-snapshot.mjs");

test("separate module instances share a build snapshot and lifecycle resets freshness", async () => {
  let requests = 0;
  const fetchSnapshot = async () => {
    requests += 1;
    return fixture();
  };
  resetContentSnapshot({ fetchSnapshot });
  const otherModule = await import(
    "../src/lib/build-content.mjs?independent-instance"
  );
  const [a, b] = await Promise.all([
    getContentSnapshot(),
    otherModule.getContentSnapshot(),
  ]);
  assert.equal(a, b);
  assert.equal(requests, 1);
  contentSnapshotIntegration().hooks["astro:build:done"]({
    logger: { info() {} },
  });
  resetContentSnapshot({ fetchSnapshot });
  assert.notEqual(await getContentSnapshot(), a);
  assert.equal(requests, 2);
  contentSnapshotIntegration().hooks["astro:build:start"]();
  assert.throws(
    () =>
      contentSnapshotIntegration().hooks["astro:build:done"]({
        logger: { info() {} },
      }),
    /got 0/,
  );
});

test("related stories match category overlap then publication date without mutating the snapshot", () => {
  const posts = [
    {
      _id: "self",
      slug: { current: "self" },
      categories: [{ _id: "food" }, null],
    },
    {
      _id: "old",
      slug: { current: "old" },
      categoryIds: ["food"],
      publishedAt: "2025-01-01",
    },
    {
      _id: "new",
      slug: { current: "new" },
      categoryIds: ["food"],
      publishedAt: "2026-01-01",
    },
    {
      _id: "other",
      slug: { current: "other" },
      categoryIds: [],
      publishedAt: "2026-02-01",
    },
    {
      _id: "undated",
      slug: { current: "undated" },
      categoryIds: [],
      publishedAt: null,
    },
  ];
  const original = structuredClone(posts);
  assert.equal(typeof snapshotModule.relatedPostsFor, "function");
  assert.deepEqual(
    snapshotModule.relatedPostsFor(posts, posts[0], 3).map((post) => post._id),
    ["new", "old", "undated"],
  );
  assert.deepEqual(
    snapshotModule.relatedPostsFor(posts, posts[4]).map((post) => post._id),
    ["self", "other", "new", "old"],
  );
  assert.deepEqual(posts, original);
});

test("missing category arrays retain GROQ null-score ordering", () => {
  const post = { slug: { current: "current" }, categories: [{ _id: "food" }] };
  const posts = [
    {
      _id: "match",
      slug: { current: "match" },
      categoryIds: ["food"],
      publishedAt: "2026-01-01",
    },
    {
      _id: "missing",
      slug: { current: "missing" },
      categoryIds: null,
      publishedAt: "2025-01-01",
    },
  ];
  const related = snapshotModule.relatedPostsFor(posts, post);
  assert.deepEqual(
    related.map((entry) => entry._id),
    ["missing", "match"],
  );
  assert.equal(related[0].categoryScore, null);
});

test("development cache refreshes after TTL without duplicating in-flight reads", async () => {
  let time = 0;
  let requests = 0;
  const load = snapshotModule.createSnapshotLoader(
    async () => {
      requests += 1;
      return fixture();
    },
    { ttlMs: 100, now: () => time },
  );
  await load();
  time = 99;
  await load();
  assert.equal(requests, 1);
  time = 101;
  await Promise.all([load(), load()]);
  assert.equal(requests, 2);
});

test("malformed or empty snapshots abort rather than generating an empty site", async () => {
  for (const content of [
    {},
    { posts: [], categories: [] },
    { posts: "invalid", categories: [] },
  ]) {
    await assert.rejects(
      snapshotModule.createSnapshotLoader(async () => content)(),
      /Invalid content snapshot/,
    );
  }
});

test("quota failures stay failed for the build instead of retrying per route", async () => {
  let requests = 0;
  const load = snapshotModule.createSnapshotLoader(async () => {
    requests += 1;
    throw new Error("quota exhausted");
  });
  await assert.rejects(load(), /quota exhausted/);
  await assert.rejects(load(), /quota exhausted/);
  assert.equal(requests, 1);
});

const fixture = () => ({
  posts: [{ _id: "a", title: "First", slug: { current: "first" }, body: [] }],
  categories: [{ _id: "c", title: "Food", slug: { current: "food" } }],
});

test("all concurrent and subsequent consumers share one content request", async () => {
  assert.equal(
    typeof snapshotModule.createSnapshotLoader,
    "function",
    "snapshot loader exists",
  );
  let requests = 0;
  const load = snapshotModule.createSnapshotLoader(async () => {
    requests += 1;
    await new Promise((resolve) => setImmediate(resolve));
    return fixture();
  });
  const snapshots = await Promise.all(
    Array.from({ length: 600 }, () => load()),
  );
  assert.equal(requests, 1);
  assert.equal(await load(), snapshots[0]);
  assert.equal(snapshots[0].posts[0].slug.current, "first");
  assert.equal(snapshots[0].manifest.articlePaths[0], "/blog/first/");
});
