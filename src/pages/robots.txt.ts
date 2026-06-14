import type { APIRoute } from "astro";
import { isProduction } from "../config/environment";

export const GET: APIRoute = () => {
  const body = isProduction
    ? "User-agent: *\nAllow: /\n"
    : "User-agent: *\nDisallow: /\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
