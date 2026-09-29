@echo off
setlocal EnableExtensions
title DEEP-ECHO - GitHub Source Push V2
color 0B
cd /d "%~dp0"

echo ============================================================
echo       DEEP-ECHO - GITHUB SOURCE PUSH V2
echo ============================================================
echo.
echo Target PRIVATE source repository:
echo   https://github.com/windowsdaiyu-cyber/DEEP-ECHO
echo.
echo Ye V2 remote README ke saath clash kiye bina source push karega.
echo.

where git.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git for Windows installed nahi hai.
  echo Git install karke dobara chalao.
  pause
  exit /b 1
)

if not exist ".git" (
  echo [1/5] Git repository initialize ho rahi hai...
  git init -b main
  if errorlevel 1 goto :gitfail
) else (
  echo [1/5] Existing Git repository mil gayi.
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

echo [2/5] GitHub source repo history fetch ho rahi hai...
git fetch origin main
if errorlevel 1 (
  echo.
  echo [INFO] Agar browser login khula hai to GitHub login/Authorize complete karo.
  echo [ERROR] Source repo fetch nahi hua.
  pause
  exit /b 1
)

echo [3/5] Remote history ko local source ke neeche attach kiya ja raha hai...
rem IMPORTANT:
rem "git reset --mixed" remote commit ko current branch ka base banata hai
rem lekin working files (including local README.md) ko overwrite nahi karta.
git symbolic-ref HEAD refs/heads/main
if errorlevel 1 goto :gitfail

git reset --mixed origin/main
if errorlevel 1 goto :gitfail

echo [4/5] DEEP-ECHO source commit ho raha hai...
git add -A
if errorlevel 1 goto :gitfail

git diff --cached --quiet
if not errorlevel 1 (
  echo [INFO] Commit karne ke liye koi naya change nahi mila.
) else (
  git commit -m "DEEP-ECHO 2.1.0 auto-update foundation"
  if errorlevel 1 goto :gitfail
)

echo [5/5] GitHub PRIVATE source repo par push ho raha hai...
git push -u origin main
if errorlevel 1 (
  echo.
  echo [ERROR] Push fail hua.
  echo GitHub browser login/authorization ya repository permission check karo.
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
echo.
echo [ERROR] Git command fail hua.
echo Working source files delete nahi ki gayi hain.
pause
exit /b 1
