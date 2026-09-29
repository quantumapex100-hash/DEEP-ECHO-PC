const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pkg=require('../package.json');
const renderer=fs.readFileSync('src/renderer.js','utf8');
const search=fs.readFileSync('src/v220-home-search.js','utf8');
const css=fs.readFileSync('src/v220-home-search.css','utf8');
const workflow=fs.readFileSync('.github/workflows/release-windows.yml','utf8');

test('v2.2.1 search rows single-click to play and remote switching pauses stale audio immediately',()=>{
  assert.equal(pkg.version,'2.2.1');
  assert.match(renderer,/\['search', 'artist-search'\]\.includes\(contextSpec\.type\)/);
  assert.match(renderer,/if \(!audioPlayer\.paused\) audioPlayer\.pause\(\)/);
  assert.match(renderer,/Loading…/);
});

test('autocomplete stays closed until at least two typed characters and uses compact glass styling',()=>{
  assert.match(search,/if \(value\.length < 2\)/);
  assert.match(search,/suggestionItems = uniqueText\(items\)\.slice\(0, 6\)/);
  assert.match(search,/else hideSuggestions\(\)/);
  assert.match(css,/v2\.2\.1 Search UI hotfix/);
  assert.match(css,/backdrop-filter:blur\(24px\)/);
  assert.match(css,/search220-discovery\.hidden/);
});

test('release workflow uses npm and Electron caches and skips duplicate success artifact upload',()=>{
  assert.match(workflow,/actions\/setup-node@v7/);
  assert.match(workflow,/cache: 'npm'/);
  assert.match(workflow,/actions\/cache@v6/);
  assert.match(workflow,/npm ci --no-audit --no-fund/);
  assert.doesNotMatch(workflow,/Upload installer as workflow artifact/);
  assert.match(workflow,/actions\/upload-artifact@v7/);
});
