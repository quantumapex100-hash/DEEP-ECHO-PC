@echo off
setlocal EnableExtensions
title DEEP-ECHO - Safe Renderer Fix + Release v2.1.2
color 0A
cd /d "%~dp0"

echo ============================================================
echo   DEEP-ECHO - SAFE RENDERER FIX + RELEASE v2.1.2
echo ============================================================
echo.

where git.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git for Windows nahi mila.
  pause
  exit /b 1
)

where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js nahi mila.
  pause
  exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm nahi mila.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [ERROR] package.json nahi mila. Is BAT ko DEEP-ECHO project folder me rakho.
  pause
  exit /b 1
)

if not exist "src\effects.js" (
  echo [ERROR] src\effects.js nahi mila.
  pause
  exit /b 1
)

if not exist ".git" (
  echo [ERROR] .git nahi mila.
  pause
  exit /b 1
)

echo [1/8] Safe Node patcher create ho raha hai...
node -e "require('fs').writeFileSync('.deep-echo-v212-patch.cjs',Buffer.from('Y29uc3QgZnMgPSByZXF1aXJlKCdmcycpOwpjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpOwoKZnVuY3Rpb24gd3JpdGVKc29uKGZpbGUsIG9iaikgewogIGZzLndyaXRlRmlsZVN5bmMoZmlsZSwgSlNPTi5zdHJpbmdpZnkob2JqLCBudWxsLCAyKSArICdcbicpOwp9CgovLyAxKSBQYXRjaCBhcHAgc291cmNlIHNhZmVseS4KY29uc3QgZWZmZWN0c1BhdGggPSBwYXRoLmpvaW4oJ3NyYycsICdlZmZlY3RzLmpzJyk7CmxldCBlZmZlY3RzID0gZnMucmVhZEZpbGVTeW5jKGVmZmVjdHNQYXRoLCAndXRmOCcpOwoKY29uc3Qgb2xkTGluZSA9ICJpZiAoJ3JlcXVlc3RJZGxlQ2FsbGJhY2snIGluIHdpbmRvdykgcmVxdWVzdElkbGVDYWxsYmFjayhwcmV3YXJtU3BhY2Use3RpbWVvdXQ6MTQwMH0pOyBlbHNlIHNldFRpbWVvdXQocHJld2FybVNwYWNlLDQ1MCk7IjsKY29uc3QgbmV3TGluZSA9ICJpZiAodHlwZW9mIHJlcXVlc3RJZGxlQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHJlcXVlc3RJZGxlQ2FsbGJhY2socHJld2FybVNwYWNlLHt0aW1lb3V0OjE0MDB9KTsgZWxzZSBzZXRUaW1lb3V0KHByZXdhcm1TcGFjZSw0NTApOyI7CgppZiAoZWZmZWN0cy5pbmNsdWRlcyhvbGRMaW5lKSkgewogIGVmZmVjdHMgPSBlZmZlY3RzLnJlcGxhY2Uob2xkTGluZSwgbmV3TGluZSk7CiAgZnMud3JpdGVGaWxlU3luYyhlZmZlY3RzUGF0aCwgZWZmZWN0cyk7CiAgY29uc29sZS5sb2coJ1tPS10gcmVxdWVzdElkbGVDYWxsYmFjayBndWFyZCBwYXRjaGVkLicpOwp9IGVsc2UgaWYgKGVmZmVjdHMuaW5jbHVkZXMobmV3TGluZSkpIHsKICBjb25zb2xlLmxvZygnW09LXSByZXF1ZXN0SWRsZUNhbGxiYWNrIGd1YXJkIGFscmVhZHkgcGF0Y2hlZC4nKTsKfSBlbHNlIHsKICBjb25zb2xlLmVycm9yKCdbRVJST1JdIEV4cGVjdGVkIHJlcXVlc3RJZGxlQ2FsbGJhY2sgbGluZSBub3QgZm91bmQgaW4gc3JjL2VmZmVjdHMuanMnKTsKICBwcm9jZXNzLmV4aXQoMik7Cn0KCi8vIDIpIFZlcnNpb24gcGFja2FnZSBmaWxlcy4KY29uc3QgcGtnID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoJ3BhY2thZ2UuanNvbicsICd1dGY4JykpOwpwa2cudmVyc2lvbiA9ICcyLjEuMic7CnBrZy5kZXNjcmlwdGlvbiA9ICdERUVQLUVDSE8gMi4xLjIgLSBhdXRvLXVwZGF0ZSBmb3VuZGF0aW9uIHdpdGggY2xvdWQtc2FmZSByZW5kZXJlciBjaGVja3MnOwpwa2cuc2NyaXB0cyA9IHBrZy5zY3JpcHRzIHx8IHt9Owpwa2cuc2NyaXB0cy50ZXN0ID0gJ25vZGUgdGVzdHMvcnVuLXRlc3RzLmNqcyc7CndyaXRlSnNvbigncGFja2FnZS5qc29uJywgcGtnKTsKCmlmIChmcy5leGlzdHNTeW5jKCdwYWNrYWdlLWxvY2suanNvbicpKSB7CiAgY29uc3QgbG9jayA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLWxvY2suanNvbicsICd1dGY4JykpOwogIGxvY2sudmVyc2lvbiA9ICcyLjEuMic7CiAgaWYgKGxvY2sucGFja2FnZXMgJiYgbG9jay5wYWNrYWdlc1snJ10pIGxvY2sucGFja2FnZXNbJyddLnZlcnNpb24gPSAnMi4xLjInOwogIHdyaXRlSnNvbigncGFja2FnZS1sb2NrLmpzb24nLCBsb2NrKTsKfQoKLy8gMykgTWFrZSBhbnkgbGVmdG92ZXIgZXhhY3QgMi4xLjAvMi4xLjEgcGFja2FnZS12ZXJzaW9uIGFzc2VydGlvbnMgZnV0dXJlLXNhZmUuCmNvbnN0IHRlc3RzRGlyID0gJ3Rlc3RzJzsKZm9yIChjb25zdCBuYW1lIG9mIGZzLnJlYWRkaXJTeW5jKHRlc3RzRGlyKSkgewogIGlmICghbmFtZS5lbmRzV2l0aCgnLmpzJykpIGNvbnRpbnVlOwogIGNvbnN0IGZpbGUgPSBwYXRoLmpvaW4odGVzdHNEaXIsIG5hbWUpOwogIGxldCBzID0gZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4Jyk7CiAgY29uc3QgYmVmb3JlID0gczsKCiAgcyA9IHMucmVwbGFjZSgKICAgIC9hc3NlcnRcLmVxdWFsXChwa2dcLnZlcnNpb24sXHMqWyciXTJcLjFcLig/OjB8MSlbJyJdXCk7L2csCiAgICAiYXNzZXJ0Lm1hdGNoKHBrZy52ZXJzaW9uLC9eMlxcLlxcZCtcXC5cXGQrJC8pOyIKICApOwoKICBpZiAocyAhPT0gYmVmb3JlKSB7CiAgICBmcy53cml0ZUZpbGVTeW5jKGZpbGUsIHMpOwogICAgY29uc29sZS5sb2coJ1tPS10gUGF0Y2hlZCB2ZXJzaW9uIGFzc2VydGlvbjonLCBuYW1lKTsKICB9Cn0KCmNvbnNvbGUubG9nKCdbT0tdIFNvdXJjZSBwYXRjaCBjb21wbGV0ZS4gVGFyZ2V0IHZlcnNpb246IDIuMS4yJyk7','base64'))"
if errorlevel 1 goto :fail

echo [2/8] Source + version patch...
node ".deep-echo-v212-patch.cjs"
if errorlevel 1 goto :fail

del /q ".deep-echo-v212-patch.cjs" >nul 2>&1

echo [3/8] Cross-platform test runner ensure...
if not exist "tests\run-tests.cjs" (
  node -e "require('fs').writeFileSync('tests/run-tests.cjs',Buffer.from('Y29uc3QgZnMgPSByZXF1aXJlKCdmcycpOwpjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpOwpjb25zdCB7IHNwYXduU3luYyB9ID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpOwoKY29uc3QgdGVzdHNEaXIgPSBfX2Rpcm5hbWU7CmNvbnN0IHRlc3RGaWxlcyA9IGZzLnJlYWRkaXJTeW5jKHRlc3RzRGlyKQogIC5maWx0ZXIoKG5hbWUpID0+IG5hbWUuZW5kc1dpdGgoJy50ZXN0LmpzJykpCiAgLnNvcnQoKQogIC5tYXAoKG5hbWUpID0+IHBhdGguam9pbih0ZXN0c0RpciwgbmFtZSkpOwoKaWYgKCF0ZXN0RmlsZXMubGVuZ3RoKSB7CiAgY29uc29sZS5lcnJvcignTm8gKi50ZXN0LmpzIGZpbGVzIGZvdW5kIGluIHRlc3RzLycpOwogIHByb2Nlc3MuZXhpdCgxKTsKfQoKY29uc29sZS5sb2coYFJ1bm5pbmcgJHt0ZXN0RmlsZXMubGVuZ3RofSBOb2RlIHRlc3QgZmlsZXMuLi5gKTsKbGV0IHJlc3VsdCA9IHNwYXduU3luYyhwcm9jZXNzLmV4ZWNQYXRoLCBbJy0tdGVzdCcsIC4uLnRlc3RGaWxlc10sIHsgc3RkaW86ICdpbmhlcml0JyB9KTsKaWYgKHJlc3VsdC5lcnJvcikgdGhyb3cgcmVzdWx0LmVycm9yOwppZiAocmVzdWx0LnN0YXR1cyAhPT0gMCkgcHJvY2Vzcy5leGl0KHJlc3VsdC5zdGF0dXMgPz8gMSk7Cgpjb25zb2xlLmxvZygnUnVubmluZyByZW5kZXJlciBzbW9rZSB0ZXN0Li4uJyk7CnJlc3VsdCA9IHNwYXduU3luYyhwcm9jZXNzLmV4ZWNQYXRoLCBbcGF0aC5qb2luKHRlc3RzRGlyLCAncmVuZGVyZXItc21va2UuY2pzJyldLCB7IHN0ZGlvOiAnaW5oZXJpdCcgfSk7CmlmIChyZXN1bHQuZXJyb3IpIHRocm93IHJlc3VsdC5lcnJvcjsKcHJvY2Vzcy5leGl0KHJlc3VsdC5zdGF0dXMgPz8gMCk7','base64'))"
  if errorlevel 1 goto :fail
)

echo [4/8] Dependencies install/check...
call npm.cmd install --no-audit --no-fund
if errorlevel 1 (
  echo [ERROR] npm install fail hua.
  pause
  exit /b 1
)

echo [5/8] Full automated tests + renderer smoke...
call npm.cmd test
if errorlevel 1 (
  echo.
  echo [ERROR] Tests fail hue. Exact last error bhejna.
  pause
  exit /b 1
)

echo [6/8] Commit + main push...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Fix requestIdleCallback guard and prepare v2.1.2"
  if errorlevel 1 goto :fail
) else (
  echo [INFO] Koi naya change commit karne ko nahi hai.
)

git push origin main
if errorlevel 1 goto :fail

echo [7/8] v2.1.2 tag check...
set "REMOTE_TAG="
for /f %%T in ('git ls-remote --tags origin "refs/tags/v2.1.2"') do set "REMOTE_TAG=%%T"
if defined REMOTE_TAG (
  echo [ERROR] v2.1.2 tag already exists.
  echo GitHub Actions page check karo.
  start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions"
  pause
  exit /b 1
)

echo [8/8] v2.1.2 cloud build trigger...
git tag -a "v2.1.2" -m "DEEP-ECHO 2.1.2"
if errorlevel 1 goto :fail

git push origin "v2.1.2"
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo   TESTS PASSED + v2.1.2 CLOUD BUILD TRIGGERED
echo ============================================================
echo.
start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions"
pause
exit /b 0

:fail
del /q ".deep-echo-v212-patch.cjs" >nul 2>&1
echo.
echo [ERROR] Command fail hua. Source files safe hain.
pause
exit /b 1
