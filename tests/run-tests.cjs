const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const testsDir = __dirname;
const testFiles = fs.readdirSync(testsDir).filter(name => name.endsWith('.test.js')).sort().map(name => path.join(testsDir, name));
if (!testFiles.length) { console.error('No *.test.js files found in tests/'); process.exit(1); }
console.log(`Running ${testFiles.length} Node test files...`);
let result = spawnSync(process.execPath, ['--test', ...testFiles], { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('Running renderer smoke test...');
result = spawnSync(process.execPath, [path.join(testsDir, 'renderer-smoke.cjs')], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 0);
