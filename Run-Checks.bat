@echo off
setlocal EnableExtensions
cd /d "%~dp0"
REM Use the isolated test dependency when the full app is not installed yet.
if not exist "node_modules\linkedom\package.json" if exist "..\..\.dev-tools\node_modules\linkedom\package.json" set "NODE_PATH=%~dp0..\..\.dev-tools\node_modules"
call npm test
if errorlevel 1 (
  echo Checks failed. Please keep the error output.
  pause
  exit /b 1
)
echo All automated checks passed.
pause
