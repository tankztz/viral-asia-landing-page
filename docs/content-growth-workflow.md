# Content growth workflow

A read-only inventory, prepublication check and GSC Pages measurement workflow. Run from the repository root with Node 22 (existing repository dependencies installed). No new package, build, CMS mutation, deployment, cron or analytics credentials are required for inventory/check. The public loader uses the existing Sanity client; image-credit validation uses the same installed image URL builder as the renderer.

## Editorial policy

- **Keep publishing every eligible imported source.** This tool does not alter the importer, select only high-traffic stories, or suppress short/social-first posts. Run it as an editorial preflight; fix missing essentials/attribution/links without dropping an eligible source. An unresolved issue is an explicit repair task, not a reason to silently discard the source.
- **Social brief:** accurately answer the immediate audience question, attribute the original post, include verified practical details, preserve source context/disclosures. A concise, useful answer can pass.
- **Search-led guide:** answer a durable, specific question about a named place/entity with useful primary-source details and additional reporting. Choose this route because the audience task warrants it, not to hit a length target. Search demand requires separate evidence; the inventory's title/source heuristics do not establish demand.
- No minimum word count, fake padding, bulk noindex/deletion, invented dates, or blanket legacy rewrites. Preserve existing content, images, disclosures and publication dates unless an editor explicitly approves a factual correction. Keep a small prioritized backlog with an owner and evidence for each change.
- Add contextual internal links only where they help the reader. A related-story module is not a body link. A historical event link must be labelled historical; don't imply a past event is upcoming. Distinguish verified pickup/delivery hours from unverified dine-in hours.

## 1. Inventory every published article

```bash
node --test scripts/content-growth.test.mjs
node scripts/content-growth.mjs inventory \
  --out "$HOME/.hermes/cache/viralasia-growth/content-inventory"

# Offline replay; use a known article count only, never a sitemap URL total.
node scripts/content-growth.mjs inventory \
  --snapshot "$HOME/.hermes/cache/viralasia-growth/content-inventory/snapshot.json" \
  --expected-count 652 \
  --out "$HOME/.hermes/cache/viralasia-growth/content-inventory-replay"
```

Without `--snapshot`, the CLI invokes `getContentSnapshot()` once. Its existing unpaginated published-post query returns `{posts,categories,manifest}`; no per-article fetching occurs. A saved file must contain the same expanded post shape (a `manifest` is optional). Draft IDs are explicitly excluded. Every remaining record is processed, including incomplete records, which remain visible with missing-essential flags. Identical repeated records are deduplicated by ID/canonical article URL; conflicting duplicates fail rather than silently losing an article. Record accounting and, when present, manifest count and route sets must agree. `--expected-count` is an optional additional assertion, not a hard-coded production total. A saved snapshot alone cannot prove that its supplier exported the complete live CMS.

Outputs:

- `snapshot.json`: complete public snapshot, outside git.
- `inventory.json`: `{schemaVersion:1,kind,rows,summary,provenance}`.
- `inventory.csv`: one row per unique article; arrays/objects are JSON within quoted CSV cells.
- `inventory-summary.json`: count reconciliation, backlog totals, heuristic totals and provenance.

Row fields: `id`, canonical `url` (null for invalid/missing slug), `title`, `categories` (title/slug), original `publishedAt`/`updatedAt`, `author`, `bodyWordCount`, `sourceUrls`, `contextualInternalLinks`, `missingEssentials`, `socialOnlyReferences`, `editorialClassificationHeuristic`, `reviewFlags`. No original CMS fields are edited.

`bodyWordCount` counts Unicode letter/number runs in Portable Text block spans; punctuation splits tokens and apostrophes within words do not. This is a reproducible diagnostic, not a reading-quality or CJK linguistic segmentation score. Images/embed markup/captions are not counted as prose. Source extraction includes actually used Portable Text link marks, labelled image credits, and `socialEmbed.url`; unused mark definitions do not count as attribution. Source presence is not source quality. `socialOnlyReferences` is true only when at least one external source is present and all extracted source domains are recognized social platforms. It never treats no sources as social-only.

Title cues yield `search-led-review`; otherwise social-only references yield `social-brief-review`; remaining rows are `editor-review`. These are heuristics requiring editorial review, **not measured demand, traffic or proof of article quality**. Body links retain their original href strings. Counts refer to articles from the post snapshot, not static pages or all sitemap URLs.

### Verified baseline (October 23, 2026)

One live snapshot request returned **652 posts**. All 652 unique articles matched the manifest count and paths; zero duplicates/drafts were present. The saved-file replay also verified 652 articles without a network request.

- 15 articles need essential-metadata review: 12 missing excerpts, 2 missing author names, 1 missing publication date. Do not invent a date to silence the flag.
- 2 articles have no extracted visible external attribution.
- All 652 have zero extracted contextual body links; this does **not** mean the rendered site lacks related-story links.
- 424 have social-only extracted references.
- Heuristic labels: 2 search-led-review, 424 social-brief-review, 226 editor-review. These counts are not search opportunity measurements.

Backlog order: fix truthful publication essentials and attribution first; review a small set of useful contextual links next; consider guide expansion only with a genuine audience task and verified additional information. Do not queue all brief posts for lengthening.

## 2. Candidate dry-run / quality gate

Use a **separate** small editorial brief, for example (illustrative placeholder, not real evidence):

```json
{
  "audienceQuestion": "What changed, and what does a visitor need to know?",
  "intentEntity": "Named venue/event and the visitor's task",
  "sources": ["https://example.org/replace-with-the-real-attributed-source"],
  "valueAdded": "Describe the actual useful contribution, not an SEO claim.",
  "classification": "social-brief"
}
```

`classification` must be `social-brief` or `search-led-guide`. `audienceQuestion`, `intentEntity`, `valueAdded` must be nonempty strings. `sources` must be a nonempty array of absolute HTTP(S) URLs, each exactly matching a visible external attribution extracted from the candidate. Prefer verified official information; social sources are legitimate for a social brief. If original reporting is the evidence, link an attributable public record/report; this automated presence check does not authenticate reporting or prove any claim.

```bash
node scripts/content-growth.mjs check \
  --candidate "$HOME/.hermes/cache/viralasia-growth/candidate-resolved.json" \
  --brief "$HOME/.hermes/cache/viralasia-growth/editorial-brief.json" \
  --snapshot "$HOME/.hermes/cache/viralasia-growth/content-inventory/snapshot.json" \
  --dry-run \
  --out "$HOME/.hermes/cache/viralasia-growth/candidate-check"
```

The check is **always** dry-run; `--dry-run` is optional and explicit. It writes only `check.json`, returning `{schemaVersion,kind,dryRun:true,ok,errors,warnings,article,classification,note,provenance}`. Exit 0 = accepted, 1 = editorial check rejected, 2 = input/IO/network failure. `--help` documents command options. Invalid/duplicate/unknown options fail. Default output directory is `~/.hermes/cache/viralasia-growth/`; use separate subdirectories to retain previous reports.

Essential fields: nonempty title, valid single-segment `slug.current`, ISO publication date, resolved `author.name`, at least one category with title/slug, absolute HTTP(S) `mainImage.asset.url`, excerpt, and nonempty prose body. There is **no word-count floor**. Missing attribution or invalid body links fail. Internal links are checked against snapshot article routes plus known public static routes; the candidate's own route is allowed. HTTPS non-www canonical links are required; trailing slash differences and query strings don't change route existence. Fragment targets are warned as unverified. External links are syntax-checked, not fetched; the check does not establish HTTP reachability. No minimum internal-link count is enforced; relevance remains editorial.

### Raw Sanity references must be resolved first

The gate uses the expanded public-snapshot shape, not raw `author._ref`, category `_ref`, or asset `_ref` objects. Do not pass a raw mutation payload and assume unresolved fields are validated. Do not blindly copy a previous author's name if the reference changed.

Resolve references with a **read-only** public query into a different local file. Set `RAW` to the actual candidate path and `RESOLVED` to a new file; the exclusive write deliberately refuses to overwrite an existing file. This command uses the already-installed Sanity client and the project's configuration, not credentials or an install:

```bash
RAW="$HOME/.hermes/cache/viralasia-growth/REPLACE_POST_ID-candidate.json"
RESOLVED="$HOME/.hermes/cache/viralasia-growth/REPLACE_POST_ID-candidate-resolved.json"
node --input-type=module -e '
import {readFile,writeFile} from "node:fs/promises";
import {createClient} from "@sanity/client";
import {SANITY_CONFIG} from "./src/lib/content-routes.mjs";
const [input,output]=process.argv.slice(1);
if(input===output) throw new Error("Use a separate resolved output");
const post=JSON.parse(await readFile(input,"utf8"));
const ids=[post.author?._ref,...(post.categories??[]).map(c=>c?._ref),post.mainImage?.asset?._ref].filter(Boolean);
const refs=ids.length ? await createClient({...SANITY_CONFIG,maxRetries:0}).fetch("*[_id in $ids]{_id,name,title,slug,url}",{ids:[...new Set(ids)]}) : [];
const byId=new Map(refs.map(r=>[r._id,r]));
const resolveRef=r=>{if(!r?._ref)return r;const found=byId.get(r._ref);if(!found)throw new Error(`Unresolved public reference: ${r._ref}`);return found;};
const resolved={...post,author:resolveRef(post.author),categories:(post.categories??[]).map(resolveRef),mainImage:post.mainImage?{...post.mainImage,asset:resolveRef(post.mainImage.asset)}:post.mainImage};
await writeFile(output,JSON.stringify(resolved,null,2)+"\n",{flag:"wx",mode:0o600});
console.log(output);
' "$RAW" "$RESOLVED"
```

This projection changes only the local validation view. Keep the original raw candidate for the existing authorized CMS workflow; do not publish the expanded reference objects as mutation payloads. Claim checks, preserved images/disclosures, approved edit scope and source reliability still need human review even after `ok:true`.

## 3. Actual GSC Pages exports, never invented metrics

Obtain authenticated access to the correct Search Console property. Select Search results → Pages, a completed **28-day** range, consistent search type/country/device/query filters, and export CSV. Use the English **Pages.csv** table, not Queries.csv, the chart/date table, or a combined comparison table. For comparison export the earlier period separately, with identical filters and the same number of days. Record filters and export retrieval time alongside the source CSVs. Keep raw exports/private analytics out of git.

Example uses past, inclusive reporting dates; it runs only after actual exports exist at these paths:

```bash
node scripts/content-growth.mjs measure \
  --current "$HOME/.hermes/cache/viralasia-growth/gsc-current-Pages.csv" \
  --current-start 2026-09-25 --current-end 2026-10-22 \
  --previous "$HOME/.hermes/cache/viralasia-growth/gsc-previous-Pages.csv" \
  --previous-start 2026-08-28 --previous-end 2026-09-24 \
  --snapshot "$HOME/.hermes/cache/viralasia-growth/content-inventory/snapshot.json" \
  --out "$HOME/.hermes/cache/viralasia-growth/gsc-report"
```

Omit all three `--previous*` options for a single period. Measurement never fetches a live content snapshot; optional `--snapshot` only enriches exact URL matches with publication dates. Current/previous dates are required for their respective files; prior dates must precede current dates without overlap, and inclusive durations must match. The CSV does not prove its date range, so the operator must match the supplied dates to the original export. The labels use GSC Pacific reporting dates (`America/Los_Angeles`); dated publication timestamps are converted for the new-page indicator. Do not equate these windows with an unadjusted UTC Cloudflare window.

Outputs: `measurement.json`, `measurement.csv`, `measurement-summary.json`. JSON includes `windows.current`, nullable `windows.previous`, `rows`, `summary`, `provenance`. One row per **exact original URL** in the union of exports; query strings, schemes and trailing slashes are preserved, not canonicalized or merged. The approved owned hosts are `viralasia.co` and `www.viralasia.co` over HTTP(S), with no nonstandard ports/credentials. Foreign/malformed URLs, duplicate URLs, malformed quoting/field counts, duplicate/unsupported headers, negative/invalid numbers, invalid percentages, and clicks greater than known impressions fail the report rather than quietly disappearing.

Each row contains:

- `current` and `previous`: `clicks`, `impressions`, `ctr` (fraction: 10% = 0.1), `position` (exported average, not an invented ranking).
- `delta`: current minus previous clicks/impressions, CTR **percentage points**, and position. Negative position difference means a lower reported average position number, not proof of intervention success. Delta is null when either input is unavailable.
- `observedIn`: `both`, `current-only` or `previous-only`. A missing period row gets null metrics, not zeros. Inventory-only URLs absent from both exports are not included; that absence is not evidence of zero traffic.
- Original `publishedAt` and `newPageDuringCurrentWindow`: true/false only with a known matching publication date; otherwise null. A URL newly observed in an export is **not automatically a new page**.

Quoted fields, escaped quotes, embedded line breaks, UTF-8 BOM, CRLF, comma-grouped numbers and percent CTR are supported. Required URL header: `Top pages`, `Pages`, `Page` or `URL` (case insensitive). Missing metric columns/cells and `~`, `-`, `—`, `N/A`, `null`, `unavailable` become null; CSV outputs represent null as an empty cell. A supplied CTR fraction is accepted, but absent CTR/position is never derived from other metrics.

**GSC export caveat:** Google documents that unavailable `~`/`-` values can become zero in downloaded data. Conservatively, zero impressions become null; with no known impressions, zero clicks/CTR also become null. Position zero is null. Explicit zero clicks/CTR with positive impressions remain reported zeros; verify ambiguous source data in the UI before claiming zero performance. Raw source CSVs remain the evidence. Report summaries describe exported rows, not a complete property total; no average-of-averages or fabricated site totals are produced.

As of this implementation, no authenticated GSC Pages export was supplied. The exercised missing-export path exits 2 with `metrics unavailable (not zero)` and produces no measurement report. Real GSC metrics and period comparison remain **blocked on access/export**, not on a code-generated baseline. Synthetic fixtures are confined to labelled tests and are never production analytics.

Cloudflare is a separate signal: the parent-owned collector is executable as `node scripts/cloudflare-growth.mjs --out "$HOME/.hermes/cache/viralasia-growth"`. Its real RUM report uses estimated sampled page-load events, **not exact unique users or GSC search clicks**. Do not merge those meanings or treat Cloudflare access as GSC access.

Google's authoritative definitions (reference addresses):

```text
https://support.google.com/webmasters/answer/7576553?hl=en
https://support.google.com/webmasters/answer/96568?hl=en
```

## 4. Review after 28 days

1. Re-run inventory and reconcile counts. Newly imported eligible stories should appear; investigate a drop before assuming intentional removal. Check essentials/attribution repair completion, not word-count growth.
2. Compare completed equal-length GSC periods with the same filters; inspect late data, seasonality, event expiry and indexing changes. No export/access means **unavailable** and an access task, not a zero-traffic verdict.
3. Separate newly published pages, stable existing-page cohorts, and URLs absent from one export. New pages need a full observation window before like-for-like conclusions. Do not conflate new observations with new publication.
4. For pages with observed impressions but weak click response, manually check query intent, title accuracy, snippets, SERP context and competing results before choosing a small change. For useful briefs, preserve brevity; build a guide only when verified facts and audience questions warrant it. No automatic deletion/noindex rule or CTR threshold based on missing data.
5. Inspect social/referral response separately using available Cloudflare RUM data and its sampling caveats. Record source/channel/window definitions. Engagement estimates cannot establish search rankings or exact users.
6. Log each approved change (URL, original publication date, actual edit date, hypothesis, source evidence, owner, comparable observations). Retain or refine changes based on evidence; do not claim ranking causality from a before/after comparison. Missing data means continue observation/instrumentation, not fabricate success.

Reports and local candidate checks never authorize CMS writes. Keep all existing content/dates until a separately approved editorial action is executed.
