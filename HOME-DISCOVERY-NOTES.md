# Home discovery and developer information

Changed-file backup: `../../backups/before-home-sections-20261008-214204/index.html` (hash-verified). Added files: src/home-discovery.js, src/home-discovery.css, tests/home-discovery.test.js and this note.

- Home now includes Speed Dial for liked songs, up to three saved playlists and recent songs. Empty histories show quick English/Bollywood discoveries.
- Viral Songs searches current month/year for regional trending songs and viral covers/remixes. Results are deduplicated, limited to 12 and use existing playable song cards. These are search-based discoveries, not a verified viral chart; specific examples and rankings are not guaranteed.
- Successful discoveries are saved locally for six hours. Home/foreground checks refresh stale data while online; a manual Refresh is available. Offline/failure retains previously saved songs. Updates run only while the app is open, Home is visible and playback is not resolving. At most one feed query is started at a time; a running query may finish after the user leaves Home. Initial refresh waits five seconds rather than adding startup-critical work.
- Best Songs of All Time offers 12 on-demand search collections: Hollywood/English, Bollywood, Tollywood, Kollywood, Mollywood, Sandalwood, Punjabi, Bengali, Pakistani/Urdu, Arabic, K-pop and Latin. Open displays playable song rows with Play All; Play starts the collection after loading. These collections reuse existing search/ranking and playback contexts, rather than claiming an editorial chart or altering saved playlists.
- Settings ends with the requested Daiyan Sarwar developer text and an Instagram profile link for enchanting_daiyu. The link opens in a separate window when clicked; no message is sent and no profile was opened during tests.

Validation: 463 Node regression tests and renderer smoke passed. New behavior checks cover collection Open/Play, covers/deduplication, cache reuse, offline retention and stale requests. A hidden Electron preview using mock songs verified section layout, all 12 collections, a loaded viral grid and developer card at the bottom. It used an isolated profile and no real streaming. Button label shortened to Open after visual inspection to avoid truncation on compact cards.

No changes to main.js, preload.js, the playback/download/lyrics engines or Android. Existing Windows launch/build/release scripts remain intact. Restart development DeepEcho with START-OFFLINE.bat to load the additions. No release or GitHub publication performed.

Rollback: close the development app, restore src/index.html from the backup and remove only the added discovery source/style/test/note files. Saved user playlists and downloads do not need restoration.
