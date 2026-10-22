"""Exercise the actual playback plugin with an isolated fake yt-dlp cache."""
import importlib.util
import pathlib
import sys
import types
import unittest


class Base:
    def __init_subclass__(cls, **kwargs):
        pass

    def __init__(self):
        self._code_cache = {}
        self.cache = Cache()
        self.downloads = 0

    def _player_js_cache_key(self, url):
        return url

    def _load_player(self, video_id, player_url, fatal=True):
        self.downloads += 1
        return '/* Versioned YouTube player */' * 100

    def write_debug(self, message):
        pass


class Cache:
    def __init__(self):
        self.entries = {}

    def load(self, namespace, key):
        return self.entries.get(key)

    def store(self, namespace, key, value):
        self.entries[key] = value


for name in ('yt_dlp', 'yt_dlp.extractor', 'yt_dlp.extractor.youtube'):
    sys.modules[name] = types.ModuleType(name)
sys.modules['yt_dlp.extractor.youtube'].YoutubeIE = Base
plugin = pathlib.Path(__file__).resolve().parent.parent / 'lib/playback-plugins/player-cache/yt_dlp_plugins/extractor/deepecho_player_cache.py'
spec = importlib.util.spec_from_file_location('player_cache', plugin)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
URL = 'https://www.youtube.com/s/player/12345678/player_ias.vflset/en_US/base.js'


class Checks(unittest.TestCase):
    def test_cross_process_reuse_and_version_change(self):
        first = module._DeepEchoYoutubeIE()
        code = first._load_player('song1', URL)
        second = module._DeepEchoYoutubeIE()
        second.cache = first.cache
        self.assertEqual(second._load_player('song2', URL), code)
        self.assertEqual(second.downloads, 0)
        second._load_player('song3', URL.replace('12345678', '87654321'))
        self.assertEqual(second.downloads, 1)

    def test_corrupt_expired_and_invalid_cache_fetch_normal_player(self):
        for mutate in (lambda e: e.update(code='bad'), lambda e: e.update(at=0), lambda e: e.update(at='invalid')):
            first = module._DeepEchoYoutubeIE()
            expected = first._load_player('a', URL)
            mutate(next(iter(first.cache.entries.values())))
            first._code_cache.clear()
            self.assertEqual(first._load_player('b', URL), expected)
            self.assertEqual(first.downloads, 2)

    def test_disabled_unwritable_cache_does_not_break_playback(self):
        first = module._DeepEchoYoutubeIE()
        first.cache.load = lambda *args: None
        def denied(*args):
            raise OSError('unwritable cache')
        first.cache.store = denied
        self.assertTrue(first._load_player('song', URL))

    def test_non_player_urls_are_not_cached(self):
        first = module._DeepEchoYoutubeIE()
        first._load_player('song', 'https://example.com/base.js')
        self.assertEqual(first.cache.entries, {})

    def test_cache_retains_only_six_player_versions(self):
        first = module._DeepEchoYoutubeIE()
        for version in range(9):
            first._load_player('song', URL.replace('12345678', f'{version:08x}'))
        codes = [entry for entry in first.cache.entries.values()
                 if isinstance(entry, dict) and entry.get('code')]
        self.assertEqual(len(codes), 6)


if __name__ == '__main__':
    unittest.main()
