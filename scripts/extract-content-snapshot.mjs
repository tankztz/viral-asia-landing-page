import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distDir = path.join(rootDir, "dist");
const outputDir = path.join(rootDir, "docs", "content", "snapshot");

if (!fs.existsSync(distDir)) {
  throw new Error("dist/ does not exist. Run npm run build:staging first.");
}

const decode = (value) =>
  value
    .replaceAll("&#38;", "&")
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"');

const markdownCell = (value) => String(value).replaceAll("|", "\\|");

const gallerySource = (src) => {
  if (!src.startsWith("/")) return src;
  const encoded = src
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `../../../public${encoded}`;
};

const toRoute = (filePath) => {
  const relative = path.relative(distDir, filePath).replaceAll(path.sep, "/");
  if (relative === "index.html") return "/";
  return `/${relative.replace(/\/index\.html$/, "").replace(/\.html$/, "")}`;
};

const toOutputName = (route) =>
  route === "/"
    ? "home.md"
    : `${route.slice(1).replaceAll("/", "--") || "index"}.md`;

const formatBytes = (bytes) => {
  if (bytes === null) return "external";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const localAssetBytes = (url) => {
  if (!url.startsWith("/")) return null;
  const filePath = path.join(distDir, decodeURIComponent(url.split("?")[0]));
  return fs.existsSync(filePath) ? fs.statSync(filePath).size : null;
};

const htmlFiles = [];
const collectHtml = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectHtml(filePath);
    if (entry.isFile() && entry.name.endsWith(".html"))
      htmlFiles.push(filePath);
  }
};

collectHtml(distDir);
fs.mkdirSync(outputDir, { recursive: true });

const indexRows = [];
const globalImageMap = new Map();

for (const filePath of htmlFiles.sort()) {
  const route = toRoute(filePath);
  if (route === "/studio") continue;

  const document = parse(fs.readFileSync(filePath, "utf8"));
  const title = document.querySelector("title")?.text.trim() || route;

  for (const node of document.querySelectorAll(
    "script, style, noscript, .staging-banner",
  )) {
    node.remove();
  }

  const textLines = (document.querySelector("body")?.structuredText || "")
    .split("\n")
    .map((line) => decode(line.replace(/\s+/g, " ").trim()))
    .filter(Boolean)
    .filter((line, index, lines) => line !== lines[index - 1]);

  const imageMap = new Map();
  for (const image of document.querySelectorAll("img")) {
    const src = decode(image.getAttribute("src") || "");
    if (!src) continue;
    const current = imageMap.get(src) || {
      src,
      alt: decode(image.getAttribute("alt") || ""),
      count: 0,
      bytes: localAssetBytes(src),
    };
    current.count += 1;
    imageMap.set(src, current);
  }

  const backgroundMap = new Map();
  for (const element of document.querySelectorAll("[style]")) {
    const style = decode(element.getAttribute("style") || "");
    for (const match of style.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) {
      const src = match[1];
      const current = backgroundMap.get(src) || {
        src,
        count: 0,
        bytes: localAssetBytes(src),
      };
      current.count += 1;
      backgroundMap.set(src, current);
    }
  }

  const linkMap = new Map();
  for (const link of document.querySelectorAll("a[href]")) {
    const href = decode(link.getAttribute("href") || "");
    if (!href || href.startsWith("/_astro/")) continue;
    const label =
      decode(link.text.replace(/\s+/g, " ").trim()) || "(image link)";
    const key = `${label}\t${href}`;
    linkMap.set(key, {
      label,
      href,
      count: (linkMap.get(key)?.count || 0) + 1,
    });
  }

  const images = [...imageMap.values()].sort((a, b) =>
    a.src.localeCompare(b.src),
  );
  const backgrounds = [...backgroundMap.values()].sort((a, b) =>
    a.src.localeCompare(b.src),
  );
  const links = [...linkMap.values()].sort((a, b) =>
    a.href.localeCompare(b.href),
  );

  for (const image of images) {
    const current = globalImageMap.get(image.src) || {
      ...image,
      types: new Set(),
      routes: new Set(),
    };
    current.types.add("inline");
    current.routes.add(route);
    globalImageMap.set(image.src, current);
  }

  for (const image of backgrounds) {
    const current = globalImageMap.get(image.src) || {
      ...image,
      alt: "",
      types: new Set(),
      routes: new Set(),
    };
    current.types.add("background");
    current.routes.add(route);
    globalImageMap.set(image.src, current);
  }

  const markdown = [
    `# ${title}`,
    "",
    `- Route: \`${route}\``,
    `- Visible text lines: ${textLines.length}`,
    `- Unique inline images: ${images.length}`,
    `- Unique background images: ${backgrounds.length}`,
    `- Unique labeled links: ${links.length}`,
    "",
    "## Visible Text",
    "",
    ...textLines.map((line) => `- ${line}`),
    "",
    "## Inline Images",
    "",
    "| Image | Alt text | Render count | File size |",
    "| --- | --- | ---: | ---: |",
    ...images.map(
      ({ src, alt, count, bytes }) =>
        `| \`${markdownCell(src)}\` | ${markdownCell(alt || "(empty)")} | ${count} | ${formatBytes(bytes)} |`,
    ),
    "",
    "## Background Images",
    "",
    "| Image | Render count | File size |",
    "| --- | ---: | ---: |",
    ...backgrounds.map(
      ({ src, count, bytes }) =>
        `| \`${markdownCell(src)}\` | ${count} | ${formatBytes(bytes)} |`,
    ),
    "",
    "## Links",
    "",
    "| Label | Target | Render count |",
    "| --- | --- | ---: |",
    ...links.map(
      ({ label, href, count }) =>
        `| ${markdownCell(label)} | \`${markdownCell(href)}\` | ${count} |`,
    ),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(outputDir, toOutputName(route)), markdown);
  indexRows.push({
    route,
    title,
    text: textLines.length,
    images: images.length + backgrounds.length,
    links: links.length,
    file: toOutputName(route),
  });
}

const index = [
  "# Rendered Content Snapshot",
  "",
  "Generated from `dist/` by `npm run content:snapshot`.",
  "Repeated carousel images are counted but listed once per route.",
  "The `/studio` administration route is intentionally excluded.",
  "",
  "| Route | Title | Text lines | Unique visible images | Links | Snapshot |",
  "| --- | --- | ---: | ---: | ---: | --- |",
  ...indexRows
    .sort((a, b) => a.route.localeCompare(b.route))
    .map(
      ({ route, title, text, images, links, file }) =>
        `| \`${route}\` | ${markdownCell(title)} | ${text} | ${images} | ${links} | [Open](./${file}) |`,
    ),
  "",
].join("\n");

fs.writeFileSync(path.join(outputDir, "README.md"), index);
const gallery = [
  "# Visible Image Gallery",
  "",
  "Generated from public rendered pages. Repeated carousel items are shown once.",
  "",
  "| Preview | Source | Type | Used on | Alt text | File size |",
  "| --- | --- | --- | --- | --- | ---: |",
  ...[...globalImageMap.values()]
    .sort((a, b) => a.src.localeCompare(b.src))
    .map(
      ({ src, types, routes, alt, bytes }) =>
        `| <img src="${gallerySource(src)}" alt="${alt || ""}" width="160"> | \`${markdownCell(src)}\` | ${[...types].join(", ")} | ${[...routes].map((route) => `\`${route}\``).join(", ")} | ${markdownCell(alt || "(empty)")} | ${formatBytes(bytes)} |`,
    ),
  "",
].join("\n");

fs.writeFileSync(path.join(outputDir, "IMAGE-GALLERY.md"), gallery);
console.log(`Wrote ${indexRows.length} page snapshots to ${outputDir}`);
