@echo off
title AURA 2.0 • Luxury Glassmorphism Auth API (Node.js + React)
echo ========================================================
echo    Starting AURA 2.0 • Node.js Express + React System
echo ========================================================

:: Check PATH for node or local portable nodejs installation
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
    ) else (
        echo [ERROR] Node.js is not found in PATH or %LOCALAPPDATA%\Programs\nodejs.
        echo Please ensure Node.js is installed.
        pause
        exit /b 1
    )
)

echo [OK] Using Node.js:
node --version

:: Ensure client build exists
if not exist "client\dist\index.html" (
    echo [INFO] Building React client for production...
    cd client
    call npm run build
    cd ..
)

echo.
echo ========================================================
echo    AURA 2.0 Full-Stack Application is running!
echo    URL: http://127.0.0.1:5000
echo ========================================================
echo.

start http://127.0.0.1:5000
node server/app.js
pause
 