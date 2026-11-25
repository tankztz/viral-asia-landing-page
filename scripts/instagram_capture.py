"""Audit published article image coverage or archive one verified Instagram cover."""
import argparse
import hashlib
import io
import json
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit

import requests


SOURCE_HANDLE = 'thesgdays'  # Article ingestion only. Legacy publisher inventories stay read-only.
PROFILE = f'https://www.instagram.com/{SOURCE_HANDLE}/'
POST = re.compile(r'/(?:(?P<owner>[\w.]+)/)?(?:p|reels?|tv)/(?P<code>[A-Za-z0-9_-]+)/?')
API = 'https://3an9f3n5.api.sanity.io/v2025-02-19/data/query/production'
QUERY = '''*[_type == "post" && defined(slug.current)] | order(_id){_id, sourceId, sourceIds,
 sourcePlatform, sourceUrl, "links":body[_type=="socialEmbed"].url, "marks":body[].markDefs[].href,
 "text":body[].children[].text, "hero":mainImage.asset->{_id,url,originalFilename},
 "inline":body[_type=="image"].asset->{_id,url,originalFilename}}'''


def identity(url):
    u = urlsplit(url or '')
    m = POST.fullmatch(u.path)
    if u.scheme == 'https' and u.netloc in ('www.instagram.com', 'instagram.com') and m:
        return (m['owner'] or '').lower(), m['code']
    return '', ''


def discover(storage_state=None):
    """Bounded front of the profile, not a chronological or complete archive."""
    from patchright.sync_api import sync_playwright

    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome', headless=True)
        context = browser.new_context(storage_state=storage_state)
        page = context.new_page()
        page.goto(PROFILE, wait_until='domcontentloaded', timeout=45000)
        cards = page.locator('main a:has(img)')
        cards.first.wait_for(timeout=15000)
        if page.url.rstrip('/') != PROFILE.rstrip('/'):
            raise ValueError('profile redirected; source discovery blocked')
        urls = cards.evaluate_all('(cards) => cards.map(card => card.href)')
        candidates = list(dict.fromkeys(u for u in urls if identity(u)[0] == SOURCE_HANDLE))
        if not candidates:
            raise ValueError('no target-account post links verified; discovery inconclusive')
        return candidates


def audit(docs, profile_urls):
    owners = {}
    for url in profile_urls:
        owner, code = identity(url)
        if code and owner:
            owners.setdefault(code, set()).add(owner)
    observed = {code for code, seen in owners.items() if seen == {SOURCE_HANDLE}}
    articles, matches, missing = [], {}, []
    for doc in docs:
        src = doc.get('sourceIds') or {}
        urls = [doc.get('sourceUrl'), *(doc.get('links') or []), *(doc.get('marks') or [])]
        for s in doc.get('text') or []:
            urls.extend(re.findall(r'https://(?:www\.)?instagram\.com/(?:[\w.]+/)?(?:p|reels?|tv)/[\w-]+', s or ''))
        ids = {identity(u)[1] for u in urls}
        ids.update(src.get('instagramMirrors') or [])
        ids.add(src.get('instagram'))
        if doc.get('sourcePlatform') == 'instagram':
            ids.add(doc.get('sourceId'))
        ids = {x for x in ids if isinstance(x, str) and re.fullmatch(r'[A-Za-z0-9_-]+', x)}
        if not ids:
            continue
        assets = [a for a in [doc.get('hero'), *(doc.get('inline') or [])] if a and a.get('_id') and a.get('url')]
        articles.append({'id': doc['_id'], 'shortcodes': sorted(ids), 'assets': assets})
        for code in sorted(observed & ids):
            matches.setdefault(code, []).append(doc['_id'])
        if observed & ids and not assets:
            missing.append(doc['_id'])
    return {'published_posts': len(docs), 'instagram_articles': len(articles),
            'articles_with_saved_image': sum(bool(a['assets']) for a in articles),
            'observed_thesgdays_shortcodes': sorted(observed), 'profile_matches': matches,
            'matched_without_saved_image': missing, 'articles': articles}


class Meta(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = {}

    def handle_starttag(self, tag, attrs):
        if tag == 'meta':
            a = dict(attrs)
            self.tags[a.get('property') or a.get('name')] = a.get('content') or ''


def fetch(url, limit):
    with requests.get(url, timeout=25, stream=True, allow_redirects=False) as response:
        if response.status_code != 200:
            raise ValueError(f'HTTP {response.status_code} from {urlsplit(url).hostname}')
        buf = bytearray()
        for chunk in response.iter_content(65536):
            buf.extend(chunk)
            if len(buf) > limit:
                raise ValueError('response exceeds size limit')
        return bytes(buf)


def capture(url, root):
    from PIL import Image

    owner, code = identity(url)
    if owner != SOURCE_HANDLE:
        raise ValueError(f'expected an Instagram permalink for @{SOURCE_HANDLE} only')
    target = root / owner / code
    if target.exists():
        saved = json.loads((target / 'receipt.json').read_text())
        if (identity(saved['source_url']) != (owner, code) or saved['filename'] not in ('cover.jpg','cover.png','cover.webp')
                or hashlib.sha256((target / saved['filename']).read_bytes()).hexdigest() != saved['sha256']):
            raise ValueError('existing capture failed identity or hash check')
        return saved
    clean = 'https://www.instagram.com' + urlsplit(url).path
    meta = Meta()
    meta.feed(fetch(clean, 8_000_000).decode('utf-8'))
    tags = meta.tags
    author = re.search(r'\(@([\w.]+)\)\s*•\s*Instagram\b', tags.get('twitter:title', ''), re.I)
    if identity(tags.get('og:url')) not in ((owner, code), ('', code)) or not author or author[1].lower() != owner:
        raise ValueError('post owner or canonical shortcode not verified')
    image = tags.get('og:image', '')
    u = urlsplit(image)
    if u.scheme != 'https' or not re.fullmatch(r'(?:[\w-]+\.)+(?:cdninstagram\.com|fbcdn\.net)', u.netloc):
        raise ValueError('missing or unexpected Instagram image host')
    data = fetch(image, 20_000_000)
    with Image.open(io.BytesIO(data)) as im:
        ext = {'JPEG':'jpg', 'PNG':'png', 'WEBP':'webp'}.get(im.format)
        if not ext or min(im.size) < 100 or im.width * im.height > 40_000_000:
            raise ValueError('invalid cover format or dimensions')
        im.load()
        size = im.size
    receipt = {'source_url': clean, 'owner': owner, 'shortcode': code, 'kind': 'post-preview-cover',
               'filename': f'cover.{ext}', 'width': size[0], 'height': size[1], 'bytes': len(data),
               'sha256': hashlib.sha256(data).hexdigest(), 'captured_at': datetime.now(timezone.utc).isoformat()}
    target.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=target.parent) as tmp:
        stage = Path(tmp) / 'capture'; stage.mkdir()
        (stage / receipt['filename']).write_bytes(data)
        (stage / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
        stage.rename(target)
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    discovery = sub.add_parser('discover', help='Print visible target-profile permalink candidates, one per line')
    discovery.add_argument('--storage-state', type=Path, help='Optional authorized Instagram browser session')
    audit_cli = sub.add_parser('audit'); audit_cli.add_argument('--profile-urls', type=Path)
    cap = sub.add_parser('capture'); cap.add_argument('url'); cap.add_argument('--root', type=Path, required=True)
    args = parser.parse_args()
    if args.command == 'discover':
        print('\n'.join(discover(args.storage_state)))
        return
    if args.command == 'capture':
        result = capture(args.url, args.root)
    else:
        response = requests.get(API, params={'query':QUERY, 'perspective':'published'}, timeout=45)
        response.raise_for_status()
        result = audit(response.json()['result'], args.profile_urls.read_text().splitlines() if args.profile_urls else [])
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
