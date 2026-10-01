# Sanity build request budget

The static site reads one uncached, published-only Sanity snapshot per Astro
build. `src/lib/build-content.mjs` owns the GROQ projection and Astro lifecycle
integration; `src/lib/content-snapshot.mjs` owns promise deduplication, the route
manifest adapter and local related-story ranking.

All content pages, `getStaticPaths`, RSS and sitemap must use
`getContentSnapshot()` rather than issuing their own Sanity requests. Keep image
URL builders separate: they do not fetch content.

- The global symbol shares one promise across Astro/Vite module instances.
- Each build resets the promise, so consecutive builds read fresh content.
- Development uses a five-second TTL, measured after request settlement.
- Build reads use the origin API, `perspective: published`, and no SDK retries.
  Failed/empty/malformed snapshots abort the build instead of silently producing
  an incomplete site or retrying once per route. The last deployed site stays up.
- The integration logs `[sanity-snapshot] request 1: ... posts` and requires exactly
  one snapshot fetch at build completion. This counter covers snapshot fetches,
  not Studio activity, publication mutations, or independent verification tools.
- Categories and all article bodies are fetched together. Related stories retain
  category-overlap ranking and GROQ's date ordering (null dates before strings).
- Do not persist the snapshot across builds or commit it to Git. As the archive
  grows, measure response size; use bounded pagination if it approaches Sanity's
  response limits, and revise the request-budget assertion accordingly.

## Verification

`npm run test:content-routes` runs offline request-sharing, lifecycle, TTL,
quota-failure, metadata and route tests. `npm run validate:pr` builds once, then
checks all article routes, category inventory, sitemap, RSS and SEO metadata.
Its three independent verification scripts each perform a fresh manifest read;
these are separate from the single build request.

Publication operations should submit all prepared articles before triggering one
production rebuild per batch, and skip deploy triggers when nothing changed.
CI validation and the production deploy remain separate intentional builds.
No scheduler, publishing-write semantics or Sanity billing settings are changed
by this optimization.

Article meta descriptions are capped at 180 characters without altering visible
excerpts or RSS text. SEO verification checks publication dates against Sanity;
legacy documents without a publication date must not get an invented one.
