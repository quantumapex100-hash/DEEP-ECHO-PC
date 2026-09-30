@echo off
setlocal EnableExtensions
title DEEP-ECHO - Restore Git Link
color 0B
cd /d "%~dp0"

echo ============================================================
echo       DEEP-ECHO - RESTORE GITHUB SOURCE LINK
echo ============================================================
echo.
echo Ye source folder ko GitHub repo se dobara connect karega.
echo Source files overwrite nahi hongi.
echo.

where git.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git for Windows installed nahi hai.
  echo Pehle Git install karo, phir is file ko dobara chalao.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [ERROR] package.json nahi mila. Is BAT ko DEEP-ECHO source folder ke andar hi rakho.
  pause
  exit /b 1
)

if not exist ".git" (
  echo [1/5] Git repository initialize ho rahi hai...
  git init -b main
  if errorlevel 1 goto :fail
) else (
  echo [1/5] Existing .git folder mil gaya.
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

echo [2/5] GitHub history fetch ho rahi hai...
git fetch origin main
if errorlevel 1 (
  echo [ERROR] Fetch fail hua. Browser me GitHub authentication complete karo.
  pause
  exit /b 1
)

echo [3/5] Local files ko preserve karke remote history attach kar rahe hain...
git symbolic-ref HEAD refs/heads/main
if errorlevel 1 goto :fail

git reset --mixed origin/main
if errorlevel 1 goto :fail

echo [4/5] Upstream set ho raha hai...
git branch --set-upstream-to=origin/main main >nul 2>&1

echo [5/5] Done.
echo.
echo ============================================================
echo   GIT LINK RESTORED SUCCESSFULLY
echo ============================================================
echo.
echo Ab v2.2.1 hotfix update pack chala sakte ho.
echo Is source folder ko select karna.
echo.
pause
exit /b 0

:fail
echo.
echo [ERROR] Git command fail hua. Source files safe hain.
pause
exit /b 1
