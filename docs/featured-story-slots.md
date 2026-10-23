# Temporary homepage headline slots

Both `/` and `/blog/` select their Top Stories placements through `src/lib/featured-story.mjs`. `PRIMARY_FEATURE_SLUG` pins the CAPS article first. While the Dwell window is active, `selectSecondaryFeaturedPost` places Delilah directly beneath it in the left lead column, never again in the compact/latest lists. If CAPS is unavailable, Dwell can still be the primary lead during its original window. The existing older editorial/newest-story fallbacks remain available. The selectors do not change publication dates or unpublish articles.

## Primary lead

- Article: `singapore-expo-halloween-trading-card-show-caps-2026`
- Source Reel: `De0pqCnxYVL`
- Sanity document: `sgdaily-De0pqCnxYVL`
- Delilah appears directly below it during the original Dwell slot. CAPS remains the lead when that slot expires.

## Dwell slot

- Article: `ex-tiktok-gm-delilah-chan-dwelldrop-local-shops`
- Sanity document: `dwell-delilah-chan-founder-feature`
- Starts: `2026-10-18T08:30:13Z`
- Ends (exclusive): `2026-10-25T08:30:13Z` / 25 October 2026, 16:30:13 Singapore
- Duration: exactly seven days.
- At expiry, the Delilah secondary pin ends. CAPS stays the primary lead; Delilah remains published and eligible for ordinary listings.

Astro serves static HTML. The date guard takes effect on a build, not merely as wall-clock time passes on the published HTML. A one-shot Hermes job, `d0ce3c2873be` (End Dwell secondary feature slot), is scheduled at expiry to run tests, trigger the Git/Cloudflare rebuild and verify CAPS stays first while the Delilah secondary pin disappears. Use `hermes-heavy-run` for any local build; prefer the remote Git-connected build if host headroom is inadequate. Normal later content builds also observe the expiry guard. If a later editorial request changes the slot, the expiry job must not overwrite the newer setting.

Tests: `node --test scripts/featured-story.test.mjs`. They cover priority over newer posts, start/end boundaries, the seven-day duration, missing/empty fallback behaviour and integration in both templates.

At publication, verify the Sanity article anonymously, the generated and live article, both live featured-post links, and the Cloudflare Pages check for the exact Git commit. Do not treat HTTP 200 alone as proof that the intended content is deployed.
