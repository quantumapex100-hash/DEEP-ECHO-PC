@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if not exist "bin" mkdir "bin" >nul 2>&1

set "YTDLP=bin\yt-dlp.exe"
set "LEGACY_TMP=bin\yt-dlp.exe.tmp"
set "NIGHTLY=https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp.exe"
set "STABLE=https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"

REM IMPORTANT: Never overwrite Windows TEMP/TMP variables here.
REM Older v2.0.0 overwrote the Windows TMP environment variable with a download-file path.
REM That broke PyInstaller/NSIS temporary-file creation during Build-Karo.bat.

REM Clean the stale path created by the older broken updater (file OR directory).
if exist "%LEGACY_TMP%\" rmdir /s /q "%LEGACY_TMP%" >nul 2>&1
if exist "%LEGACY_TMP%" del /f /q "%LEGACY_TMP%" >nul 2>&1

if not defined TEMP set "TEMP=%LOCALAPPDATA%\Temp"
if not exist "%TEMP%" mkdir "%TEMP%" >nul 2>&1
set "YTDLP_DOWNLOAD=%TEMP%\deep-echo-ytdlp-%RANDOM%-%RANDOM%.exe"

if exist "%YTDLP_DOWNLOAD%" del /f /q "%YTDLP_DOWNLOAD%" >nul 2>&1

where curl.exe >nul 2>&1
if errorlevel 1 goto :curl_missing

echo DEEP-ECHO YouTube engine refresh ho raha hai...
curl.exe --fail --show-error --location --retry 2 --connect-timeout 15 -o "%YTDLP_DOWNLOAD%" "%NIGHTLY%"
if errorlevel 1 (
    echo [WARN] Nightly download fail hua. Stable build try kar rahe hain...
    if exist "%YTDLP_DOWNLOAD%" del /f /q "%YTDLP_DOWNLOAD%" >nul 2>&1
    curl.exe --fail --show-error --location --retry 2 --connect-timeout 15 -o "%YTDLP_DOWNLOAD%" "%STABLE%"
)

if errorlevel 1 goto :download_failed
if not exist "%YTDLP_DOWNLOAD%" goto :download_failed

REM Verify the freshly downloaded binary before replacing the known-good copy.
"%YTDLP_DOWNLOAD%" --version >nul 2>&1
if errorlevel 1 (
    echo [WARN] Downloaded yt-dlp verify nahi hua. Existing copy preserve kar rahe hain.
    del /f /q "%YTDLP_DOWNLOAD%" >nul 2>&1
    goto :use_existing
)

REM Replace only after successful download + verification.
copy /y "%YTDLP_DOWNLOAD%" "%YTDLP%" >nul 2>&1
if errorlevel 1 (
    echo [WARN] yt-dlp replace nahi ho paya - file shayad use me hai. Existing copy preserve ki gayi.
    del /f /q "%YTDLP_DOWNLOAD%" >nul 2>&1
    goto :use_existing
)

del /f /q "%YTDLP_DOWNLOAD%" >nul 2>&1

echo [OK] Latest yt-dlp ready hai:
"%YTDLP%" --version
if errorlevel 1 goto :broken_existing
call :ensure_js_runtime
exit /b 0

:curl_missing
echo [WARN] Windows curl.exe nahi mila.
goto :use_existing

:download_failed
if exist "%YTDLP_DOWNLOAD%" del /f /q "%YTDLP_DOWNLOAD%" >nul 2>&1
echo [WARN] yt-dlp update download nahi ho paya.
goto :use_existing

:use_existing
if exist "%YTDLP%" (
    "%YTDLP%" --version
    if not errorlevel 1 (
        echo [OK] Existing yt-dlp use kiya ja raha hai.
        call :ensure_js_runtime
        exit /b 0
    )
)

echo [ERROR] Working yt-dlp available nahi hai.
echo Internet connection check karke Setup-YtDlp.bat dobara chalao.
exit /b 1


:ensure_js_runtime
REM Modern YouTube extraction needs a supported external JavaScript runtime.
REM DeepEcho can use Node 22+ (enabled by lib/ytdlp-smart.js), but we also keep a
REM private Deno next to yt-dlp so playback is not dependent on the user's Node version.
if exist "bin\deno.exe" (
    "bin\deno.exe" --version >nul 2>&1
    if not errorlevel 1 (
        echo [OK] YouTube JS runtime ready: Deno
        exit /b 0
    )
)

set "DENO_ZIP=%TEMP%\deep-echo-deno-%RANDOM%-%RANDOM%.zip"
set "DENO_DIR=%TEMP%\deep-echo-deno-%RANDOM%-%RANDOM%"
set "DENO_URL=https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip"
if exist "%DENO_ZIP%" del /f /q "%DENO_ZIP%" >nul 2>&1
if exist "%DENO_DIR%" rmdir /s /q "%DENO_DIR%" >nul 2>&1

echo [INFO] YouTube playback JS runtime prepare ho raha hai...
curl.exe --fail --show-error --location --retry 2 --connect-timeout 15 -o "%DENO_ZIP%" "%DENO_URL%"
if errorlevel 1 goto :deno_optional_fail
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%DENO_ZIP%' -DestinationPath '%DENO_DIR%' -Force" >nul 2>&1
if errorlevel 1 goto :deno_optional_fail
if not exist "%DENO_DIR%\deno.exe" goto :deno_optional_fail
copy /y "%DENO_DIR%\deno.exe" "bin\deno.exe" >nul 2>&1
if errorlevel 1 goto :deno_optional_fail
"bin\deno.exe" --version >nul 2>&1
if errorlevel 1 goto :deno_optional_fail
if exist "%DENO_ZIP%" del /f /q "%DENO_ZIP%" >nul 2>&1
if exist "%DENO_DIR%" rmdir /s /q "%DENO_DIR%" >nul 2>&1
echo [OK] YouTube JS runtime ready: Deno
exit /b 0

:deno_optional_fail
if exist "%DENO_ZIP%" del /f /q "%DENO_ZIP%" >nul 2>&1
if exist "%DENO_DIR%" rmdir /s /q "%DENO_DIR%" >nul 2>&1
echo [WARN] Deno runtime setup nahi hua. DeepEcho Node 22+ runtime try karega.
exit /b 0

:broken_existing
echo [ERROR] yt-dlp file present hai lekin run nahi ho rahi.
exit /b 1
