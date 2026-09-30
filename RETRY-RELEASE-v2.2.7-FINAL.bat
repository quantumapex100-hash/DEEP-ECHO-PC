@echo off
setlocal EnableExtensions EnableDelayedExpansion
title DEEP-ECHO v2.2.7 - FINAL SAFE RELEASE RETRY
color 0A
cd /d "%~dp0"

set "VERSION=2.2.7"
set "TAG=v2.2.7"
set "SOURCE_REPO=https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git"
set "PUBLIC_RELEASE_API=https://api.github.com/repos/windowsdaiyu-cyber/DEEP-ECHO-Releases/releases/tags/v2.2.7"
set "WORK_DIR=%TEMP%\DEEP-ECHO-release-retry-final-2.2.7"
set "SOURCE_DIR=%CD%"

echo ============================================================
echo   DEEP-ECHO v2.2.7 - FINAL SAFE RELEASE RETRY
echo ============================================================
echo.
echo Fix included:
echo   - Windows CRLF/LF-safe v2.2.7 visualizer regression test
echo   - .gitattributes enforces LF for repository source
echo   - git add --renormalize prevents future line-ending mismatch
echo.

where git.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git for Windows missing.
  pause
  exit /b 1
)
where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js missing.
  pause
  exit /b 1
)
if not exist "package.json" (
  echo [ERROR] BAT ko isi extracted v2.2.7 folder ke andar chalao.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%V in (`node -p "require('./package.json').version"`) do set "APP_VERSION=%%V"
if not "%APP_VERSION%"=="%VERSION%" (
  echo [ERROR] package.json version %APP_VERSION% hai; expected %VERSION%.
  pause
  exit /b 1
)

echo [0/8] Public release safety check...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; try { $r=Invoke-RestMethod -Uri '%PUBLIC_RELEASE_API%' -Headers @{'User-Agent'='DEEP-ECHO-Release-Retry'}; if ($r -and -not $r.draft) { Write-Host '[ERROR] Public v2.2.7 already exists; same tag ko move nahi karenge.' -ForegroundColor Red; exit 42 } } catch { if ($_.Exception.Response.StatusCode.value__ -eq 404) { exit 0 } else { Write-Host '[ERROR] Release safety check failed. Internet check karke retry karo.' -ForegroundColor Red; exit 41 } }"
if errorlevel 42 (
  pause
  exit /b 1
)
if errorlevel 41 (
  pause
  exit /b 1
)

echo.
echo [1/8] Fresh dependencies...
call npm.cmd ci --no-audit --no-fund
if errorlevel 1 (
  echo [ERROR] npm ci failed. Nothing pushed.
  pause
  exit /b 1
)

echo.
echo [2/8] Full local test suite...
call npm.cmd test
if errorlevel 1 (
  echo [ERROR] Local tests failed. Nothing pushed.
  pause
  exit /b 1
)

echo.
echo [3/8] Extra Windows line-ending regression test...
node --test tests\v227-ui-audio-regression.test.js
if errorlevel 1 (
  echo [ERROR] v2.2.7 UI/audio regression test failed. Nothing pushed.
  pause
  exit /b 1
)

echo.
echo [4/8] Fresh source repo clone...
if exist "%WORK_DIR%" rmdir /s /q "%WORK_DIR%"
git clone --branch main --single-branch "%SOURCE_REPO%" "%WORK_DIR%"
if errorlevel 1 (
  echo [ERROR] GitHub source clone failed.
  pause
  exit /b 1
)

echo.
echo [5/8] Sync tested source...
pushd "%WORK_DIR%"
git rm -r -q --ignore-unmatch .
popd

robocopy "%SOURCE_DIR%" "%WORK_DIR%" /E /R:2 /W:1 ^
  /XD ".git" "node_modules" "dist" ".cache" "cache" ^
  /XF "*.log" "RETRY-RELEASE-v2.2.7-FINAL.bat" >nul
if errorlevel 8 (
  echo [ERROR] Source copy failed.
  pause
  exit /b 1
)

pushd "%WORK_DIR%"
git config user.name >nul 2>&1
if errorlevel 1 git config user.name "windowsdaiyu-cyber"
git config user.email >nul 2>&1
if errorlevel 1 git config user.email "windowsdaiyu-cyber@users.noreply.github.com"

echo.
echo [6/8] Normalize repository line endings + commit...
git add -A
git add --renormalize .
git add -A

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Fix v2.2.7 Windows CI line-ending regression"
  if errorlevel 1 (
    echo [ERROR] Commit failed.
    popd
    pause
    exit /b 1
  )
) else (
  echo [OK] Source already matches corrected v2.2.7.
)

echo.
echo [7/8] Push corrected main...
git push origin main
if errorlevel 1 (
  echo [ERROR] main push failed.
  popd
  pause
  exit /b 1
)

echo.
echo [8/8] Move UNPUBLISHED v2.2.7 tag to corrected commit...
git fetch --tags --force origin
git tag -f -a "%TAG%" -m "DEEP-ECHO %VERSION%"
git push --force origin "refs/tags/%TAG%"
if errorlevel 1 (
  echo [ERROR] tag push failed.
  popd
  pause
  exit /b 1
)

popd

echo.
echo ============================================================
echo   SUCCESS: v2.2.7 FINAL RELEASE RETRY TRIGGERED
echo ============================================================
echo.
echo Ab GitHub Actions me naya Release v2.2.7 run aayega.
echo Green hone par public release assets hone chahiye:
echo   DEEP-ECHO-2.2.7-Setup.exe
echo   DEEP-ECHO-2.2.7-Setup.exe.blockmap
echo   latest.yml
echo.
start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions"
start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO-Releases/releases"
pause
exit /b 0
