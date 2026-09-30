const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('src/index.html'), css=read('src/style.css'), flcss=read('src/floating-lyrics.css'), fljs=read('src/floating-lyrics.js');
function ok(v,m){if(!v)throw new Error(m)}
const choices=[...html.matchAll(/data-theme-choice="([^"]+)"/g)].map(m=>m[1]);
ok(choices.slice(0,4).join(',')==='light,dark,golden,love','first four themes must be White/Black/Gold/Love');
ok(/theme-grid\.show-all-themes\s*\{[^}]*max-height:280px[^}]*overflow-y:auto/s.test(css),'expanded themes must scroll');
ok(fljs.includes('function applyOverlayScale()'),'floating overlay resize scale missing');
ok(fljs.includes("--fl-overlay-scale"),'floating overlay CSS variable wiring missing');
ok(flcss.includes('resize-aware floating overlay'),'adaptive overlay CSS missing');
ok(/font-size:clamp\(14px,calc\(25px \* var\(--fl-overlay-scale\) \* var\(--fl-user-font-scale\)/.test(flcss),'current lyric font must scale with overlay');
ok(fljs.includes('ctx.lineWidth=4*dpr*overlayGraphScale'),'graph stroke must scale with overlay');
console.log('v2.2.7 final release polish: PASS');
