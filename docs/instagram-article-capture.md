# SG Daily article cover capture

**New daily article inputs: Instagram `@thesgdays` only.** Not `@thesgdaily`, TikTok, recommendations or collaborators’ accounts. This tool has no CMS write credentials, publisher or scheduler. Existing articles and their covers are read-only, even when a new post appears to be about the same event.

From the repository root, use a Python environment with `requests` and Pillow; `discover` also needs Patchright and Chrome. Keep session files, the audit report and source images outside Git. Commands below assume `OUT` is an article-only directory and `IG_STATE` is an existing authorized Instagram storage-state file. Omit `--storage-state` for anonymous discovery.

```sh
mkdir -p "$OUT"
python scripts/instagram_capture.py discover --storage-state "$IG_STATE" > "$OUT/profile-urls.txt" &&
  python scripts/instagram_capture.py audit --profile-urls "$OUT/profile-urls.txt" > "$OUT/cms-audit.json"
python scripts/instagram_capture.py capture 'https://www.instagram.com/thesgdays/reel/SHORTCODE/' --root "$OUT/captures"
python -B -m unittest discover -s scripts -p test_instagram_capture.py
```

- **Discover** returns visible permalink candidates, not a complete history or a determination of newness. On the first daily run establish an article-only baseline; don't import old posts just because they are newly observed. On subsequent runs confirm the source timestamp and check against that baseline, already-published source IDs/mirrors and the actual story. If the previous boundary isn't visible, continue the same profile to the boundary or record a discovery gap. Don't mark a partial scan complete or import from another source to fill it. No video-watcher state is involved.
- **Audit** reads published Sanity posts with slugs, identifies Instagram shortcodes in source IDs, mirrors and article links, and resolves main/body image references to asset documents. These are *coverage* and possible exact-ID matches, not proof every cover depicts the linked post, or a list of replacements. Cross-owner aliases are excluded when both appear in the supplied profile URLs. Do not infer a match from the display name, headline, filename, shared sponsor text, or profile position. No match means no known exact ID, not necessarily a new story.
- **Capture** accepts a single handle-qualified target post or reel URL, independently checks its canonical shortcode and publisher metadata, fetches the post preview, decodes the image, and writes `<root>/thesgdays/<shortcode>/cover.*` plus `receipt.json` atomically. It does not claim to save full-size originals, all carousel slides, or video. Re-running verifies and reuses the saved bytes; it never overwrites a capture. Missing ownership proof, login/redirect, expired CDN image, failed decode or corrupt cache is a blocker. Use the same post with authorized access to resolve it; never guess an image.
- **Handoff**: for a genuinely new, eligible article, review the captured artwork against the source and headline, upload the saved bytes using the existing article publisher and retain the stable Sanity asset reference. Verify the published article's exact source, reference, and image after upload. Never store an expiring Instagram CDN URL as a substitute for saved bytes. No existing cover, body, cron or cursor is changed by this script.
