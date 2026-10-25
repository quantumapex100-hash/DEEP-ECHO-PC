const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('official release metadata is exactly 2.6.7 and contains no test-only product label', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  const html = read('src/index.html');
  const polish = read('src/v228-visual-polish.js');
  assert.equal(pkg.version, '2.6.7');
  assert.equal(lock.version, '2.6.7');
  assert.equal(lock.packages[''].version, '2.6.7');
  assert.doesNotMatch(pkg.description, /TEST|preview|do not release/i);
  assert.match(html, /class="v228-test-label">2\.6\.7<\/div>/);
  assert.doesNotMatch(html, /2\.6\.7 V\d+ TEST|do not release/i);
  assert.doesNotMatch(polish, /RELEASE_DISPLAY_LABEL|do not release|V2 TEST/);
});

test('2.6.7 What’s New describes the accepted V43 release line', () => {
  const v200 = read('src/v200.js');
  assert.match(v200, /'2\.6\.7':\[/);
  assert.match(v200, /Red Nebulae is now a complete live theme/);
  assert.match(v200, /Previous-session playback resumes faster/);
  assert.match(v200, /Search and base lyrics initialization is hardened/);
  assert.match(v200, /Lyrics sync\/alignment/);
  assert.match(v200, /Smart Autoplay/);
});

test('one-click release script uses fast local checks and delegates heavy validation to cloud', () => {
  const bat = read('RELEASE-2.6.7.bat');
  assert.match(bat, /Expected package version 2\.6\.7/);
  assert.doesNotMatch(bat, /call npm ci/);
  assert.doesNotMatch(bat, /call npm test/);
  assert.match(bat, /node --check main\.js/);
  assert.match(bat, /Heavy dependency install\/tests intentionally run on GitHub Actions/);
  const helper=read('scripts/release-windows.ps1');
  assert.match(helper, /refs\/tags\/\$tag/);
  assert.match(helper, /@\('push','origin',\$tag\)/);
  assert.match(helper, /fetch --depth 1 --no-tags/);
  assert.match(helper, /http\.version=HTTP\/1\.1/);
  assert.doesNotMatch(helper, /--force|reset --hard/);
});

test('cloud workflow builds 2.6.7 and verifies updater-critical assets', () => {
  const workflow = read('.github/workflows/release-windows.yml');
  assert.match(workflow, /packageVersion -ne '2\.6\.7'/);
  assert.match(workflow, /npm ci --no-audit --no-fund/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run release/);
  assert.match(workflow, /RELEASE-NOTES-2\.6\.7\.md/);
  assert.ok(fs.existsSync(path.join(root, 'RELEASE-NOTES-2.6.7.md')));
  assert.match(workflow, /releases\/latest/);
  assert.match(workflow, /DEEP-ECHO-\$packageVersion-Setup\.exe/);
  assert.match(workflow, /DEEP-ECHO-\$packageVersion-Setup\.exe\.blockmap/);
  assert.match(workflow, /latest\.yml/);
  assert.doesNotMatch(workflow, /isLatest/);
});
