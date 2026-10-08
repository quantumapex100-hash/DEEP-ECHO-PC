@echo off
setlocal EnableExtensions EnableDelayedExpansion
title DEEP-ECHO - V38 Zero-Wait Setup
color 0A
cd /d "%~dp0"
if /I "%~1"=="--check-only" goto :check_only

echo ============================================================
echo          DEEP-ECHO - V38 ZERO-WAIT SETUP
echo ============================================================
echo.

where node.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js installed nahi hai ya PATH me nahi mila.
    echo Node.js LTS install karke INSTALL.bat dobara chalao.
    pause
    exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm.cmd nahi mila. Node.js installation repair/reinstall karo.
    pause
    exit /b 1
)

echo [1/4] Node.js check...
node --version

echo.
echo [2/4] npm check...
call npm.cmd --version

echo.
echo [3/4] DEEP-ECHO dependencies FAST check...
call :validate_deps "%CD%\node_modules"
if not errorlevel 1 (
    echo [FAST] Current node_modules complete hai - npm install SKIP.
    goto :deps_ready
)

REM V38: an interrupted npm install can leave a partial local node_modules.
REM Before doing any network work, reuse a complete dependency tree from a
REM neighbouring V36/V37/V38 DeepEcho source folder. A directory junction is
REM effectively instant and avoids re-downloading Electron/ffmpeg packages.
set "REUSED_DEPS="
for /d %%D in ("%~dp0..\DEEP-ECHO*") do (
    if not defined REUSED_DEPS call :try_reuse_deps "%%~fD\node_modules" "%%~nxD"
)
if defined REUSED_DEPS goto :deps_ready

REM Also try a persistent developer dependency location if the user already
REM made one manually / from a previous V38-compatible setup.
if defined LOCALAPPDATA (
    if not defined REUSED_DEPS call :try_reuse_deps "%LOCALAPPDATA%\DEEP-ECHO\dev-deps\node_modules" "DeepEcho dev-deps cache"
)
if defined REUSED_DEPS goto :deps_ready

echo [INFO] Reusable complete dependencies nahi mile.
echo [INFO] npm cache-first install chalega; network sirf missing packages ke liye use hoga.
call npm.cmd install --prefer-offline --no-audit --no-fund --cache "%LOCALAPPDATA%\npm-cache" --progress=false --loglevel=error
if errorlevel 1 (
    echo [ERROR] npm install fail ho gaya.
    pause
    exit /b 1
)
call :validate_deps "%CD%\node_modules"
if errorlevel 1 (
    echo [ERROR] Required Electron runtime dependencies incomplete hain.
    pause
    exit /b 1
)

:deps_ready
REM Local AI lyrics is OPTIONAL. Never block a test build setup trying to
REM repair Whisper over the network. If already present it is used; otherwise
REM provider/caption lyrics continue to work and the feature can be repaired
REM later without delaying startup.
node -e "Promise.any([import('whisper-cpp-node'),import('@whisper-cpp-node/core')]).then(()=>process.exit(0)).catch(()=>process.exit(1))" >nul 2>&1
if errorlevel 1 (
    echo [FAST] Optional local AI bindings missing - default network repair SKIP.
    echo [INFO] Provider/caption/normal synced lyrics remain available.
    if /I "%DEEPECHO_REPAIR_LOCAL_AI%"=="1" call :repair_local_ai
) else (
    echo [OK] Optional local AI transcription bindings ready.
)

echo.
echo [4/4] yt-dlp / YouTube runtime fast reuse check...
call "%~dp0Setup-YtDlp.bat"
if errorlevel 1 (
    echo [ERROR] yt-dlp setup fail hua. Setup incomplete hai.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo             V38 FAST SETUP COMPLETE
echo ============================================================
echo.
choice /C YN /N /M "Ab DEEP-ECHO start karna hai? [Y/N]: "
if errorlevel 2 goto :done

echo.
echo DEEP-ECHO start ho rahi hai...
call npm.cmd start
set "APP_RC=%ERRORLEVEL%"
if not "%APP_RC%"=="0" (
    echo.
    echo [WARN] DEEP-ECHO exit code: %APP_RC%
)

:done
echo.
echo Done.
pause
exit /b 0

:check_only
call :validate_deps "%CD%\node_modules"
if errorlevel 1 (
    echo [ERROR] Required dependencies missing.
    exit /b 1
)
echo [OK] Required Electron dependencies ready. No install or launch performed.
exit /b 0

:validate_deps
if "%~1"=="" exit /b 1
if not exist "%~1\electron\dist\electron.exe" exit /b 1
if not exist "%~1\electron-updater\package.json" exit /b 1
if not exist "%~1\ffmpeg-static\index.js" exit /b 1
if not exist "%~1\.bin\electron.cmd" exit /b 1
exit /b 0

:try_reuse_deps
if "%~1"=="" exit /b 1
call :validate_deps "%~1"
if errorlevel 1 exit /b 1

REM Do not junction a folder to itself.
for %%A in ("%CD%\node_modules") do set "CURRENT_DEPS=%%~fA"
for %%A in ("%~1") do set "CANDIDATE_DEPS=%%~fA"
if /I "!CURRENT_DEPS!"=="!CANDIDATE_DEPS!" exit /b 1

if exist "%CD%\node_modules" (
    set "PARTIAL=node_modules.partial.%RANDOM%%RANDOM%"
    ren "%CD%\node_modules" "!PARTIAL!" >nul 2>&1
    if errorlevel 1 (
        echo [WARN] Partial node_modules ko rename nahi kar paaye; reuse skip.
        exit /b 1
    )
    echo [FAST] Incomplete node_modules ko !PARTIAL! naam se preserve kiya.
)

mklink /J "%CD%\node_modules" "%~1" >nul 2>&1
if errorlevel 1 (
    echo [WARN] Dependency junction create nahi hua; next candidate try hoga.
    exit /b 1
)
call :validate_deps "%CD%\node_modules"
if errorlevel 1 (
    rmdir "%CD%\node_modules" >nul 2>&1
    exit /b 1
)
set "REUSED_DEPS=1"
echo [FAST] Complete dependencies reused from %~2 - npm install SKIP.
exit /b 0

:repair_local_ai
echo [INFO] Optional local AI repair explicitly requested...
call npm.cmd install @whisper-cpp-node/core@0.2.0 --no-save --include=optional --force --prefer-offline --no-audit --no-fund
call npm.cmd install whisper-cpp-node@0.2.12 --save-exact --include=optional --force --prefer-offline --no-audit --no-fund
node -e "Promise.any([import('whisper-cpp-node'),import('@whisper-cpp-node/core')]).then(()=>process.exit(0)).catch(()=>process.exit(1))" >nul 2>&1
if errorlevel 1 (
    echo [WARN] Optional local AI repair unavailable; provider/caption lyrics remain active.
) else (
    echo [OK] Optional local AI transcription bindings repaired.
)
exit /b 0
