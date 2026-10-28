@echo off
setlocal EnableExtensions
cd /d "%~dp0"
call "%~dp0RELEASE-3.0.bat" %*
exit /b %ERRORLEVEL%
