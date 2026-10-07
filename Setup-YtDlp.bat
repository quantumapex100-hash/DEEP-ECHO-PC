@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

if not exist "bin" mkdir "bin" >nul 2>&1

set "YTDLP=bin\yt-dlp.exe"
set "DENO=bin\deno.exe"
set "LEGACY_TMP=bin\yt-dlp.exe.tmp"
set "NIGHTLY=https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp.exe"
set "STABLE=https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
set "DENO_URL=https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip"

REM V37 FAST SETUP:
REM 1) Reuse a working local copy first.
REM 2) Reuse persistent DeepEcho cache / installed public app copy next.
REM 3) Node 22+ is a supported YouTube JS runtime, so do NOT download Deno when it is available.
REM 4) Network download is a last-resort fallback only. Normal app maintenance can refresh yt-dlp later.

if defined LOCALAPPDATA (
    set "RUNTIME_CACHE=%LOCALAPPDATA%\DEEP-ECHO\runtime"
) else (
    set "RUNTIME_CACHE=%~dp0.runtime-cache"
)
if not exist "%RUNTIME_CACHE%" mkdir "%RUNTIME_CACHE%" >nul 2>&1

REM Clean stale path created by older broken updater (file OR directory).
if exist "%LEGACY_TMP%\" rmdir /s /q "%LEGACY_TMP%" >nul 2>&1
if exist "%LEGACY_TMP%" del /f /q "%LEGACY_TMP%" >nul 2>&1

if not defined TEMP set "TEMP=%LOCALAPPDATA%\Temp"
if not exist "%TEMP%" mkdir "%TEMP%" >nul 2>&1

REM ------------------------------------------------------------
REM FAST PATH: local copy already exists.
REM ------------------------------------------------------------
call :validate_ytdlp "%YTDLP%"
if not errorlevel 1 (
    echo [OK] Existing local yt-dlp ready hai - download skip.
    call :cache_runtime "%YTDLP%" "yt-dlp.exe"
    call :ensure_js_runtime
    exit /b 0
)

REM ------------------------------------------------------------
REM FAST PATH: persistent cache from any previous DeepEcho source/install.
REM ------------------------------------------------------------
call :reuse_ytdlp "%RUNTIME_CACHE%\yt-dlp.exe" "DeepEcho runtime cache"
if not errorlevel 1 goto :ytdlp_ready

REM ------------------------------------------------------------
REM FAST PATH: reuse a completed runtime from another extracted DeepEcho
REM source folder next to this one (for example the V36 folder the user
REM just cancelled after yt-dlp had already finished downloading).
REM ------------------------------------------------------------
for /d %%D in ("%~dp0..\DEEP-ECHO*") do (
    call :reuse_ytdlp "%%~fD\bin\yt-dlp.exe" "neighbor DeepEcho source"
    if not errorlevel 1 goto :ytdlp_ready
)

REM ------------------------------------------------------------
REM FAST PATH: reuse the already-installed public DEEP-ECHO copy.
REM electron-builder is configured with asar=false, so bin normally lives
REM under resources\app\bin in the installed application.
REM ------------------------------------------------------------
if defined LOCALAPPDATA (
    call :reuse_ytdlp "%LOCALAPPDATA%\Programs\DEEP-ECHO\resources\app\bin\yt-dlp.exe" "installed DEEP-ECHO"
    if not errorlevel 1 goto :ytdlp_ready
    call :reuse_ytdlp "%LOCALAPPDATA%\Programs\deepeccho\resources\app\bin\yt-dlp.exe" "installed DEEP-ECHO"
    if not errorlevel 1 goto :ytdlp_ready
    call :reuse_ytdlp "%LOCALAPPDATA%\Programs\DEEP-ECHO\resources\bin\yt-dlp.exe" "installed DEEP-ECHO"
    if not errorlevel 1 goto :ytdlp_ready
)
if defined ProgramFiles (
    call :reuse_ytdlp "%ProgramFiles%\DEEP-ECHO\resources\app\bin\yt-dlp.exe" "installed DEEP-ECHO"
    if not errorlevel 1 goto :ytdlp_ready
)
if not "%ProgramFiles(x86)%"=="" (
    call :reuse_ytdlp "%ProgramFiles(x86)%\DEEP-ECHO\resources\app\bin\yt-dlp.exe" "installed DEEP-ECHO"
    if not errorlevel 1 goto :ytdlp_ready
)

REM ------------------------------------------------------------
REM FAST PATH: system yt-dlp on PATH.
REM ------------------------------------------------------------
for /f "delims=" %%I in ('where yt-dlp.exe 2^>nul') do (
    call :reuse_ytdlp "%%~fI" "system yt-dlp"
    if not errorlevel 1 goto :ytdlp_ready
)

REM ------------------------------------------------------------
REM LAST RESORT: download yt-dlp only when no reusable copy exists.
REM ------------------------------------------------------------
where curl.exe >nul 2>&1
if errorlevel 1 goto :no_ytdlp

set "YTDLP_DOWNLOAD=%TEMP%\deep-echo-ytdlp-%RANDOM%-%RANDOM%.exe"
if exist "%YTDLP_DOWNLOAD%" del /f /q "%YTDLP_DOWNLOAD%" >nul 2>&1

echo [INFO] Reusable yt-dlp nahi mila. One-time download required...
curl.exe --fail --show-error --location --retry 2 --connect-timeout 15 -o "%YTDLP_DOWNLOAD%" "%NIGHTLY%"
if errorlevel 1 (
    echo [WARN] Nightly download fail hua. Stable build try kar rahe hain...
    if exist "%YTDLP_DOWNLOAD%" del /f /q "%YTDLP_DOWNLOAD%" >nul 2>&1
    curl.exe --fail --show-error --location --retry 2 --connect-timeout 15 -o "%YTDLP_DOWNLOAD%" "%STABLE%"
)
if errorlevel 1 goto :download_failed

call :validate_ytdlp "%YTDLP_DOWNLOAD%"
if errorlevel 1 goto :download_failed
copy /y "%YTDLP_DOWNLOAD%" "%YTDLP%" >nul 2>&1
if errorlevel 1 goto :download_failed
if exist "%YTDLP_DOWNLOAD%" del /f /q "%YTDLP_DOWNLOAD%" >nul 2>&1
call :cache_runtime "%YTDLP%" "yt-dlp.exe"

goto :ytdlp_ready

:ytdlp_ready
call :validate_ytdlp "%YTDLP%"
if errorlevel 1 goto :no_ytdlp
echo [OK] yt-dlp ready:
"%YTDLP%" --version
call :ensure_js_runtime
exit /b 0

:download_failed
if defined YTDLP_DOWNLOAD if exist "%YTDLP_DOWNLOAD%" del /f /q "%YTDLP_DOWNLOAD%" >nul 2>&1
:no_ytdlp
echo [ERROR] Working yt-dlp available nahi hai.
echo Existing DEEP-ECHO 2.6.3 installed ho to usko ek baar open karke phir setup retry karo,
echo ya internet connection ke saath Setup-YtDlp.bat dobara chalao.
exit /b 1

:validate_ytdlp
if "%~1"=="" exit /b 1
if not exist "%~1" exit /b 1
"%~1" --version >nul 2>&1
if errorlevel 1 exit /b 1
exit /b 0

:reuse_ytdlp
if "%~1"=="" exit /b 1
if not exist "%~1" exit /b 1
call :validate_ytdlp "%~1"
if errorlevel 1 exit /b 1
copy /y "%~1" "%YTDLP%" >nul 2>&1
if errorlevel 1 exit /b 1
call :validate_ytdlp "%YTDLP%"
if errorlevel 1 exit /b 1
echo [FAST] yt-dlp reused from %~2 - download skip.
call :cache_runtime "%YTDLP%" "yt-dlp.exe"
exit /b 0

:cache_runtime
if "%~1"=="" exit /b 0
if "%~2"=="" exit /b 0
if not exist "%~1" exit /b 0
if not exist "%RUNTIME_CACHE%" mkdir "%RUNTIME_CACHE%" >nul 2>&1
copy /y "%~1" "%RUNTIME_CACHE%\%~2" >nul 2>&1
exit /b 0

:ensure_js_runtime
REM Prefer private Deno if already present, but never download it when Node 22+
REM is available. lib/ytdlp-smart.js already supports Node 22+ directly.
if exist "%DENO%" (
    "%DENO%" --version >nul 2>&1
    if not errorlevel 1 (
        echo [OK] YouTube JS runtime ready: local Deno
        call :cache_runtime "%DENO%" "deno.exe"
        exit /b 0
    )
)

set "NODE_MAJOR="
where node.exe >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%V in ('node -p "parseInt(process.versions.node.split('.')[0],10)" 2^>nul') do set "NODE_MAJOR=%%V"
)
if defined NODE_MAJOR (
    set /a NODE_MAJOR_NUM=NODE_MAJOR+0 >nul 2>&1
    if !NODE_MAJOR_NUM! GEQ 22 (
        echo [FAST] Node !NODE_MAJOR! supported hai - 40MB Deno download SKIP.
        exit /b 0
    )
)

REM Reuse cached / neighboring / installed Deno before any download.
call :reuse_deno "%RUNTIME_CACHE%\deno.exe" "DeepEcho runtime cache"
if not errorlevel 1 exit /b 0
for /d %%D in ("%~dp0..\DEEP-ECHO*") do (
    call :reuse_deno "%%~fD\bin\deno.exe" "neighbor DeepEcho source"
    if not errorlevel 1 exit /b 0
)
if defined LOCALAPPDATA (
    call :reuse_deno "%LOCALAPPDATA%\Programs\DEEP-ECHO\resources\app\bin\deno.exe" "installed DEEP-ECHO"
    if not errorlevel 1 exit /b 0
    call :reuse_deno "%LOCALAPPDATA%\Programs\deepeccho\resources\app\bin\deno.exe" "installed DEEP-ECHO"
    if not errorlevel 1 exit /b 0
)
for /f "delims=" %%I in ('where deno.exe 2^>nul') do (
    call :reuse_deno "%%~fI" "system Deno"
    if not errorlevel 1 exit /b 0
)

REM Only old-Node PCs without any reusable runtime reach this one-time fallback.
where curl.exe >nul 2>&1
if errorlevel 1 goto :deno_optional_fail
set "DENO_ZIP=%TEMP%\deep-echo-deno-%RANDOM%-%RANDOM%.zip"
set "DENO_DIR=%TEMP%\deep-echo-deno-%RANDOM%-%RANDOM%"
if exist "%DENO_ZIP%" del /f /q "%DENO_ZIP%" >nul 2>&1
if exist "%DENO_DIR%" rmdir /s /q "%DENO_DIR%" >nul 2>&1

echo [INFO] Node 22+ nahi mila; one-time Deno runtime download required...
curl.exe --fail --show-error --location --retry 2 --connect-timeout 15 -o "%DENO_ZIP%" "%DENO_URL%"
if errorlevel 1 goto :deno_optional_fail
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%DENO_ZIP%' -DestinationPath '%DENO_DIR%' -Force" >nul 2>&1
if errorlevel 1 goto :deno_optional_fail
if not exist "%DENO_DIR%\deno.exe" goto :deno_optional_fail
copy /y "%DENO_DIR%\deno.exe" "%DENO%" >nul 2>&1
if errorlevel 1 goto :deno_optional_fail
"%DENO%" --version >nul 2>&1
if errorlevel 1 goto :deno_optional_fail
call :cache_runtime "%DENO%" "deno.exe"
if exist "%DENO_ZIP%" del /f /q "%DENO_ZIP%" >nul 2>&1
if exist "%DENO_DIR%" rmdir /s /q "%DENO_DIR%" >nul 2>&1
echo [OK] YouTube JS runtime ready: Deno
exit /b 0

:reuse_deno
if "%~1"=="" exit /b 1
if not exist "%~1" exit /b 1
"%~1" --version >nul 2>&1
if errorlevel 1 exit /b 1
copy /y "%~1" "%DENO%" >nul 2>&1
if errorlevel 1 exit /b 1
"%DENO%" --version >nul 2>&1
if errorlevel 1 exit /b 1
echo [FAST] Deno reused from %~2 - download skip.
call :cache_runtime "%DENO%" "deno.exe"
exit /b 0

:deno_optional_fail
if defined DENO_ZIP if exist "%DENO_ZIP%" del /f /q "%DENO_ZIP%" >nul 2>&1
if defined DENO_DIR if exist "%DENO_DIR%" rmdir /s /q "%DENO_DIR%" >nul 2>&1
echo [WARN] Deno runtime setup nahi hua. DeepEcho available Node/runtime path try karega.
exit /b 0
