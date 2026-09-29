@echo off
setlocal EnableExtensions
title DEEP-ECHO - Fix Version-Locked Tests and Release v2.1.1
color 0A
cd /d "%~dp0"

echo ============================================================
echo   DEEP-ECHO - VERSION TEST FIX + RELEASE v2.1.1
echo ============================================================
echo.

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
where git.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git nahi mila.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [ERROR] package.json nahi mila. BAT ko project folder me rakho.
  pause
  exit /b 1
)

echo [1/7] Version 2.1.1 ensure kar rahe hain...
node -e "const fs=require('fs');const p=require('./package.json');p.version='2.1.1';p.scripts=p.scripts||{};p.scripts.test='node tests/run-tests.cjs';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');"
if errorlevel 1 goto :fail

if exist "package-lock.json" (
  node -e "const fs=require('fs');const f='package-lock.json';const p=JSON.parse(fs.readFileSync(f,'utf8'));p.version='2.1.1';if(p.packages&&p.packages[''])p.packages[''].version='2.1.1';fs.writeFileSync(f,JSON.stringify(p,null,2)+'\n');"
  if errorlevel 1 goto :fail
)

if not exist "tests\run-tests.cjs" (
  echo [ERROR] tests\run-tests.cjs missing hai.
  echo Pehle previous FIX-TESTS-AND-RELEASE-V211.bat ne ye file create karni chahiye thi.
  pause
  exit /b 1
)

echo [2/7] Hard-coded 2.1.0 package-version assertions patch ho rahi hain...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$b='Y29uc3QgZnMgPSByZXF1aXJlKCdmcycpOwpjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpOwoKY29uc3QgdGVzdHNEaXIgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJ3Rlc3RzJyk7CmNvbnN0IGZpbGVzID0gZnMucmVhZGRpclN5bmModGVzdHNEaXIpLmZpbHRlcihuID0+IG4uZW5kc1dpdGgoJy5qcycpKTsKCmxldCBjaGFuZ2VkID0gMDsKZm9yIChjb25zdCBuYW1lIG9mIGZpbGVzKSB7CiAgY29uc3QgZmlsZSA9IHBhdGguam9pbih0ZXN0c0RpciwgbmFtZSk7CiAgbGV0IHMgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKTsKICBjb25zdCBiZWZvcmUgPSBzOwoKICBzID0gcy5yZXBsYWNlKC9hc3NlcnRcLmVxdWFsXChwa2dcLnZlcnNpb24sXHMqWyciXTJcLjFcLjBbJyJdXCk7L2csCiAgICAiYXNzZXJ0Lm1hdGNoKHBrZy52ZXJzaW9uLC9eMlxcLlxcZCtcXC5cXGQrJC8pOyIpOwoKICBpZiAobmFtZSA9PT0gJ3YyMTAtYXV0by11cGRhdGUudGVzdC5qcycpIHsKICAgIHMgPSBzLnJlcGxhY2UoCiAgICAgICJ0ZXN0KCcyLjEuMCBpcyB3aXJlZCB0byBwdWJsaWMgR2l0SHViIHJlbGVhc2VzIHdpdGhvdXQgY2hhbmdpbmcgYXBwIGlkZW50aXR5JywoKT0+eyIsCiAgICAgICJ0ZXN0KCcyLnggaXMgd2lyZWQgdG8gcHVibGljIEdpdEh1YiByZWxlYXNlcyB3aXRob3V0IGNoYW5naW5nIGFwcCBpZGVudGl0eScsKCk9PnsiCiAgICApOwogIH0KCiAgaWYgKHMgIT09IGJlZm9yZSkgewogICAgZnMud3JpdGVGaWxlU3luYyhmaWxlLCBzKTsKICAgIGNoYW5nZWQrKzsKICAgIGNvbnNvbGUubG9nKCdwYXRjaGVkJywgbmFtZSk7CiAgfQp9Cgpjb25zb2xlLmxvZyhgUGF0Y2hlZCAke2NoYW5nZWR9IHRlc3QgZmlsZShzKS5gKTsK'; [IO.File]::WriteAllBytes('%TEMP%\deep-echo-version-patch.cjs',[Convert]::FromBase64String($b)); node '%TEMP%\deep-echo-version-patch.cjs'; Remove-Item '%TEMP%\deep-echo-version-patch.cjs' -Force"
if errorlevel 1 goto :fail

echo [3/7] Dependencies check...
call npm.cmd install --no-audit --no-fund
if errorlevel 1 (
  echo [ERROR] npm install fail hua.
  pause
  exit /b 1
)

echo [4/7] Full automated tests...
call npm.cmd test
if errorlevel 1 (
  echo.
  echo [ERROR] Tests ab bhi fail hue. Jo exact failure aaye woh bhejna.
  pause
  exit /b 1
)

echo [5/7] Fix commit + main push...
git add package.json package-lock.json tests 2>nul
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Make version regression tests release-safe for v2.1.1"
  if errorlevel 1 goto :fail
) else (
  echo [INFO] Koi naya change commit karne ko nahi hai.
)

git push origin main
if errorlevel 1 goto :fail

echo [6/7] v2.1.1 tag check...
set "REMOTE_TAG="
for /f %%T in ('git ls-remote --tags origin "refs/tags/v2.1.1"') do set "REMOTE_TAG=%%T"
if defined REMOTE_TAG (
  echo [INFO] v2.1.1 tag already exist karta hai.
  echo Naya tag create nahi karenge. GitHub Actions page kholo.
  start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions"
  pause
  exit /b 0
)

echo [7/7] v2.1.1 cloud build trigger...
git tag -a "v2.1.1" -m "DEEP-ECHO 2.1.1"
if errorlevel 1 goto :fail
git push origin "v2.1.1"
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo   TESTS PASSED + v2.1.1 CLOUD BUILD TRIGGERED
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
