import type { APIRoute } from "astro";
import { sanityClient } from "sanity:client";
import { canonicalUrl, siteDescriptions } from "../config/site";
import { discoverContentRoutes } from "../lib/content-routes.mjs";

interface RssPost {
  title: string;
  path: string;
  excerpt?: string;
  publishedAt?: string;
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const GET: APIRoute = async () => {
  const { posts } = await discoverContentRoutes(sanityClient);
  const items = posts.map((post: RssPost) => {
    const url = canonicalUrl(post.path);
    const published = post.publishedAt
      ? `\n      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`
      : "";
    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(post.excerpt || post.title)}</description>${published}
    </item>`;
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Viral Asia</title>
    <link>${escapeXml(canonicalUrl("/"))}</link>
    <description>${escapeXml(siteDescriptions.home)}</description>
${items.join("\n")}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
