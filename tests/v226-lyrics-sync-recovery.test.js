const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const captions = require('../lib/youtube-captions');

const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const auto = fs.readFileSync(path.join(root, 'lib', 'auto-transcribe.js'), 'utf8');
const install = fs.readFileSync(path.join(root, 'INSTALL.bat'), 'utf8');
const youtube = fs.readFileSync(path.join(root, 'lib', 'youtube-captions.js'), 'utf8');
const pkg = require('../package.json');

test('v2.2.6 invalidates the old persistent lyrics cache instead of replaying stale timing', () => {
  assert.ok(/^2\.(?:2\.(?:[6-9]|\d{2,})|3\.0)$/.test(pkg.version));
  assert.match(main, /lyrics-cache-v11\.json/);
  assert.doesNotMatch(main, /lyrics-cache-v9\.json/);
});

test('caption timing has a yt-dlp materialization fallback when direct subtitle CDN fetch fails', () => {
  assert.match(youtube, /materializeCaptionFallback/);
  assert.match(youtube, /--write-auto-subs/);
  assert.match(youtube, /--write-subs/);
  assert.match(youtube, /purpose: 'lyrics-captions'/);
  assert.match(main, /tempRoot: path\.join\(cacheDir, 'lyrics-captions'\)/);
});

test('subtitle language fallback stays narrow and prefers source language plus English/Hindi', () => {
  const langs = captions.subtitleLanguageCandidates({ originalLanguage:'es-MX' }, null);
  assert.match(langs, /es-mx/);
  assert.match(langs, /en/);
  assert.match(langs, /hi/);
  assert.ok(langs.split(',').length <= 10);
});

test('local AI timing prefers scoped core bindings and INSTALL repairs either public entry point', () => {
  assert.ok(auto.indexOf("import('@whisper-cpp-node/core')") < auto.indexOf("import('whisper-cpp-node')"));
  assert.match(install, /@whisper-cpp-node\/core@0\.2\.0/);
  assert.match(install, /Promise\.any/);
});
