@echo off
setlocal EnableExtensions
title DEEP-ECHO Tag Fixer
color 0C

echo ========================================================
echo   Fixing Git Tags for GitHub Actions Compatibility
echo ========================================================
echo.

cd /d "C:\Users\windo\OneDrive\Documents\DeepEcho-PC-Development\DEEP-ECHO-v2.6.5-FAST-CLOUD-RELEASE-SOURCE\DEEP-ECHO-v2.6.5-FAST-CLOUD-RELEASE-SOURCE"

echo [1/3] Deleting incorrect remote tags (v2.6.8)...
git push --delete origin v2.6.8 >nul 2>&1
git tag -d v2.6.8 >nul 2>&1

echo [2/3] Cleaning up old v2.6.7 tags...
git push --delete origin v2.6.7 >nul 2>&1
git tag -d v2.6.7 >nul 2>&1

echo [3/3] Pushing correct v2.6.7 tag...
git tag -a "v2.6.7" -m "DEEP-ECHO v2.6.7 official release"
git push origin "v2.6.7"

echo.
echo ========================================================
echo [SUCCESS] Tag fixed to v2.6.7.
echo The GitHub Workflow should now run correctly.
echo ========================================================
echo.
pause
exit /b 0
