import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

for (const page of ["src/pages/index.astro", "src/pages/blog/index.astro"]) {
  const source = readFileSync(new URL("../" + page, import.meta.url), "utf8");
  const selection = source.match(
    /const topPosts =[\s\S]*?(?=const sidePosts)/,
  )?.[0];
  assert.ok(selection, `Missing story selection in ${page}`);
  const select = (count) =>
    JSON.parse(
      JSON.stringify(
        runInNewContext(selection + "; ({topPosts, latestPosts})", {
          storyPosts: Array.from({ length: count }, (_, i) => `post-${i}`),
        }),
      ),
    );

  test(`${page}: six consecutive posts fill the top-story column`, () => {
    assert.deepEqual(
      select(20).topPosts,
      Array.from({ length: 6 }, (_, i) => `post-${i}`),
    );
  });
  test(`${page}: latest feed continues after the compact column without duplicates`, () => {
    const { topPosts, latestPosts } = select(20);
    assert.deepEqual(latestPosts, [
      "post-6",
      "post-7",
      "post-8",
      "post-9",
      "post-10",
    ]);
    assert.equal(new Set([...topPosts, ...latestPosts]).size, 11);
  });
  test(`${page}: short and empty inventories do not repeat posts`, () => {
    for (const count of [0, 1, 3, 6, 8]) {
      const { topPosts, latestPosts } = select(count);
      assert.deepEqual(
        [...topPosts, ...latestPosts],
        Array.from({ length: count }, (_, i) => `post-${i}`),
      );
    }
  });
  test(`${page}: compact rows stay content-sized beside a tall cover`, () => {
    const rules = source.match(/\.side-stack\s*\{([^}]+)\}/)?.[1];
    assert.match(
      rules,
      /align-content:\s*start\s*;/,
      "Grid must pack rows at the top, not stretch them to lead-story height",
    );
    assert.match(rules, /gap:\s*1rem\s*;/);
  });
}
