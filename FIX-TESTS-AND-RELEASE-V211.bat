@echo off
setlocal EnableExtensions
title DEEP-ECHO - Fix Tests and Release v2.1.1
color 0A
cd /d "%~dp0"

echo ============================================================
echo      DEEP-ECHO - TEST FIX + CLOUD RELEASE v2.1.1
echo ============================================================
echo.
echo Ye script Windows/GitHub test glob bug fix karegi aur v2.1.1 release karegi.
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
  echo [ERROR] package.json nahi mila. Is BAT ko DEEP-ECHO project folder ke andar rakho.
  pause
  exit /b 1
)

if not exist ".git" (
  echo [ERROR] .git nahi mila. Pehle source push setup complete hona chahiye.
  pause
  exit /b 1
)

echo [1/7] Cross-platform test runner create ho raha hai...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$b='Y29uc3QgZnMgPSByZXF1aXJlKCdmcycpOwpjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpOwpjb25zdCB7IHNwYXduU3luYyB9ID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpOwoKY29uc3QgdGVzdHNEaXIgPSBfX2Rpcm5hbWU7CmNvbnN0IHRlc3RGaWxlcyA9IGZzLnJlYWRkaXJTeW5jKHRlc3RzRGlyKQogIC5maWx0ZXIoKG5hbWUpID0+IG5hbWUuZW5kc1dpdGgoJy50ZXN0LmpzJykpCiAgLnNvcnQoKQogIC5tYXAoKG5hbWUpID0+IHBhdGguam9pbih0ZXN0c0RpciwgbmFtZSkpOwoKaWYgKCF0ZXN0RmlsZXMubGVuZ3RoKSB7CiAgY29uc29sZS5lcnJvcignTm8gKi50ZXN0LmpzIGZpbGVzIGZvdW5kIGluIHRlc3RzLycpOwogIHByb2Nlc3MuZXhpdCgxKTsKfQoKY29uc29sZS5sb2coYFJ1bm5pbmcgJHt0ZXN0RmlsZXMubGVuZ3RofSBOb2RlIHRlc3QgZmlsZXMuLi5gKTsKbGV0IHJlc3VsdCA9IHNwYXduU3luYyhwcm9jZXNzLmV4ZWNQYXRoLCBbJy0tdGVzdCcsIC4uLnRlc3RGaWxlc10sIHsKICBzdGRpbzogJ2luaGVyaXQnCn0pOwppZiAocmVzdWx0LmVycm9yKSB0aHJvdyByZXN1bHQuZXJyb3I7CmlmIChyZXN1bHQuc3RhdHVzICE9PSAwKSBwcm9jZXNzLmV4aXQocmVzdWx0LnN0YXR1cyA/PyAxKTsKCmNvbnNvbGUubG9nKCdSdW5uaW5nIHJlbmRlcmVyIHNtb2tlIHRlc3QuLi4nKTsKcmVzdWx0ID0gc3Bhd25TeW5jKHByb2Nlc3MuZXhlY1BhdGgsIFtwYXRoLmpvaW4odGVzdHNEaXIsICdyZW5kZXJlci1zbW9rZS5janMnKV0sIHsKICBzdGRpbzogJ2luaGVyaXQnCn0pOwppZiAocmVzdWx0LmVycm9yKSB0aHJvdyByZXN1bHQuZXJyb3I7CnByb2Nlc3MuZXhpdChyZXN1bHQuc3RhdHVzID8/IDApOwo='; [IO.File]::WriteAllBytes('tests\run-tests.cjs',[Convert]::FromBase64String($b))"
if errorlevel 1 goto :fail

echo [2/7] package.json ko v2.1.1 + safe test command par patch kar rahe hain...
node -e "const fs=require('fs');const p=require('./package.json');p.version='2.1.1';p.description='DEEP-ECHO 2.1.1 - auto-update foundation with Windows-safe cloud tests';p.scripts=p.scripts||{};p.scripts.test='node tests/run-tests.cjs';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');"
if errorlevel 1 goto :fail

if exist "package-lock.json" (
  node -e "const fs=require('fs');const f='package-lock.json';const p=JSON.parse(fs.readFileSync(f,'utf8'));p.version='2.1.1';if(p.packages&&p.packages[''])p.packages[''].version='2.1.1';fs.writeFileSync(f,JSON.stringify(p,null,2)+'\n');"
  if errorlevel 1 goto :fail
)

echo [3/7] Dependencies check/install...
call npm.cmd install --no-audit --no-fund
if errorlevel 1 (
  echo [ERROR] npm install fail hua.
  pause
  exit /b 1
)

echo [4/7] Automated tests...
call npm.cmd test
if errorlevel 1 (
  echo [ERROR] Tests ab bhi fail hue. Release stop kar di gayi.
  pause
  exit /b 1
)

echo [5/7] Fix commit + main push...
git add package.json package-lock.json tests/run-tests.cjs 2>nul
git add package.json tests/run-tests.cjs
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Fix Windows test discovery and prepare v2.1.1"
  if errorlevel 1 goto :fail
) else (
  echo [INFO] Fix already committed.
)

git push origin main
if errorlevel 1 goto :fail

echo [6/7] Checking v2.1.1 tag...
set "REMOTE_TAG="
for /f %%T in ('git ls-remote --tags origin "refs/tags/v2.1.1"') do set "REMOTE_TAG=%%T"
if defined REMOTE_TAG (
  echo [ERROR] v2.1.1 tag already exists. Script dobara mat chalao.
  echo GitHub Actions page check karo.
  start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions"
  pause
  exit /b 1
)

git tag -a "v2.1.1" -m "DEEP-ECHO 2.1.1"
if errorlevel 1 goto :fail

echo [7/7] v2.1.1 cloud build trigger...
git push origin "v2.1.1"
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo   FIX PUSHED + CLOUD BUILD TRIGGERED SUCCESSFULLY
echo   Version: v2.1.1
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
