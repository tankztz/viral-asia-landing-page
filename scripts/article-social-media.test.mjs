import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { articleBody } from "../src/lib/article-social-media.mjs";

const url = "https://www.instagram.com/p/DGPZcpTp3nG/";
const reel =
  "https://instagram.com/thesgdaily/reel/DGPZcpTp3nG/embed/captioned/?x=1";
const ref = "image-5c1ac3435915e61b31bc9a3e3fb5ec2fed4fd9b6-640x1136-jpg";
const embed = {
  _type: "socialEmbed",
  _key: "social",
  platform: "instagram",
  url: reel,
  caption: "Source: SG Daily",
};
const span = (text, marks = []) => ({ _type: "span", text, marks });
const linkBlock = {
  _type: "block",
  _key: "legacy",
  children: [span("Source: "), span("SG Daily", ["ig", "strong"])],
  markDefs: [{ _type: "link", _key: "ig", href: url }],
};
const image = {
  _type: "image",
  _key: "photo",
  asset: { _ref: ref },
  sourceUrl: url,
  sourceLabel: "SG Daily",
  alt: "Thai food",
};
const run = (body, hero) =>
  articleBody({ body, mainImage: { asset: { _id: hero } } });

test("structured and legacy sources share one exact-shortcode archive image", () => {
  for (const body of [
    [embed, linkBlock],
    [linkBlock, embed],
  ]) {
    const result = run(body);
    assert.equal(result.filter((n) => n._type === "image").length, 1);
    assert.equal(result.find((n) => n._type === "image").asset._ref, ref);
    assert.doesNotMatch(JSON.stringify(result), /instagram\.com|socialEmbed/);
  }
});

test("hero or already-placed Sanity image is not inserted a second time", () => {
  assert.deepEqual(
    run([embed, image], ref)
      .map((n) => n._type)
      .filter((t) => t === "image"),
    [],
  );
  const photos = run([embed, image]).filter((n) => n._type === "image");
  assert.equal(photos.length, 1);
  assert.equal(photos[0]._key, image._key);
  assert.equal(photos[0].alt, image.alt);
  assert.equal(photos[0].sourceLabel, image.sourceLabel);
  assert.ok(!photos[0].sourceUrl);
});

test("missing match leaves readable attribution, not a frame or unrelated photo", () => {
  for (const url of [
    "https://instagram.com/p/dgpzcptp3ng/",
    "https://notinstagram.com/p/DGPZcpTp3nG/",
    "bad url",
  ]) {
    const result = run([{ ...embed, url }]);
    assert.equal(result.length, 1);
    assert.equal(result[0]._type, "block");
    assert.equal(result[0].children[0].text, embed.caption);
  }
});

test("unlink only the IG post mark; preserve prose, profile, and other platforms", () => {
  const wiki = { _key: "wiki", _type: "link", href: "https://example.org/" };
  const block = {
    ...linkBlock,
    children: [
      span("According to "),
      span("SG Daily", ["ig", "strong"]),
      span(" and "),
      span("the venue", ["wiki"]),
    ],
    markDefs: [...linkBlock.markDefs, wiki],
  };
  const untouched = [
    {
      ...embed,
      platform: "tiktok",
      url: "https://www.tiktok.com/@account/video/123",
    },
    { ...embed, platform: "youtube", url: "https://youtu.be/123" },
    {
      ...linkBlock,
      markDefs: [
        { ...linkBlock.markDefs[0], href: "https://www.instagram.com/venue/" },
      ],
    },
  ];
  const [prose, ...rest] = run([block, ...untouched]);
  assert.deepEqual(prose.markDefs, [wiki]);
  assert.deepEqual(prose.children, [
    block.children[0],
    span("SG Daily", ["strong"]),
    ...block.children.slice(2),
  ]);
  assert.deepEqual(rest, untouched);
});

test("article templates compile and the browser upgrader cannot recreate IG frames", async () => {
  const { transform } = await import("@astrojs/compiler");
  const { transform: transformTs } = await import("esbuild");
  for (const file of [
    "src/pages/blog/[slug].astro",
    "src/components/SocialEmbed.astro",
  ]) {
    const template = await readFile(
      new URL(`../${file}`, import.meta.url),
      "utf8",
    );
    const result = await transform(template, { filename: file });
    assert.deepEqual(
      result.diagnostics.filter((d) => d.severity === 1),
      [],
    );
    await transformTs(result.code, { loader: "ts", format: "esm" });
    if (file.includes("[slug]")) {
      assert.match(template, /value=\{articleBody\(post\)\}/);
      const script = template.match(
        /<script is:inline>([\s\S]+?)<\/script>/,
      )[1];
      assert.doesNotMatch(script, /instagram|createElement\("iframe"\)/i);
      assert.match(script, /tiktok\.com\/embed\.js/);
    }
  }
});
