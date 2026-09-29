@echo off
setlocal EnableExtensions
title DEEP-ECHO - Push Source to GitHub
color 0B
cd /d "%~dp0"

echo ============================================================
echo       DEEP-ECHO - ONE TIME GITHUB SOURCE PUSH
echo ============================================================
echo.
echo Target PRIVATE source repository:
echo   https://github.com/windowsdaiyu-cyber/DEEP-ECHO
echo.
echo IMPORTANT: Is repo ko PRIVATE hi rakho.
echo Public release files alag DEEP-ECHO-Releases repo me jayengi.
echo.

where git.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git for Windows installed nahi hai.
  echo https://git-scm.com/download/win se Git install karo,
  echo phir is file ko dobara chalao.
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

echo [1/4] GitHub source repo se existing README/history fetch ho rahi hai...
git fetch origin main
if errorlevel 1 (
  echo.
  echo [INFO] Agar browser login khula hai to GitHub login/Authorize complete karo.
  echo [ERROR] Source repo fetch nahi hua. Repo access ya Git login check karo.
  pause
  exit /b 1
)

echo [2/4] Local source ko main branch par prepare kar rahe hain...
git checkout -B main origin/main
if errorlevel 1 goto :gitfail

echo [3/4] DEEP-ECHO source commit ho raha hai...
git add -A
git commit -m "DEEP-ECHO 2.1.0 auto-update foundation"
if errorlevel 1 (
  echo [INFO] Commit create nahi hua - ho sakta hai same files already committed hon.
)

echo [4/4] GitHub PRIVATE source repo par push ho raha hai...
git push -u origin main
if errorlevel 1 (
  echo.
  echo [ERROR] Push fail hua. GitHub browser login/authorization ya repo permission check karo.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   SOURCE PUSH SUCCESSFUL

echo   Repo: windowsdaiyu-cyber/DEEP-ECHO

echo ============================================================
echo.
echo Next one-time step: GitHub repo Settings ^> Secrets and variables ^> Actions

echo Secret name: RELEASE_TOKEN

echo Secret value chat me MAT bhejna.

echo.
pause
exit /b 0

:gitfail
echo [ERROR] Git command fail hua.
pause
exit /b 1
