import type { APIRoute } from "astro";
import { isProduction } from "../config/environment";
import { canonicalUrl } from "../config/site";

export const GET: APIRoute = () => {
  const body = isProduction
    ? `User-agent: *\nAllow: /\nSitemap: ${canonicalUrl("/sitemap.xml")}\n`
    : "User-agent: *\nDisallow: /\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
