import type { APIRoute } from "astro";
import { sanityClient } from "sanity:client";
import { canonicalUrl } from "../config/site";

interface SitemapPost {
  slug: { current: string };
  publishedAt?: string;
  _updatedAt?: string;
}

const STATIC_PATHS = [
  "/",
  "/engage/",
  "/work/",
  "/services/",
  "/clients/",
  "/about/",
  "/contact/",
  "/bio/",
] as const;

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const formatDate = (date?: string) =>
  date ? new Date(date).toISOString().slice(0, 10) : undefined;

const urlEntry = (loc: string, lastmod?: string) => {
  const lastmodTag = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : "";
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmodTag}\n  </url>`;
};

export const GET: APIRoute = async () => {
  const posts = await sanityClient.fetch<SitemapPost[]>(`*[
    _type == "post"
    && defined(slug.current)
    && !(_id in path("drafts.**"))
  ]|order(publishedAt desc){
    slug,
    publishedAt,
    _updatedAt
  }`);

  const entries = [
    ...STATIC_PATHS.map((path) => urlEntry(canonicalUrl(path))),
    ...posts.map((post) =>
      urlEntry(
        canonicalUrl(`/blog/${post.slug.current}/`),
        formatDate(post._updatedAt || post.publishedAt),
      ),
    ),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
