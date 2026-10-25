@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "ELECTRON_RUN_AS_NODE="
set "DEEPECHO_PLAYBACK_DEBUG=1"
set "DEEPECHO_LOG_DIR=%LOCALAPPDATA%\DeepEcho-PC-Development"
if not exist "%DEEPECHO_LOG_DIR%" mkdir "%DEEPECHO_LOG_DIR%"
echo Playback timing mode. Close DeepEcho before opening this launcher.
echo Timing log: %DEEPECHO_LOG_DIR%\playback-debug.log
call "%~dp0START-OFFLINE.bat" > "%DEEPECHO_LOG_DIR%\playback-debug.log" 2>&1
set "DEEPECHO_RESULT=%ERRORLEVEL%"
echo DeepEcho closed. Timing log saved.
pause
exit /b %DEEPECHO_RESULT%
