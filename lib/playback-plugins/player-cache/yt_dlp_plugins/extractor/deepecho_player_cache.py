"""Playback-only cache for versioned YouTube player JS; yt-dlp still resolves audio."""
import hashlib
import time
from urllib.parse import urlparse

from yt_dlp.extractor.youtube import YoutubeIE as _YoutubeIE


class _DeepEchoYoutubeIE(_YoutubeIE, plugin_name='deepecho_player_cache'):
    def _load_player(self, video_id, player_url, fatal=True):
        # Cache only the immutable, versioned JS file, never cookies or song URLs.
        parsed = urlparse(player_url)
        if parsed.scheme != 'https' or parsed.hostname != 'www.youtube.com' or not parsed.path.startswith('/s/player/'):
            return super()._load_player(video_id, player_url, fatal=fatal)
        key = hashlib.sha256(player_url.encode()).hexdigest()
        memory_key = self._player_js_cache_key(player_url)
        if memory_key in self._code_cache:
            return self._code_cache[memory_key]
        try:
            cached = self.cache.load('deepecho-player-js', key)
            if (isinstance(cached, dict) and cached.get('url') == player_url
                    and 0 <= time.time() - cached.get('at', 0) < 7 * 86400
                    and isinstance(cached.get('code'), str)
                    and 1000 < len(cached['code']) < 12 * 1024 * 1024
                    and hashlib.sha256(cached['code'].encode()).hexdigest() == cached.get('sha256')):
                self._code_cache[memory_key] = cached['code']
                self.write_debug('DeepEcho: reusing versioned player JS')
                return cached['code']
        except (OSError, ValueError, TypeError, AttributeError):
            pass  # Missing, disabled or corrupt cache falls back to normal yt-dlp.
        code = super()._load_player(video_id, player_url, fatal=fatal)
        if isinstance(code, str) and 1000 < len(code) < 12 * 1024 * 1024:
            try:
                self.cache.store('deepecho-player-js', key, {
                    'url': player_url, 'code': code, 'at': time.time(),
                    'sha256': hashlib.sha256(code.encode()).hexdigest(),
                })
                recent = self.cache.load('deepecho-player-js', 'recent')
                recent = recent if isinstance(recent, list) else []
                recent = [k for k in recent if isinstance(k, str) and len(k) == 64
                          and all(c in '0123456789abcdef' for c in k) and k != key]
                recent.append(key)
                # Keep six versions. Tombstones use yt-dlp's own cache writer;
                # no filesystem paths or recursive deletion are involved.
                for old in recent[:-6]:
                    self.cache.store('deepecho-player-js', old, None)
                self.cache.store('deepecho-player-js', 'recent', recent[-6:])
            except (OSError, ValueError, TypeError, AttributeError):
                pass
        return code
