# Viral Asia Website

Astro marketing site for [viralasia.co](https://viralasia.co).

The current production site is automatically deployed by Cloudflare from the
`main` branch. Do not push experimental work directly to `main`.

## Environments

| Environment | Git branch       | Purpose                                   |
| ----------- | ---------------- | ----------------------------------------- |
| Production  | `main`           | Live site at `viralasia.co`               |
| Staging     | `staging`        | Review and test changes before production |
| Local       | Any local branch | Development on your machine               |

Cloudflare Pages exposes `CF_PAGES_BRANCH` during builds. Any Cloudflare branch
preview other than `main` automatically receives `noindex, nofollow`, a
disallowing `robots.txt`, and a visible staging banner.

For local staging behavior, use `npm run dev:staging` or
`npm run build:staging`.

## Local Development

Requirements:

- Node.js 20
- npm

```bash
npm ci
npm run dev:staging
```

Production-equivalent build:

```bash
npm run build
npm run preview
```

Staging build with search-indexing protection:

```bash
npm run build:staging
npm run preview
```

## Project Boundaries

- `src/pages` contains public routes.
- `src/components` contains the current landing-page sections.
- `public` contains static marketing assets and portfolio examples.
- Sanity project `3an9f3n5`, dataset `production`, supplies blog content.
- `viral-asia-blog` is a separate Sanity Studio project embedded in this
  repository. It is not part of the root Astro build.
- `/studio` is also currently bundled into the root Astro site. This duplicate
  Studio integration should be removed during the decoupling phase.

## Deployment Safety

1. Create changes on `staging` or a feature branch.
2. Run `npm ci` and `npm run build:staging`.
3. Push the non-`main` branch and review the Cloudflare preview.
4. Merge to `main` only after approval. A merge to `main` deploys production.

Do not attach `viralasia.co` or another production domain to a preview branch.
Do not configure staging to write to the Sanity `production` dataset.

## Documentation

- [Current audit and risks](docs/AUDIT.md)
- [Staging and Cloudflare workflow](docs/STAGING.md)
- [Decoupling and redesign roadmap](docs/ROADMAP.md)
