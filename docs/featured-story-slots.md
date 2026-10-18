# Temporary homepage headline slots

Both `/` and `/blog/` select their main Top Stories headline through `src/lib/featured-story.mjs`. The selector takes the existing sorted Singapore posts and checks an explicit UTC window before the prior editorial lead and normal newest-story fallbacks. It does not change publication dates or unpublish articles.

## Dwell slot

- Article: `ex-tiktok-gm-delilah-chan-dwelldrop-local-shops`
- Sanity document: `dwell-delilah-chan-founder-feature`
- Starts: `2026-10-18T08:30:13Z`
- Ends (exclusive): `2026-10-25T08:30:13Z` / 25 October 2026, 16:30:13 Singapore
- Duration: exactly seven days.
- The prior editorial lead resumes according to the existing fallback policy.

Astro serves static HTML. The date guard takes effect on a build, not merely as wall-clock time passes on the published HTML. A one-shot Hermes job, `d0ce3c2873be` (End Dwell homepage headline slot), is scheduled at expiry to run tests, rebuild through `hermes-heavy-run`, push an empty conventional rebuild commit and verify both live lead slots. Normal later content builds also observe the expiry guard. If a later editorial request changes the slot, the expiry job must not overwrite the newer setting.

Tests: `node --test scripts/featured-story.test.mjs`. They cover priority over newer posts, start/end boundaries, the seven-day duration, missing/empty fallback behaviour and integration in both templates.

At publication, verify the Sanity article anonymously, the generated and live article, both live featured-post links, and the Cloudflare Pages check for the exact Git commit. Do not treat HTTP 200 alone as proof that the intended content is deployed.
