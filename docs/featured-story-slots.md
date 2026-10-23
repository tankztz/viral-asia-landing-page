# Homepage headline placements

Both `/` and `/blog/` use `src/lib/featured-story.mjs` for Top Stories placement. `PRIMARY_FEATURE_SLUG` pins CAPS first. Delilah's temporary slot is explicitly disabled (`TEMPORARY_FEATURE.enabled = false`) at the user's request, so it is neither the main feature nor the secondary feature. The existing normal editorial/newest-story fallback remains available.

## Primary lead

- Article: `singapore-expo-halloween-trading-card-show-caps-2026`
- Source Reel: `De0pqCnxYVL`
- Sanity document: `sgdaily-De0pqCnxYVL`

## Delilah: ordinary post

- Article: `ex-tiktok-gm-delilah-chan-dwelldrop-local-shops`
- Sanity document: `dwell-delilah-chan-founder-feature`
- Returned to the regular post list on 23 October 2026; no special placement.
- Publication date, URL, cover and article content are unchanged.
- Original window (retained as inactive history): `2026-10-18T08:30:13Z` to `2026-10-25T08:30:13Z`.
- Superseded expiry job `d0ce3c2873be` (End Dwell secondary feature slot) is paused; it must not make later layout changes for this cancelled slot.

The templates exclude only the actual selected features from regular lists. With the Delilah slot disabled, it returns to ordinary chronological/category listings. The empty secondary-card markup does not render. No article is unpublished and no publication date is altered to change ordering.

Tests: `node --test scripts/featured-story.test.mjs scripts/featured-order.test.mjs`. They cover CAPS priority, the cancelled temporary slot, normal fallback behaviour and regular-list eligibility.

Use `hermes-heavy-run` for any local build; use the Git-connected remote build if local memory headroom is inadequate. Verify the Cloudflare Pages check for the exact pushed commit, then inspect both live routes: CAPS is the lead, no secondary feature is rendered, and Delilah remains accessible as an ordinary post.
