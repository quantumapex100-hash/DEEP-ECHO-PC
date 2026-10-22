@echo off
setlocal EnableExtensions
cd /d "%~dp0"
call "%~dp0RELEASE-2.6.7.bat" %*
exit /b %ERRORLEVEL%
