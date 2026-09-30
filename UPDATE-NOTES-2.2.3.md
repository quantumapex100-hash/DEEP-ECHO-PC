# DEEP-ECHO 2.2.3 — Playback recovery hotfix

## Confirmed code defect
The old recovery listener required a single timeupdate jump greater than 0.4 seconds, but replaced its baseline on every event. Normal smaller increments could never cancel an 8-second recovery timer. The timer did not re-check actual progress or buffered playback, and also applied to local files. This could reload healthy playback and show the reported “Connection interrupted” toast.

## Changes
- Any real media progress cancels recovery. The timer independently checks track, source, position, seeking, playback state and buffer readiness before retrying.
- Local downloaded/compatibility files never enter network recovery.
- Playing, pause, seeking, source changes and ending cancel stale timers.
- Retries are capped at two until 30 seconds of healthy media progress. Repeated waiting events do not postpone the same recovery indefinitely.
- Automatic recovery retains queue, section and shuffle state; restoration seeks only once.
- Lyrics text in the app/immersive view no longer bounces. Word highlighting and timing remain. Floating overlay files are unchanged.
- Update checks run 3 seconds after startup, every 60 seconds, on focus/visibility return and on internet reconnect. Automatic checks are throttled to 30 seconds minimum and cannot overlap. Manual checks bypass that throttle. The same version is not announced repeatedly, and an open dialog is preserved.
- Version updated to 2.2.3. App ID, release repository, dependencies and user data locations unchanged.

## Validation
211 Node tests passed, including 7 new playback recovery tests and 4 new update-check tests. JavaScript syntax check passed. A browser smoke test could not run because this environment has no Chromium executable; Windows audio output, floating overlay appearance, EXE build and live GitHub download/install remain to be checked on Windows. This fixes the reproduced recovery logic defect; it is not a guarantee against all hardware, decoding or network stalls.

## Install / release (Hinglish)
1. App band karo. Existing source folder ka backup rakh lo.
2. Is ZIP ke contents existing source folder mein copy/replace karo. Existing .git folder, bin tools aur node_modules ko delete mat karo. AppData/downloads ko touch nahi karna.
3. Local installer ke liye Build-Karo.bat chalao. Installer dist folder mein banega.
4. GitHub source repository already configured hai toh CLOUD-RELEASE.bat chalao. Yeh v2.2.3 tag se existing Windows workflow trigger karega. Release abhi is package se publish nahi hui hai.
5. GitHub release mein installer, blockmap aur latest.yml available hone chahiye. Existing v2.2.2 app mein Settings > Check for updates se pehli baar v2.2.3 lo; naya polling behavior v2.2.3 install hone ke baad chalega.

Normal online detection target is the next one-minute check after complete release assets become available. GitHub propagation, offline state, system sleep and download time can add delay; this is polling, not instant push.

## Windows acceptance check
Play a downloaded song for two minutes with internet disconnected, then an online song for two minutes with lyrics/visualizer enabled. Confirm no repeated retry toast or position reset. Seek, pause/resume, and switch songs. Check steady in-app lyrics and animated floating overlay. Keep a playlist/shuffle active during a genuine network recovery. For an update test, leave v2.2.3 open when a later complete release is published and check that the update appears without restarting.
