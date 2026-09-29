@echo off
cd /d "%~dp0"
call npm test
if errorlevel 1 (
  echo Checks failed. Please keep the error output.
  pause
  exit /b 1
)
echo All automated checks passed.
pause
