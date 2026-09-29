@echo off
setlocal EnableExtensions
title DEEP-ECHO - Fixed GitHub Source Push
color 0B
cd /d "%~dp0"

echo ============================================================
echo       DEEP-ECHO - FIXED ONE TIME GITHUB SOURCE PUSH
echo ============================================================
echo.
echo Target PRIVATE source repository:
echo   https://github.com/windowsdaiyu-cyber/DEEP-ECHO
echo.

where git.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git for Windows installed nahi hai.
  echo Git install karke dobara chalao.
  pause
  exit /b 1
)

if not exist ".git" (
  git init -b main
  if errorlevel 1 goto :gitfail
)

git config user.name >nul 2>&1
if errorlevel 1 git config user.name "windowsdaiyu-cyber"
git config user.email >nul 2>&1
if errorlevel 1 git config user.email "windowsdaiyu-cyber@users.noreply.github.com"

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin "https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git"
) else (
  git remote set-url origin "https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git"
)

echo [1/5] Local README ko safe backup kiya ja raha hai...
set "READMEBACKUP=%TEMP%\DEEP-ECHO-README-%RANDOM%-%RANDOM%.md"
if exist "README.md" copy /Y "README.md" "%READMEBACKUP%" >nul

echo [2/5] GitHub source repo history fetch ho rahi hai...
git fetch origin main
if errorlevel 1 (
  echo.
  echo [INFO] Agar browser login khula hai to GitHub login/Authorize complete karo.
  echo [ERROR] Source repo fetch nahi hua.
  pause
  exit /b 1
)

echo [3/5] Main branch prepare ho rahi hai...
git checkout -B main origin/main
if errorlevel 1 goto :gitfail

if exist "%READMEBACKUP%" (
  copy /Y "%READMEBACKUP%" "README.md" >nul
  del /Q "%READMEBACKUP%" >nul 2>&1
)

echo [4/5] DEEP-ECHO source commit ho raha hai...
git add -A
git commit -m "DEEP-ECHO 2.1.0 auto-update foundation"
if errorlevel 1 (
  echo [INFO] Naya commit nahi bana - ho sakta hai files already same hon.
)

echo [5/5] GitHub PRIVATE source repo par push ho raha hai...
git push -u origin main
if errorlevel 1 (
  echo.
  echo [ERROR] Push fail hua. GitHub login/authorization ya repo permission check karo.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   SOURCE PUSH SUCCESSFUL
echo   Repo: windowsdaiyu-cyber/DEEP-ECHO
echo ============================================================
echo.
echo Next step: RELEASE_TOKEN secret setup.
echo Secret value chat me MAT bhejna.
echo.
pause
exit /b 0

:gitfail
echo [ERROR] Git command fail hua.
if exist "%READMEBACKUP%" del /Q "%READMEBACKUP%" >nul 2>&1
pause
exit /b 1
