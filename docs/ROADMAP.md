# Decoupling And Redesign Roadmap

The target is a visually strong, conversion-focused site that can be rebuilt
without risking the current production site.

## Phase 1: Safe Staging

- Keep `main` production-only.
- Use `staging` and feature-branch Cloudflare previews.
- Prevent preview indexing.
- Add build validation on pull requests and staging pushes.
- Document Cloudflare's external deployment settings.

## Phase 2: Extract And Normalize Content

Create a content inventory before redesigning:

- Core positioning and value proposition
- Services and offers
- Proof: results, testimonials, client logos, and viral posts
- Social accounts and outbound links
- Contact details and conversion actions
- Blog content and ownership

Move repeated content into typed data modules or a clearly defined CMS schema.
Keep rendering components independent from the content source.

## Phase 3: Separate Systems

- Marketing site: public, fast, static, conversion-focused.
- Sanity Studio: separately deployed and access-controlled.
- Sanity datasets: production plus a staging or development dataset.
- Static assets: inventoried, optimized, and referenced from a single manifest.
- Analytics: documented event names and conversion goals.

## Phase 4: Redesign

Build the redesign on staging around a measurable conversion path:

1. Clear promise and primary call to action.
2. Credible proof near the first decision point.
3. Services explained through outcomes rather than a feature list.
4. Strong case studies with concrete results.
5. Repeated, trackable lead-generation actions.
6. Fast mobile experience and accessible interactions.

## Phase 5: Release

- Complete visual, content, accessibility, performance, and conversion QA.
- Preserve or intentionally redirect existing URLs.
- Merge to `main` only after staging approval.
- Monitor production analytics and lead quality after launch.
