# Current Audit

Audit date: 2026-06-14

## Build Status

- `npm ci`: succeeds.
- `npm run build`: succeeds and generates 8 static pages.
- Astro resolves to `4.16.18`.
- Build output includes the home page, bio page, blog pages, and Sanity Studio.

## Main Risks

### Production deployment is controlled outside the repository

Cloudflare automatically deploys `main`, but the repository contains no
`wrangler.toml` or equivalent deployment configuration. Branch rules, build
command, environment variables, domains, and rollback settings must be checked
in the Cloudflare dashboard.

### Sanity Studio is coupled to the public marketing build

The root site bundles `/studio` and also contains a separate
`viral-asia-blog` Sanity Studio project. The embedded Studio creates a roughly
4.8 MB minified JavaScript chunk and generates circular-chunk warnings.

Recommended direction: deploy Sanity Studio separately, then remove `/studio`
and Studio-only dependencies from the marketing site.

### Staging currently reads production content

The Astro integration and Studio both hard-code Sanity project `3an9f3n5` and
dataset `production`. Reading production content is acceptable for an initial
visual preview, but staging must not be allowed to edit production content.

### Dependency maintenance is overdue

`npm audit` reports 58 known issues: 2 low, 31 moderate, 23 high, and 2
critical. Most are in the old Astro/Sanity build and Studio dependency tree.
Do not run `npm audit fix --force`; plan an Astro and Sanity upgrade separately
and verify output before production deployment.

### Content and assets are tightly coupled to components

Marketing copy, contact details, account links, testimonials, offers, client
logos, and portfolio lists are hard-coded across many `.astro` files. This
makes a redesign slow and makes content inconsistencies likely.

### Asset weight is high

The repository is about 195 MB. `public` contains about 78 MB across 194 files.
Notable examples include a 17 MB GIF and several 5 MB account images. Assets
need an inventory, deduplication, conversion to modern formats, and explicit
usage tracking before the redesign.

## Build Warnings

- Two Sanity blog posts contain PortableText images without a configured image
  renderer, so those images are omitted from generated pages.
- The browser compatibility database is outdated.
- Sanity Studio creates chunks larger than the recommended 500 kB limit.
- Sanity Studio emits circular chunk and dynamic-import warnings.

## Existing Code Issues To Address During Redesign

- No analytics or conversion-event contract is visible in the repository.
- No automated browser, accessibility, SEO, or link tests.
- Contact information and WhatsApp links are duplicated.
- Footer copyright year is hard-coded.
- Several unused or duplicate assets and components remain.
- The public Studio route broadens the marketing site's attack and maintenance
  surface.
