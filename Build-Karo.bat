@echo off
setlocal EnableExtensions
title DEEP-ECHO - Safe Windows Build
color 0B
cd /d "%~dp0"

REM ------------------------------------------------------------
REM Auto-elevate. This avoids electron-builder winCodeSign symlink
REM privilege failures on Windows when the build shell is not admin.
REM ------------------------------------------------------------
net session >nul 2>&1
if errorlevel 1 (
    echo [INFO] Build ko Administrator permission chahiye. UAC prompt aa sakta hai...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs -WorkingDirectory '%~dp0'"
    exit /b 0
)

REM ------------------------------------------------------------
REM Use an isolated writable temp folder for the whole build.
REM This prevents NSIS !tempfile failures and ignores poisoned TEMP/TMP.
REM SETLOCAL restores the user's original environment when this script exits.
REM ------------------------------------------------------------
set "BUILD_TEMP=%LOCALAPPDATA%\DEEP-ECHO\BuildTemp"
if exist "%BUILD_TEMP%" rmdir /s /q "%BUILD_TEMP%" >nul 2>&1
mkdir "%BUILD_TEMP%" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Safe build temp folder create nahi hua: %BUILD_TEMP%
    pause
    exit /b 1
)
set "TEMP=%BUILD_TEMP%"
set "TMP=%BUILD_TEMP%"
set "CSC_IDENTITY_AUTO_DISCOVERY=false"

REM Confirm temp really works before NSIS/electron-builder starts.
>"%TEMP%\write-test.tmp" echo DEEP-ECHO
if not exist "%TEMP%\write-test.tmp" (
    echo [ERROR] TEMP folder writable nahi hai: %TEMP%
    pause
    exit /b 1
)
del /f /q "%TEMP%\write-test.tmp" >nul 2>&1

for /f "usebackq delims=" %%V in (`node -p "require('./package.json').version"`) do set "APP_VERSION=%%V"
if not defined APP_VERSION set "APP_VERSION=unknown"

echo ============================================
echo   DEEP-ECHO %APP_VERSION% - SAFE BUILD
echo ============================================
echo [OK] Administrator mode
echo [OK] Safe TEMP = %TEMP%
echo.

where node.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js install nahi mila.
    echo Node.js LTS install karke Build-Karo.bat dobara chalao.
    pause
    exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm.cmd nahi mila. Node.js installation repair/reinstall karo.
    pause
    exit /b 1
)

echo [OK] Node.js mil gaya.
node --version
call npm.cmd --version
echo.

REM Clean the exact stale path created by the old v2.0.0 updater bug.
if exist "bin\yt-dlp.exe.tmp\" rmdir /s /q "bin\yt-dlp.exe.tmp" >nul 2>&1
if exist "bin\yt-dlp.exe.tmp" del /f /q "bin\yt-dlp.exe.tmp" >nul 2>&1

echo [STEP 1/4] YouTube engine safe setup...
call "%~dp0Setup-YtDlp.bat"
if errorlevel 1 (
    echo.
    echo [ERROR] yt-dlp setup fail hua. Build stop kiya gaya taaki broken package na bane.
    pause
    exit /b 1
)
echo.

echo [STEP 2/4] Dependencies install/check...
call npm.cmd install --no-audit --no-fund
if errorlevel 1 (
    echo.
    echo [ERROR] npm install fail ho gaya.
    pause
    exit /b 1
)
echo [OK] Dependencies ready.
echo.

echo [STEP 3/4] Purana dist output clean ho raha hai...
if exist "dist" rmdir /s /q "dist" >nul 2>&1
if exist "dist" (
    echo [ERROR] dist folder delete nahi hua. DEEP-ECHO ki running copy close karke dobara try karo.
    pause
    exit /b 1
)
echo [OK] Clean output ready.
echo.

echo [STEP 4/4] Windows installer (.exe) ban raha hai...
echo Build log: build-output.log
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& npm.cmd run dist 2>&1 | Tee-Object -FilePath 'build-output.log'; exit $LASTEXITCODE"
set "BUILD_RC=%ERRORLEVEL%"

if not "%BUILD_RC%"=="0" (
    echo.
    echo ============================================
    echo [ERROR] Build fail hua. Exit code: %BUILD_RC%
    echo ============================================
    echo Full log yahan save hai:
    echo   %~dp0build-output.log
    echo.
    findstr /i /c:"Cannot create symbolic link" /c:"required privilege" "build-output.log" >nul 2>&1
    if not errorlevel 1 (
        echo [FIX HINT] Windows symlink privilege issue mila.
        echo Is script ko UAC se Administrator mode me chalna chahiye.
        echo Agar Windows ne UAC deny kiya tha, Build-Karo.bat dobara run karke Yes dabao.
        echo.
    )
    findstr /i /c:"!tempfile: Unable to create temporary file" "build-output.log" >nul 2>&1
    if not errorlevel 1 (
        echo [FIX HINT] NSIS TEMP issue mila. Safe TEMP already enabled hai.
        echo Windows Security/antivirus me makensis.exe block ho raha ho sakta hai.
        echo Log file preserve ki gayi hai.
        echo.
    )
    if exist "dist\win-unpacked\DEEP-ECHO.exe" (
        echo [INFO] Installer fail hua, lekin unpacked app successfully ban chuki hai:
        echo   %~dp0dist\win-unpacked\DEEP-ECHO.exe
        echo Build-Portable.bat bhi isi fallback ko cleanly bana sakta hai.
        echo.
    )
    pause
    exit /b %BUILD_RC%
)

if not exist "dist\DEEP-ECHO-%APP_VERSION%-Setup.exe" (
    echo [WARN] Build command successful tha, lekin expected installer naam nahi mila.
    echo dist folder open kar rahe hain - generated .exe wahi hogi.
) else (
    echo [OK] Installer ready: dist\DEEP-ECHO-%APP_VERSION%-Setup.exe
)

echo.
echo ============================================
echo   BUILD SUCCESSFUL - DEEP-ECHO %APP_VERSION%
echo ============================================
echo.
start "" "%~dp0dist"
pause
exit /b 0
