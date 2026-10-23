# Agent Notes

- Do not add generic marketing filler such as "Campaign notes, food finds,
  lifestyle reads and local stories built for mobile readers." Use concrete
  page content, real labels, or omit the line.
- Avoid vague site-wide footer blurbs like "social-first publishing" unless the
  user explicitly provides that copy.
- For blog pages, keep index and article templates visually consistent.

## Article publishing and growth

- Before publishing or materially revising an article, follow `docs/content-growth-workflow.md`. Save a small editorial brief and run `npm run content:check -- --candidate ... --brief ... --snapshot ... --dry-run --out ...` against a reference-resolved candidate. Repair failures before the CMS write; retain unresolved eligible sources in the checkpoint instead of silently dropping them.
- Choose a factual social brief or a search-led guide based on the reader's task and available evidence, not a word target. Preserve eligible-source coverage and existing per-run limits. Do not fabricate firsthand reporting, demand, credentials, sources, facts or metrics.
- Use actual venue/event names and clear location context in accurate titles. Preserve approved headlines unless explicitly authorised to revise them. Preserve URLs, original publication dates, source covers and disclosures. Add body links only when useful; label historical events as historical.
- High-severity injury, death, crime or allegation claims still require corroboration under the existing publishing policy. Passing the mechanical gate does not verify a claim. Missing dates/authors require evidence, not guessed replacements.
- Check both CMS readback and deployed article content. A successful mutation or build alone is not publication verification.
- Keep analytics exports and content snapshots outside git. Use `growth:cloudflare` for sampled RUM estimates and `growth:search` only with real Search Console exports. Missing metrics are unavailable, not zero. Never treat AI referrals as an AI-citation count or promise ranking gains.
