# EmDash and Cloudflare Notes

This Astro site is prepared for a low-risk Cloudflare Pages deployment while
keeping the current Sanity-backed blog source.

## Current deployment shape

- Build command: `npm run build:staging` for staging review.
- Output directory: `dist`.
- Cloudflare Pages config: `wrangler.toml`.
- Blog source routes:
  - `/blog`
  - `/blog/[slug]`

## EmDash-ready structure

The blog templates now expose stable content hooks for a future EmDash content
model:

- `data-emdash-site="viral-asia"`
- `data-emdash-collection="posts"` on the blog index
- `data-emdash-entry` on article pages
- `data-emdash-entry-list` and `data-emdash-entry` on article card lists
- `data-emdash-body` around article body content

The templates also emit Schema.org JSON-LD for the blog index and article
pages, which gives a clean machine-readable shape before a full EmDash CMS
migration.

## Why this is not a full EmDash install

The root application is already a working Astro marketing site with Sanity
content and Cloudflare Pages docs. A full EmDash template install would be a
separate CMS migration and would replace more of the app than needed for this
staging request.

The current change keeps the site buildable, keeps Sanity content rendering,
and leaves clear hooks for mapping posts into EmDash later.
