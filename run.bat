@echo off
setlocal enabledelayedexpansion
title AURA 2.0 ? Luxury Glassmorphism Auth API (Node.js + React)

echo ========================================================
echo    Starting AURA 2.0 ? Node.js Express + React System
echo ========================================================

:: Detect Node.js installation
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\nodejs;!PATH!"
    ) else if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;!PATH!"
    ) else (
        echo [ERROR] Node.js is not found on your system.
        echo Please download and install Node.js from https://nodejs.org/
        pause
        exit /b 1
    )
)

echo [OK] Using Node.js:
node --version

:: Ensure client production build exists
if not exist "client\dist\index.html" (
    echo [INFO] Building React client for production...
    cd client
    call npm run build
    cd ..
)

echo.
echo ========================================================
echo    AURA 2.0 Full-Stack Application is running!
echo    ?? Local:   http://localhost:5000
echo    ?? Network: http://127.0.0.1:5000
echo ========================================================
echo.

:: Open default browser to localhost:5000
start http://localhost:5000

:: Start the Express backend server
set NODE_ENV=production
node server\app.js
pause