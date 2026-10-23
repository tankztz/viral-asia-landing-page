import { createHash } from "node:crypto";

// Only known publishing identities: do not guess from a person's surname.
const PUBLISHING_DESKS = new Set([
  "Viral Asia",
  "Viral Asia editorial",
  "SG Daily",
]);

export function authorArchives(posts) {
  const authors = new Map();
  const paths = new Map();
  for (const post of posts) {
    const name = post.author?.name;
    if (typeof name !== "string" || !name.trim()) continue;
    if (!authors.has(name)) {
      const base =
        name
          .normalize("NFKD")
          .replace(/\p{M}/gu, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "author";
      // Always suffix: a later colliding name must not change an existing URL.
      const digest = createHash("sha256")
        .update(name)
        .digest("hex")
        .slice(0, 12);
      const slug = `${base}-${digest}`;
      if (paths.has(slug)) throw new Error(`Author URL collision: ${name}`);
      paths.set(slug, name);
      authors.set(name, {
        name,
        type: PUBLISHING_DESKS.has(name) ? "Organization" : "Person",
        slug,
        path: `/authors/${slug}/`,
        posts: [],
      });
    }
    authors.get(name).posts.push(post);
  }
  return [...authors.values()];
}

export function authorEntity(author, canonicalUrl) {
  if (!author) return undefined;
  const url = canonicalUrl(author.path);
  return {
    "@type": author.type,
    "@id": `${url}#author`,
    name: author.name,
    url,
  };
}

export function articleStructuredData(
  post,
  { author, publisher, canonicalUrl, description, image, section },
) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    datePublished: post.publishedAt || undefined,
    dateModified: post._updatedAt || post.publishedAt || undefined,
    author,
    publisher,
    articleSection: section,
    image,
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
  };
}

export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(({ name, url }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: url,
    })),
  };
}

export function heroDimensions(post) {
  const { width, height } = post.mainImage?.asset?.metadata?.dimensions || {};
  return Number.isFinite(width) &&
    width > 0 &&
    Number.isFinite(height) &&
    height > 0
    ? { width, height }
    : {};
}
