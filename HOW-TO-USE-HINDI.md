> **Current release: DEEP-ECHO 2.0.0.** Read `START-HERE-2.0.0.md` and `FEATURE-STATUS-2.0.0.md` first. Older notes below are retained for history.

# Deepeccho v1.6.4 quick notes

- Floating Lyrics ab minimized/Game Mode me bhi apne playback clock se sync rehti hain.
- Background auto-next me next song silent/volume-zero par stuck nahi rahega.
- Downloaded songs ka artwork local cache hota hai, isliye offline cover image available rahegi.

# Deepeccho 1.1.0 — Quick start

ZIP extract karo. echo-pc ke andar Test-Chalao.bat double-click karo.
Node.js installed hona chahiye. First setup ke liye internet chahiye.

Windows installer banane ke liye Build-Karo.bat chalao. Build successful ho toh dist mein .exe milegi.
Yeh updated source package hai, prebuilt .exe nahi.

Play: song ke triangle par click; bottom bar actual audio-loading percentage dikhati hai.
Like: heart par click. Icon current theme ka rang lega.
Downloads: permanently saved songs yahan milenge; offline playback yahin se karo.
Lyrics: song chala kar Lyrics tab kholo. Matching na ho toh correct Song title / Artist likho aur Find lyrics dabao.
Settings: Golden, Light, Dark, Purple, Green, Red Blood, Silver aur Transparent Glass.

Full changes aur test limitations: UPDATE-NOTES-HINDI.md.


## v1.6.3 Game Mode
- Settings > Intelligence Suite > Game Mode se manual ON/OFF.
- Auto option Deepeccho background/minimized/unfocused hone par heavy animations ko suspend karta hai.
- Audio playback, media keys, Next/Previous aur song-end auto-next active rehte hain.
- Game Mode me early yt-dlp prefetch avoid hota hai; next song ko end ke ~24 sec ke andar prefetch kiya jata hai.
- App par wapas aate hi Auto Game Mode visuals restore karta hai.

## v1.6.8 Floating Lyrics Graph
Floating Lyrics kholo. Overlay ke graph icon se real-audio graph ON/OFF kar sakte ho. Overlay ko width me resize karne par graph detail automatically adjust hoti hai. Overlay ki height intentionally limited hai taaki desktop/game screen cover na ho.

## v1.6.10 Lyrics Sync Fix
- Short/prefix English lyric lines ab preserve hoti hain; final renderer unhe auto-caption duplicate samajhkar merge nahi karta.
- Same timestamp par multiple distinct lines ho toh unhe readable time spacing milti hai.
- App lyrics aur Floating Lyrics overlay ek hi corrected timeline use karte hain.
- Purana v8 lyrics cache automatically bypass hota hai; v9 fresh timing data use karta hai.
- v1.6.9 ke professional graph/bounce/theme-particle visuals same rehte hain.
