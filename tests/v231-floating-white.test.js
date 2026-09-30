const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const main=fs.readFileSync('main.js','utf8');
const css=fs.readFileSync('src/floating-lyrics.css','utf8');

test('floating lyrics can resize to full monitor work-area width while keeping the near-full default',()=>{
  assert.match(main,/width:\s*Math\.max\(760, area\.width - 28\)/);
  assert.match(main,/maxWidth:\s*Math\.max\(760, area\.width\)/);
  assert.match(main,/minWidth:\s*520, minHeight:\s*108/);
});

test('White UI has a dedicated translucent light floating-lyrics skin',()=>{
  assert.match(css,/DEEP-ECHO 2\.3 V2: White-theme Floating Lyrics skin/);
  assert.match(css,/body\[data-theme="light"\] \.floating-root\{[\s\S]*rgba\(255,253,248,\.88\)/);
  assert.match(css,/body\[data-theme="light"\] \.floating-actions button\{/);
  assert.match(css,/body\[data-theme="light"\] \.floating-current\{/);
  assert.match(css,/body\[data-theme="light"\] \.floating-progress-track\{/);
  assert.match(css,/@keyframes flWhiteThemeBreathe/);
});
