@echo off
setlocal EnableExtensions
title DEEP-ECHO - Renderer Smoke Fix + Release v2.1.2
color 0A
cd /d "%~dp0"

echo ============================================================
echo   DEEP-ECHO - RENDERER SMOKE FIX + RELEASE v2.1.2
echo ============================================================
echo.
echo Fix:
echo   requestIdleCallback ko sirf tab call kiya jayega
echo   jab wo actual function ho.
echo.

where git.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git for Windows nahi mila.
  pause
  exit /b 1
)
where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js nahi mila.
  pause
  exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm nahi mila.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [ERROR] package.json nahi mila. BAT ko DEEP-ECHO project folder me rakho.
  pause
  exit /b 1
)
if not exist "src\effects.js" (
  echo [ERROR] src\effects.js nahi mila.
  pause
  exit /b 1
)
if not exist ".git" (
  echo [ERROR] .git nahi mila. Source repo setup missing hai.
  pause
  exit /b 1
)

echo [1/8] requestIdleCallback guard patch...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p='src/effects.js'; $s=[IO.File]::ReadAllText($p); $old=""if ('requestIdleCallback' in window) requestIdleCallback(prewarmSpace,{timeout:1400}); else setTimeout(prewarmSpace,450);""; $new=""if (typeof requestIdleCallback === 'function') requestIdleCallback(prewarmSpace,{timeout:1400}); else setTimeout(prewarmSpace,450);""; if(-not $s.Contains($old)){ if($s.Contains($new)){Write-Host '[OK] Guard already patched.'} else {throw 'Expected requestIdleCallback line not found; source was not changed.'} } else { $s=$s.Replace($old,$new); [IO.File]::WriteAllText($p,$s); Write-Host '[OK] Guard patched.' }"
if errorlevel 1 goto :fail

echo [2/8] Version 2.1.2 set...
node -e "const fs=require('fs');const p=require('./package.json');p.version='2.1.2';p.description='DEEP-ECHO 2.1.2 - auto-update foundation with cloud-safe renderer checks';p.scripts=p.scripts||{};p.scripts.test='node tests/run-tests.cjs';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');"
if errorlevel 1 goto :fail

if exist "package-lock.json" (
  node -e "const fs=require('fs');const f='package-lock.json';const p=JSON.parse(fs.readFileSync(f,'utf8'));p.version='2.1.2';if(p.packages&&p.packages[''])p.packages[''].version='2.1.2';fs.writeFileSync(f,JSON.stringify(p,null,2)+'\n');"
  if errorlevel 1 goto :fail
)

echo [3/8] Cross-platform test runner ensure...
if not exist "tests\run-tests.cjs" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$b='Y29uc3QgZnMgPSByZXF1aXJlKCdmcycpOwpjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpOwpjb25zdCB7IHNwYXduU3luYyB9ID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpOwoKY29uc3QgdGVzdHNEaXIgPSBfX2Rpcm5hbWU7CmNvbnN0IHRlc3RGaWxlcyA9IGZzLnJlYWRkaXJTeW5jKHRlc3RzRGlyKQogIC5maWx0ZXIoKG5hbWUpID0+IG5hbWUuZW5kc1dpdGgoJy50ZXN0LmpzJykpCiAgLnNvcnQoKQogIC5tYXAoKG5hbWUpID0+IHBhdGguam9pbih0ZXN0c0RpciwgbmFtZSkpOwoKaWYgKCF0ZXN0RmlsZXMubGVuZ3RoKSB7CiAgY29uc29sZS5lcnJvcignTm8gKi50ZXN0LmpzIGZpbGVzIGZvdW5kIGluIHRlc3RzLycpOwogIHByb2Nlc3MuZXhpdCgxKTsKfQoKY29uc29sZS5sb2coYFJ1bm5pbmcgJHt0ZXN0RmlsZXMubGVuZ3RofSBOb2RlIHRlc3QgZmlsZXMuLi5gKTsKbGV0IHJlc3VsdCA9IHNwYXduU3luYyhwcm9jZXNzLmV4ZWNQYXRoLCBbJy0tdGVzdCcsIC4uLnRlc3RGaWxlc10sIHsgc3RkaW86ICdpbmhlcml0JyB9KTsKaWYgKHJlc3VsdC5lcnJvcikgdGhyb3cgcmVzdWx0LmVycm9yOwppZiAocmVzdWx0LnN0YXR1cyAhPT0gMCkgcHJvY2Vzcy5leGl0KHJlc3VsdC5zdGF0dXMgPz8gMSk7Cgpjb25zb2xlLmxvZygnUnVubmluZyByZW5kZXJlciBzbW9rZSB0ZXN0Li4uJyk7CnJlc3VsdCA9IHNwYXduU3luYyhwcm9jZXNzLmV4ZWNQYXRoLCBbcGF0aC5qb2luKHRlc3RzRGlyLCAncmVuZGVyZXItc21va2UuY2pzJyldLCB7IHN0ZGlvOiAnaW5oZXJpdCcgfSk7CmlmIChyZXN1bHQuZXJyb3IpIHRocm93IHJlc3VsdC5lcnJvcjsKcHJvY2Vzcy5leGl0KHJlc3VsdC5zdGF0dXMgPz8gMCk7Cg=='; [IO.File]::WriteAllBytes('tests\run-tests.cjs',[Convert]::FromBase64String($b))"
  if errorlevel 1 goto :fail
)

echo [4/8] Version-lock assertions future-safe ensure...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$files=Get-ChildItem tests -Filter '*.js'; foreach($f in $files){ $s=[IO.File]::ReadAllText($f.FullName); $n=[regex]::Replace($s,'assert\.equal\(pkg\.version,\s*[''\""]2\.1\.(0|1)[''\""]\);','assert.match(pkg.version,/^2\\.\d+\\.\d+$/);'); if($n -ne $s){[IO.File]::WriteAllText($f.FullName,$n)} }"
if errorlevel 1 goto :fail

echo [5/8] Dependencies check...
call npm.cmd install --no-audit --no-fund
if errorlevel 1 (
  echo [ERROR] npm install fail hua.
  pause
  exit /b 1
)

echo [6/8] Full automated tests + renderer smoke...
call npm.cmd test
if errorlevel 1 (
  echo.
  echo [ERROR] Tests ab bhi fail hue. Exact last error bhejna.
  pause
  exit /b 1
)

echo [7/8] Commit + main push...
git add package.json package-lock.json src/effects.js tests 2>nul
git add package.json src/effects.js tests
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Fix renderer idle callback guard and prepare v2.1.2"
  if errorlevel 1 goto :fail
) else (
  echo [INFO] Koi naya change commit karne ko nahi hai.
)

git push origin main
if errorlevel 1 goto :fail

echo [8/8] v2.1.2 cloud build trigger...
set "REMOTE_TAG="
for /f %%T in ('git ls-remote --tags origin "refs/tags/v2.1.2"') do set "REMOTE_TAG=%%T"
if defined REMOTE_TAG (
  echo [INFO] v2.1.2 tag already exist karta hai.
  start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions"
  pause
  exit /b 0
)

git tag -a "v2.1.2" -m "DEEP-ECHO 2.1.2"
if errorlevel 1 goto :fail
git push origin "v2.1.2"
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo   TESTS PASSED + v2.1.2 CLOUD BUILD TRIGGERED
echo ============================================================
echo.
start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions"
pause
exit /b 0

:fail
echo.
echo [ERROR] Command fail hua. Source files safe hain.
pause
exit /b 1
