# Staging Workflow

## Safety Model

- `main` is production and is automatically deployed by Cloudflare.
- `staging` is the shared review branch.
- Feature branches may also use Cloudflare branch previews.
- Non-production Cloudflare branch builds automatically receive:
  - `noindex, nofollow`
  - `robots.txt` with `Disallow: /`
  - a visible staging banner

The repository does not contain the Cloudflare project settings, so verify the
following once in the Cloudflare dashboard before relying on this workflow.

## Cloudflare Checklist

1. Confirm the production branch is exactly `main`.
2. Confirm preview deployments are enabled for `staging`.
3. Confirm only the production deployment owns `viralasia.co`.
4. Confirm the build command is `npm run build`.
5. Confirm the output directory is `dist`.
6. Set the Node.js version to 20.
7. Do not put production-only secrets in preview environment variables.
8. Add Cloudflare Access to the staging domain if the preview must be private.

## Daily Workflow

```bash
git switch staging
git pull --ff-only origin staging
npm ci
npm run dev:staging
npm run build:staging
```

Push only after the staging build succeeds:

```bash
git push origin staging
```

Cloudflare should create a branch preview. Review that preview before merging
to `main`.

## Production Release

Production deployment happens only by merging an approved change into `main`.
Before merging:

1. Verify the staging preview on desktop and mobile.
2. Verify all lead-generation links and forms.
3. Verify analytics events.
4. Run `npm run build`.
5. Confirm the Cloudflare preview and production environment settings differ
   only where intended.

## Sanity Warning

The current staging build reads the Sanity `production` dataset. Do not use the
public `/studio` route from staging to edit content. A separate Sanity dataset
and separate Studio deployment are part of the decoupling roadmap.
