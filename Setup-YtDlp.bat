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
        exit /b 0
    )
)

echo [ERROR] Working yt-dlp available nahi hai.
echo Internet connection check karke Setup-YtDlp.bat dobara chalao.
exit /b 1

:broken_existing
echo [ERROR] yt-dlp file present hai lekin run nahi ho rahi.
exit /b 1
