@echo off
setlocal EnableExtensions
title DEEP-ECHO 2.6.6 - Retry Failed Cloud Release
cd /d "%~dp0"
echo Retrying the failed 2.6.6 build with corrected dependency lockfile.
echo Existing source tag is preserved. New source tag: v2.6.6-build2
echo Installer and public update version remain 2.6.6.
call "%~dp0RELEASE-2.6.6.bat" -Recovery %*
exit /b %ERRORLEVEL%
