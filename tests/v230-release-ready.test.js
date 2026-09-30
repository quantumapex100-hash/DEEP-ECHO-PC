const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('official release metadata is exactly 2.3.0 and contains no test-only product label', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  const html = read('src/index.html');
  const polish = read('src/v228-visual-polish.js');
  assert.equal(pkg.version, '2.3.0');
  assert.equal(lock.version, '2.3.0');
  assert.equal(lock.packages[''].version, '2.3.0');
  assert.doesNotMatch(pkg.description, /TEST|preview|do not release/i);
  assert.match(html, /class="v228-test-label">2\.3\.0<\/div>/);
  assert.doesNotMatch(html, /2\.3\.0 V\d+ TEST|do not release/i);
  assert.doesNotMatch(polish, /RELEASE_DISPLAY_LABEL|do not release|V2 TEST/);
});

test('2.3.0 What’s New describes the shipped lyrics and mini-player work', () => {
  const v200 = read('src/v200.js');
  assert.match(v200, /'2\.3\.0':\[/);
  assert.match(v200, /Floating Immersive Lyrics/);
  assert.match(v200, /Mini Player gains optional synced lyrics/);
  assert.match(v200, /Settings and stay synchronized/);
});

test('one-click release script protects v2.3.0 tag creation behind local tests', () => {
  const bat = read('RELEASE-2.3.0.bat');
  assert.match(bat, /Expected package version 2\.3\.0/);
  assert.match(bat, /npm ci --no-audit --no-fund/);
  assert.match(bat, /npm test/);
  assert.ok(bat.indexOf('npm test') < bat.indexOf('git tag -a'));
  assert.match(bat, /refs\/tags\/%TAG%/);
  assert.match(bat, /git push origin "%TAG%"/);
});

test('cloud workflow builds 2.3.0 and verifies updater-critical assets', () => {
  const workflow = read('.github/workflows/release-windows.yml');
  assert.match(workflow, /packageVersion -ne '2\.3\.0'/);
  assert.match(workflow, /npm ci --no-audit --no-fund/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run release/);
  assert.match(workflow, /RELEASE-NOTES-2\.3\.0\.md/);
  assert.match(workflow, /releases\/latest/);
  assert.match(workflow, /DEEP-ECHO-\$packageVersion-Setup\.exe/);
  assert.match(workflow, /DEEP-ECHO-\$packageVersion-Setup\.exe\.blockmap/);
  assert.match(workflow, /latest\.yml/);
  assert.doesNotMatch(workflow, /isLatest/);
});
