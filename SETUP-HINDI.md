# Deepeccho - Setup Guide (Beginner ke liye)

## Sabse aasan tarika (1 click)
1. Pehle https://nodejs.org se **Node.js LTS** install kar lo (sirf ek baar, Next-Next karke)
2. Zip file extract karo
3. Folder ke andar **`Build-Karo.bat`** file par **double-click** karo
4. Ek kaala terminal window khulega, khud hi sab install/build kar dega (5-10 min lagenge)
5. Aakhir me ek `dist` folder khud khulega — usme jo `.exe` hai, usi par double-click karke
   Deepeccho hamesha ke liye install ho jayegi

Bas itna hi karna hai. Neeche wale steps sirf reference ke liye hain agar `.bat` file me
koi problem aaye.

---

## Manual steps (agar .bat file na chale to)

### Step 1: Node.js install karo
https://nodejs.org se "LTS" version download-install karo, phir PC restart kar lo.

### Step 2: Project folder kholo
Zip extract karo, folder ke andar right-click → "Open in Terminal"

### Step 3: Dependencies install karo
```
npm install
```

### Step 4: App test karo (ya seedha Test-Chalao.bat double-click karo)
```
npm start
```

### Step 5: Windows .exe banao (ya seedha Build-Karo.bat double-click karo)
```
npm run dist
```
`dist` folder me installer `.exe` ban jayegi — double-click karke install karo.

---

## Downloaded gaane kahan save hote hain?
`Music/EchoMusicPC` folder me (aapke Windows user ke Music folder ke andar).

## Kuch problem aaye to?
- Agar `npm install` me error aaye, screenshot bhejo, main dekh kar batata hoon
- Agar search/play kaam na kare, YouTube ke changes ki wajah se `play-dl` package
  update karna pad sakta hai: `npm install play-dl@latest`

## Important note
Yeh app YouTube se audio nikalta hai (jaise Echo Music khud karta hai). Ye sirf
personal/apne use ke liye hai - isse paisa kamana ya publicly badi scale par
distribute karna YouTube ke Terms of Service ke khilaf ho sakta hai.

### AI Lyrics fallback (v1.4.9)
Normal `npm install` ab local transcription support ke liye `whisper-cpp-node` aur `ffmpeg-static` bhi install karta hai. Agar kisi song ke reliable lyrics/captions nahi milte, Deepeccho first use par multilingual Whisper model download karega. Model ek baar download hone ke baad audio transcription local PC par hoti hai. First setup ke waqt internet aur thoda extra disk space chahiye.
