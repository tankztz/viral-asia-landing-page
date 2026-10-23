import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import * as seo from "../src/lib/seo-foundation.mjs";
const post = (name, slug = "story") => ({
  title: slug,
  slug: { current: slug },
  author: name == null ? null : { name },
});

test("author archives preserve exact bylines and existing article membership without inventing profiles", () => {
  assert.equal(
    typeof seo.authorArchives,
    "function",
    "author archive builder exists",
  );
  const posts = [
    post("Zhao TZ", "one"),
    post("Zhao TZ", "two"),
    post("Joanna Wong", "three"),
    post("Viral Asia", "four"),
    post(null, "five"),
    post("", "six"),
  ];
  const original = structuredClone(posts);
  const authors = seo.authorArchives(posts);
  assert.equal(authors.length, 3);
  const zhao = authors.find((a) => a.name === "Zhao TZ");
  assert.equal(zhao.type, "Person");
  assert.deepEqual(zhao.posts, posts.slice(0, 2));
  assert.equal(
    authors.find((a) => a.name === "Viral Asia").type,
    "Organization",
  );
  assert.ok(zhao.path.startsWith("/authors/zhao-tz-"));
  assert.ok(zhao.path.endsWith("/"));
  assert.deepEqual(Object.keys(zhao).sort(), [
    "name",
    "path",
    "posts",
    "slug",
    "type",
  ]);
  assert.deepEqual(posts, original);
});

test("author URLs stay unique and stable for collisions, Unicode, punctuation and later names", () => {
  const names = [
    "Zhao TZ",
    "Zhao-TZ",
    "zhao tz",
    "趙天澤",
    "!!!",
    "José",
    "Jose",
    "Desk Wong",
  ];
  const authors = seo.authorArchives(
    names.map((name, i) => post(name, `story-${i}`)),
  );
  assert.equal(new Set(authors.map((a) => a.path)).size, names.length);
  for (const author of authors) {
    assert.match(author.slug, /^[a-z0-9-]+$/);
    assert.equal(seo.authorArchives([post(author.name)])[0].path, author.path);
  }
  assert.equal(authors.find((a) => a.name === "Desk Wong").type, "Person");
  assert.equal(
    seo.authorArchives([post("Viral Asia editorial")])[0].type,
    "Organization",
  );
});

test("article schema connects real authors, publisher and canonical while preserving source dates", () => {
  assert.equal(typeof seo.articleStructuredData, "function");
  const entry = {
    ...post("Wong Soon Wee"),
    publishedAt: "2026-10-13T01:00:00Z",
    _updatedAt: "2026-10-15T03:00:00Z",
  };
  const author = seo.authorArchives([entry])[0];
  const canonical = (path) => `https://viralasia.co${path}`;
  const publisher = {
    "@type": "Organization",
    "@id": canonical("/#organization"),
    name: "Viral Asia",
    url: "https://viralasia.co",
  };
  const schema = seo.articleStructuredData(entry, {
    author: seo.authorEntity(author, canonical),
    publisher,
    canonicalUrl: canonical("/blog/story/"),
    description: "Original description",
    image: "https://cdn.sanity.io/original.jpg?w=1400&auto=format",
    section: "Happenings",
  });
  assert.equal(schema["@type"], "BlogPosting");
  assert.equal(schema.author["@type"], "Person");
  assert.equal(schema.author.name, entry.author.name);
  assert.equal(schema.author.url, canonical(author.path));
  assert.equal(schema.author["@id"], `${schema.author.url}#author`);
  assert.deepEqual(schema.publisher, publisher);
  assert.equal(schema.datePublished, entry.publishedAt);
  assert.equal(schema.dateModified, entry._updatedAt);
  assert.equal(schema.url, canonical("/blog/story/"));
  assert.equal(schema.mainEntityOfPage, schema.url);
  assert.equal(
    schema.image,
    "https://cdn.sanity.io/original.jpg?w=1400&auto=format",
  );
  const missing = seo.articleStructuredData(post(null), {
    publisher,
    canonicalUrl: schema.url,
  });
  assert.equal(missing.author, undefined);
  assert.equal(missing.datePublished, undefined);
  assert.equal(missing.dateModified, undefined);
  assert.equal(
    seo.articleStructuredData({ ...entry, _updatedAt: undefined }, {})
      .dateModified,
    entry.publishedAt,
  );
});

test("JSON-LD escapes every less-than sign and round-trips CMS markup without script injection", () => {
  assert.equal(typeof seo.serializeJsonLd, "function");
  const value = {
    headline: '</script><script>alert("x")</script>',
    text: "<b>& Unicode 趙",
  };
  const serialized = seo.serializeJsonLd(value);
  assert.ok(!serialized.includes("<"));
  assert.ok(serialized.includes("\\u003c"));
  assert.deepEqual(JSON.parse(serialized), value);
});

test("breadcrumbs describe real ancestors and hero dimensions use only positive source dimensions", () => {
  assert.equal(typeof seo.breadcrumbSchema, "function");
  const items = [
    { name: "Home", url: "https://viralasia.co/" },
    { name: "Story", url: "https://viralasia.co/blog/story/" },
  ];
  const schema = seo.breadcrumbSchema(items);
  assert.equal(schema["@type"], "BreadcrumbList");
  assert.deepEqual(
    schema.itemListElement,
    items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  );
  const withSize = (dimensions) => ({
    mainImage: { asset: { metadata: { dimensions } } },
  });
  assert.deepEqual(
    seo.heroDimensions(withSize({ width: 1080, height: 1350 })),
    { width: 1080, height: 1350 },
  );
  for (const dimensions of [
    undefined,
    { width: 0, height: 100 },
    { width: 100 },
    { width: "100", height: 100 },
    { width: Infinity, height: 100 },
  ]) {
    assert.deepEqual(seo.heroDimensions(withSize(dimensions)), {});
  }
  assert.deepEqual(seo.heroDimensions({}), {});
});

const source = (file) =>
  readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("article template uses shared author identity, safe schemas, source dimensions and dated metadata", async () => {
  const article = await source("src/pages/blog/[slug].astro");
  assert.match(article, /authorArchives\(posts\)/);
  assert.match(article, /authorEntity\(author, buildCanonicalUrl\)/);
  assert.match(article, /publisher: organizationJsonLd/);
  assert.match(article, /serializeJsonLd\(articleSchema\)/);
  assert.match(article, /serializeJsonLd\(breadcrumbs\)/);
  assert.match(article, /href=\{author.path\}/);
  assert.match(article, /href="\/editorial\/"/);
  assert.match(article, /datetime=\{post.publishedAt\}/);
  assert.match(article, /publishedTime=\{articleSchema.datePublished\}/);
  assert.match(article, /modifiedTime=\{articleSchema.dateModified\}/);
  assert.match(article, /width=\{heroSize.width\}/);
  assert.match(article, /height=\{heroSize.height\}/);
  assert.doesNotMatch(article, /JSON.stringify\(articleSchema\)/);
  assert.match(article, /const heroSize = heroDimensions\(post\)/);
  assert.match(article, /\?w=\$\{width\}&auto=format/);
  assert.match(article, /object-fit: contain/);
});

test("author and editorial pages have canonical links, truthful copy and shared snapshot routes", async () => {
  const author = await source("src/pages/authors/[slug].astro");
  assert.match(author, /authorArchives\(posts\)/);
  assert.match(author, /params: \{ slug: author.slug \}/);
  assert.match(author, /author.posts.map/);
  assert.match(author, /<h1>\{author.name\}<\/h1>/);
  assert.match(author, /canonicalUrl=\{canonicalUrl\(author.path\)\}/);
  assert.match(author, /serializeJsonLd/);
  assert.doesNotMatch(
    author,
    /biography|credentials|award-winning|expert journalist/i,
  );
  for (const file of [
    "src/pages/blog/[slug].astro",
    "src/pages/authors/[slug].astro",
    "src/pages/sitemap.xml.ts",
  ]) {
    const route = await source(file);
    assert.match(route, /getContentSnapshot\(\)/);
    assert.doesNotMatch(route, /sanityClient|createClient|\.fetch\(/);
  }
  const editorial = await source("src/pages/editorial.astro");
  assert.match(editorial, /canonicalUrl=\{canonicalUrl\("\/editorial\/"\)\}/);
  assert.match(editorial, /mailto:hello@viralasia.co/);
  assert.match(editorial, /sources|sourcing/i);
  assert.match(editorial, /correction/i);
  assert.match(editorial, /paid|sponsored/i);
  assert.match(editorial, /firsthand/i);
  assert.match(editorial, /<Layout/);
});

test("layout retains canonical and staging noindex while emitting optional article timestamps", async () => {
  const layout = await source("src/layouts/Layout.astro");
  assert.match(
    layout,
    /!isProduction && <meta name="robots" content="noindex, nofollow"/,
  );
  assert.match(layout, /<link rel="canonical" href=\{canonicalUrl\}/);
  assert.match(
    layout,
    /publishedTime\s*&&\s*\(?\s*<meta\s+property="article:published_time"\s+content=\{publishedTime\}/,
  );
  assert.match(
    layout,
    /modifiedTime\s*&&\s*\(?\s*<meta\s+property="article:modified_time"\s+content=\{modifiedTime\}/,
  );
});

test("sitemap emits every actual author archive and editorial once alongside unchanged article URLs", async () => {
  const { transform } = await import("esbuild");
  const sitemap = await source("src/pages/sitemap.xml.ts");
  const { code } = await transform(
    sitemap
      .replace(/^import .*;\n/gm, "")
      .replace("export const GET", "const GET"),
    { loader: "ts", format: "esm" },
  );
  const entries = [
    post("Zhao TZ", "one"),
    post("Joanna Wong", "two"),
    post("Zhao TZ", "three"),
    post(null, "four"),
  ];
  let requests = 0;
  const GET = new Function(
    "getContentSnapshot",
    "canonicalUrl",
    "authorArchives",
    `${code}; return GET;`,
  )(
    async () => {
      requests++;
      return {
        posts: entries,
        manifest: {
          posts: entries.map((p) => ({
            path: `/blog/${p.slug.current}/`,
            publishedAt: "2026-10-13T01:00:00Z",
          })),
        },
      };
    },
    (path) => `https://viralasia.co${path}`,
    seo.authorArchives,
  );
  const xml = await (await GET()).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(requests, 1);
  assert.equal(urls.length, new Set(urls).size);
  assert.ok(urls.includes("https://viralasia.co/editorial/"));
  for (const author of seo.authorArchives(entries))
    assert.ok(urls.includes(`https://viralasia.co${author.path}`));
  for (const entry of entries)
    assert.ok(
      urls.includes(`https://viralasia.co/blog/${entry.slug.current}/`),
    );
  assert.equal(urls.filter((url) => url.includes("/authors/")).length, 2);
});

test("all changed Astro templates compile without errors", async () => {
  const { transform } = await import("@astrojs/compiler");
  for (const file of [
    "src/layouts/Layout.astro",
    "src/pages/blog/[slug].astro",
    "src/pages/authors/[slug].astro",
    "src/pages/editorial.astro",
  ]) {
    const result = await transform(await source(file), { filename: file });
    assert.deepEqual(
      result.diagnostics.filter((d) => d.severity === 1),
      [],
      file,
    );
    assert.ok(result.code.length > 0, file);
    // Astro can emit broken hoisted TypeScript without a diagnostic.
    // Exercise the next build stage rather than accepting compilation alone.
    const { transform: transformTs } = await import("esbuild");
    await transformTs(result.code, {
      loader: "ts",
      format: "esm",
      sourcefile: file,
    });
  }
});
