import hashlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
import instagram_capture as ig


class CaptureTest(unittest.TestCase):
    url = 'https://www.instagram.com/thesgdays/reel/ExampleAb12/'
    cdn = 'https://scontent.cdninstagram.com/post.jpg'

    def page(self, url=None, owner='thesgdays'):
        return (f'<meta property="og:url" content="{url or self.url}">'
                f'<meta name="twitter:title" content="SG Daily (@{owner}) • Instagram reel">'
                f'<meta property="og:image" content="{self.cdn}">').encode()

    def test_only_capture_the_expected_owner_and_exact_shortcode(self):
        for html in (self.page(owner='thesgdaily'), self.page(self.url.replace('Ab12', 'Ab13')),
                     b'<title>Login</title>', self.page().replace(b'scontent.cdninstagram.com', b'example.com')):
            with self.subTest(html=html), tempfile.TemporaryDirectory() as d, \
                    patch.object(ig, 'fetch', return_value=html) as fetch:
                with self.assertRaises(ValueError):
                    ig.capture(self.url, Path(d))
                self.assertEqual(fetch.call_count, 1)
                self.assertEqual(list(Path(d).iterdir()), [])

    def test_daily_input_rejects_legacy_unqualified_and_tiktok_before_fetch(self):
        for url in (self.url.replace('thesgdays', 'thesgdaily'), self.url.replace('thesgdays/', ''),
                    'https://www.tiktok.com/@thesgdays/video/123'):
            with self.subTest(url=url), tempfile.TemporaryDirectory() as d, patch.object(ig, 'fetch') as fetch:
                with self.assertRaises(ValueError):
                    ig.capture(url, Path(d))
                fetch.assert_not_called()

    def test_verified_image_is_idempotent_and_corruption_is_detected(self):
        buf = io.BytesIO(); Image.new('RGB', (128, 160)).save(buf, 'JPEG')
        with tempfile.TemporaryDirectory() as d, patch.object(ig, 'fetch', side_effect=[self.page(), buf.getvalue()]):
            receipt = ig.capture(self.url, Path(d))
            self.assertEqual(receipt['sha256'], hashlib.sha256(buf.getvalue()).hexdigest())
            self.assertEqual(ig.capture(self.url, Path(d)), receipt)
            (Path(d) / 'thesgdays' / 'ExampleAb12' / receipt['filename']).write_bytes(b'damaged')
            with self.assertRaises(ValueError):
                ig.capture(self.url, Path(d))

    def test_not_an_image_never_creates_a_capture(self):
        with tempfile.TemporaryDirectory() as d, patch.object(ig, 'fetch', side_effect=[self.page(), b'Login']):
            with self.assertRaises(OSError):
                ig.capture(self.url, Path(d))
            self.assertEqual(list(Path(d).iterdir()), [])

    def test_grid_and_reels_tab_disagree_on_owner(self):
        report = ig.audit([{'_id':'ambiguous', 'sourceUrl':self.url}],
                          [self.url, self.url.replace('thesgdays', 'another.account')])
        self.assertFalse(report['profile_matches'])
        self.assertFalse(report['matched_without_saved_image'])

    def test_inventory_joins_mirrors_and_links_but_not_related_or_other_owners(self):
        docs = [{'_id':'story','sourceIds':{'instagramMirrors':['ExampleAb12'], 'instagramRelated':['Other']},
                 'links':['https://www.instagram.com/p/X/'], 'hero':None, 'inline':[None]},
                {'_id':'covered','sourceUrl':'https://www.instagram.com/thesgdaily/reel/Z/',
                 'hero':{'_id':'image-real','url':'https://cdn.sanity.io/a.jpg'}}]
        report = ig.audit(docs, [self.url, self.url.replace('thesgdays','elsewhere').replace('ExampleAb12','X')])
        self.assertEqual(report['matched_without_saved_image'], ['story'])
        self.assertEqual(report['articles_with_saved_image'], 1)
        self.assertEqual(report['profile_matches'], {'ExampleAb12':['story']})
        self.assertNotIn('Other', report['articles'][0]['shortcodes'])
