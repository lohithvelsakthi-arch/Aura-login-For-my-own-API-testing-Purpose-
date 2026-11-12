@echo off
set "PATH=%LOCALAPPDATA%\Programs\nodejs;C:\Program Files\nodejs;%PATH%"
title AURA 2.0 - Luxury Glassmorphism Auth API (Node.js + React)

echo ========================================================
echo    Starting AURA 2.0 Full-Stack Application
echo ========================================================

:: Verify Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js version:
node -v

:: Ensure React production bundle exists
if not exist "Frontend\dist\index.html" (
    echo [INFO] Building React frontend for production...
    cd Frontend
    call npm run build
    cd ..
)

echo.
echo ========================================================
echo    AURA 2.0 is running!
echo    URL: http://localhost:5000
echo ========================================================
echo.

start http://localhost:5000
node server\app.js
pause