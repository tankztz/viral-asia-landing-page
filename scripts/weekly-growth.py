"""Read-only weekly content/RUM report. No publishing, builds or fabricated metrics."""
import datetime
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
STAMP = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
OUT = Path.home() / '.hermes/cache/viralasia-growth/weekly' / STAMP
OUT.mkdir(parents=True, exist_ok=True)


def collect(args, folder):
    result = subprocess.run(['node', *args, '--out', str(OUT / folder)],
                            cwd=ROOT, capture_output=True, text=True, timeout=120)
    (OUT / (folder + '.log')).write_text(result.stdout + result.stderr)
    return result.returncode == 0


def main():
    inventory_ok = collect(['scripts/content-growth.mjs', 'inventory'], 'inventory')
    rum_ok = collect(['scripts/cloudflare-growth.mjs'], 'cloudflare')
    lines = ['Viral Asia: weekly growth check']
    if inventory_ok:
        data = json.loads((OUT / 'inventory/inventory.json').read_text())
        summary = data['summary']
        lines += [f"Published articles: {summary['counts']['uniqueArticles']} (count verified).",
                  f"Metadata review: {summary['missingEssentials']} articles; missing extracted attribution: {summary['withoutAttributedSources']}.",
                  f"Without contextual body links: {summary['withoutContextualInternalLinks']} (related-story cards are separate)."]
    else:
        lines.append('Content inventory unavailable; inspect the saved log. No counts inferred.')
    if rum_ok:
        report = json.loads((OUT / 'cloudflare/cloudflare-report.json').read_text())
        lines += [f"RUM window: {report['periodStart'][:10]} to {report['periodEndExclusive'][:10]} exclusive, UTC.",
                  f"Estimated page loads: {report['estimatedPageLoads']:,.0f}; estimated visits: {report['estimatedVisits']:,.0f}.",
                  f"Adaptive sampling: up to {report['maxSampleInterval']:.2f} average interval. These are not exact people or Google search clicks."]
        top = [r for r in report['pages'] if r['path'].startswith('/blog/')][:3]
        if top:
            lines.append('Highest observed article page-load estimates:')
            for row in top:
                lines.append(f"- {row['path']}: approximately {row['estimatedPageLoads']:,.0f}")
        lines.append(f"Observed AI-host referral page-load estimate: {report['aiReferralPageLoads']:,.0f}. This is not an AI-citation count; zero does not prove no AI traffic.")
    else:
        lines.append('Cloudflare metrics unavailable; no traffic values inferred. Check the saved log and token permissions.')
    lines.append('Google indexing, queries and clicks: unavailable in this scheduled collector. Supply a real Search Console export to the separate measurement command.')
    lines.append('Read-only: no article edits or deletions. Reports saved locally for comparison.')
    text = '\n'.join(lines)
    (OUT / 'summary.txt').write_text(text + '\n')
    print(text)


if __name__ == '__main__':
    main()
