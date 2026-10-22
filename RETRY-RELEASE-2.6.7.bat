@echo off
setlocal EnableExtensions
title DEEP-ECHO 2.6.7 - Retry Corrected GitHub Workflow
cd /d "%~dp0"
echo DEEP-ECHO 2.6.7 - retry with corrected release availability check
echo New source build tag will be selected automatically.
echo Existing tags and published releases will not be overwritten.
call "%~dp0RELEASE-2.6.7.bat" -AutoRecovery %*
exit /b %ERRORLEVEL%
