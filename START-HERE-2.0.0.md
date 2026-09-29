# DEEP-ECHO 2.0.0

Developed by Daiyan [Allhamdullilah]

## Windows par start / EXE

1. ZIP ko nayi directory mein extract karo. Purana working folder backup rehne do.
2. `Build-Karo.bat` chalao. Node.js/npm installed hona chahiye. Script yt-dlp aur npm dependencies install karke Windows installer banati hai.
3. Installer `dist/DEEP-ECHO-2.0.0-Setup.exe` mein milega.
4. Development mode ke liye dependencies install hone ke baad `npm start`.
5. `npm test` ya `Run-Checks.bat` se automated checks. `Test-Chalao.bat` app launch karta hai.

Package identifier, appId, existing settings keys aur Music/EchoMusicPC download location preserve kiye hain. Visible app/installer name DEEP-ECHO hai. Installed profile `AppData/Roaming/deepeccho` hai; Windows names case-insensitive hote hain. Kisi custom/portable profile se migrate kar rahe ho toh uska backup pehle rakho.

## Kahan kya milega

Settings ke top par Essentials, Appearance Studio, Downloads & Storage, Maintenance & Updates hain. Existing detailed settings neeche preserved hain.

- Quick setup: theme, performance, sound preset.
- Preview a theme: close/Escape se original theme wapas; Apply se save.
- Molten Dragon: theme picker/setup. Lyrics ya immersive player mein solid flowing spine spectrum, tail ribbons, halo, breath glow aur bass embers. Static detailed artwork par live Canvas effects hain; rigged/3D dragon model nahi hai.
- Preview visualizer: pause par labeled demo, playback par real analyser signal.
- Continue last session: saved song/position resume. Startup par unsolicited autoplay nahi.
- Download manager: current-session progress/cancel/retry; quality setting naye downloads ke liye.
- Offline mode: downloaded playback/local search; unavailable online songs par clear message.
- Storage/Repair: size inspection, old temporary cleanup, cache reset, missing download inspection.
- Floating lyrics: Compact/Balanced/Presentation presets. Ctrl+Alt+X click-through; Ctrl+Alt+Space play/pause.

## Update system ki real condition

Update check, version comparison, HTTPS installer download, SHA-256 verification aur explicit Install & close action implemented hain. `release-config.json` mein manifestUrl intentionally blank hai: koi real hosting URL supply/publish nahi hua. Is build mein app “Update feed not published yet” batayegi. Live update service activated hone ka claim nahi hai.

Publisher: Windows installer host karo, `scripts/make-update-manifest.cjs` se manifest banao, manifest HTTPS par host karo aur release-config.json mein uska URL set karke distribute karo. Aane wale releases par package version increment karo. App configured feed se startup availability notification aur manual download/install deti hai. Installer code signing abhi configured nahi hai; checksum verification publisher signing ka substitute nahi hai.

## Audio / testing limits

Normalization attenuation-only measured level matching hai; quiet tracks artificially amplify nahi hote, silence boost nahi hoti. Yeh offline integrated-LUFS mastering nahi hai. Existing song transitions fade-out/fade-in hain, full two-deck overlap mixing nahi.

Automated/unit and mocked desktop UI checks Windows hardware testing ke equal nahi hain. Real Windows installer execution, hardware outputs, global shortcuts over a game, streaming/downloading from live providers, and real release-server upgrade still require Windows validation. Network/service availability can affect online songs and lyrics.
