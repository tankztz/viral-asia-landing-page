import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertRouteManifest,
  createContentManifest,
} from "../src/lib/content-routes.mjs";

const fixture = JSON.parse(
  await readFile(new URL("./fixtures/content-manifest.json", import.meta.url), "utf8"),
);
const manifest = createContentManifest(fixture);

test("content discovery derives article paths and counts", () => {
  assert.deepEqual(manifest.articlePaths, [
    "/blog/first-story/",
    "/blog/second-story/",
  ]);
  assert.equal(manifest.articleCount, 2);
  assert.equal(manifest.categoryCount, 2);
});

test("route comparison fails missing, stale, and duplicate routes", () => {
  assert.throws(
    () => assertRouteManifest(manifest.articlePaths, ["/blog/first-story/"]),
    /missing: \/blog\/second-story\//,
  );
  assert.throws(
    () => assertRouteManifest(manifest.articlePaths, [
      ...manifest.articlePaths,
      "/blog/retired-story/",
    ]),
    /stale: \/blog\/retired-story\//,
  );
  assert.throws(
    () => assertRouteManifest(manifest.articlePaths, [
      ...manifest.articlePaths,
      "/blog/first-story/",
    ]),
    /duplicates: \/blog\/first-story\//,
  );
});
