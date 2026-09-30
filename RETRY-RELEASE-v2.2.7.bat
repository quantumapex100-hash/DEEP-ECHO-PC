@echo off
setlocal EnableExtensions EnableDelayedExpansion
title DEEP-ECHO v2.2.7 - Retry Failed Cloud Release
color 0A
cd /d "%~dp0"

set "VERSION=2.2.7"
set "TAG=v2.2.7"
set "SOURCE_REPO=https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git"
set "PUBLIC_RELEASE_API=https://api.github.com/repos/windowsdaiyu-cyber/DEEP-ECHO-Releases/releases/tags/v2.2.7"
set "WORK_DIR=%TEMP%\DEEP-ECHO-release-retry-2.2.7"
set "SOURCE_DIR=%CD%"

echo ============================================================
echo       DEEP-ECHO v2.2.7 - FAILED RELEASE RETRY
echo ============================================================
echo.
echo Previous v2.2.7 workflow failed before publishing.
echo This retry fixes the visualizer recovery regression-test path,
echo pushes the corrected source, then moves the UNPUBLISHED v2.2.7
echo tag to the corrected commit and triggers GitHub Actions again.
echo.

where git.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git for Windows installed nahi hai.
  pause
  exit /b 1
)
where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js installed nahi hai.
  pause
  exit /b 1
)
if not exist "package.json" (
  echo [ERROR] Is BAT ko fixed v2.2.7 source folder ke andar chalao.
  pause
  exit /b 1
)
for /f "usebackq delims=" %%V in (`node -p "require('./package.json').version"`) do set "APP_VERSION=%%V"
if not "%APP_VERSION%"=="%VERSION%" (
  echo [ERROR] package.json version %APP_VERSION% hai; expected %VERSION%.
  pause
  exit /b 1
)

echo [0/7] Safety check: public v2.2.7 release already exist to nahi karti...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; try { $r=Invoke-RestMethod -Uri '%PUBLIC_RELEASE_API%' -Headers @{'User-Agent'='DEEP-ECHO-Release-Retry'}; if ($r -and -not $r.draft) { Write-Host '[ERROR] Public v2.2.7 release already exists. Same tag ko move mat karo.' -ForegroundColor Red; exit 42 } } catch { if ($_.Exception.Response.StatusCode.value__ -eq 404) { exit 0 } else { Write-Host '[WARN] Public release safety check unavailable. Retry after internet stable ho.' -ForegroundColor Yellow; exit 41 } }"
if errorlevel 42 (
  pause
  exit /b 1
)
if errorlevel 41 (
  pause
  exit /b 1
)

echo.
echo [1/7] Fresh dependencies...
call npm.cmd ci --no-audit --no-fund
if errorlevel 1 (
  echo [ERROR] npm ci fail hua. Release retry stop.
  pause
  exit /b 1
)

echo.
echo [2/7] Full automated tests...
call npm.cmd test
if errorlevel 1 (
  echo [ERROR] Tests fail hue. GitHub par kuch push nahi kiya gaya.
  pause
  exit /b 1
)

echo.
echo [3/7] Private source repo clone...
if exist "%WORK_DIR%" rmdir /s /q "%WORK_DIR%"
git clone --branch main --single-branch "%SOURCE_REPO%" "%WORK_DIR%"
if errorlevel 1 (
  echo [ERROR] GitHub clone fail hua. Browser/Git Credential Manager authorization check karo.
  pause
  exit /b 1
)

echo.
echo [4/7] Corrected tested source sync...
pushd "%WORK_DIR%"
git rm -r -q --ignore-unmatch .
popd
robocopy "%SOURCE_DIR%" "%WORK_DIR%" /E /R:2 /W:1 ^
  /XD ".git" "node_modules" "dist" ".cache" "cache" ^
  /XF "*.log" "RETRY-RELEASE-v2.2.7.bat" >nul
if errorlevel 8 (
  echo [ERROR] Source copy fail hua.
  pause
  exit /b 1
)

pushd "%WORK_DIR%"
git config user.name >nul 2>&1
if errorlevel 1 git config user.name "windowsdaiyu-cyber"
git config user.email >nul 2>&1
if errorlevel 1 git config user.email "windowsdaiyu-cyber@users.noreply.github.com"
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Fix v2.2.7 release visualizer recovery regression"
  if errorlevel 1 (
    echo [ERROR] Commit fail hua.
    popd
    pause
    exit /b 1
  )
) else (
  echo [OK] main already has corrected source.
)

echo.
echo [5/7] Push corrected main...
git push origin main
if errorlevel 1 (
  echo [ERROR] main push fail hua.
  popd
  pause
  exit /b 1
)

echo.
echo [6/7] Move UNPUBLISHED v2.2.7 tag to corrected commit...
git fetch --tags --force origin
git tag -f -a "%TAG%" -m "DEEP-ECHO %VERSION%"
git push --force origin "refs/tags/%TAG%"
if errorlevel 1 (
  echo [ERROR] v2.2.7 tag update fail hua.
  popd
  pause
  exit /b 1
)

popd

echo.
echo [7/7] DONE - corrected v2.2.7 workflow triggered.
echo ============================================================
echo   SUCCESS: v2.2.7 RELEASE RETRY TRIGGERED
echo ============================================================
echo.
echo Actions me naya Release v2.2.7 run aayega.
echo Green hone ke baad DEEP-ECHO-Releases me verify karo:
echo   DEEP-ECHO-2.2.7-Setup.exe
echo   DEEP-ECHO-2.2.7-Setup.exe.blockmap
echo   latest.yml
echo.
start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions"
start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO-Releases/releases"
pause
exit /b 0
