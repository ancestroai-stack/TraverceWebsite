@echo off
title Stop TRAVERCE Server
echo.
echo  ================================================
echo    Stopping TRAVERCE Servers
echo    (Vite Port 8000, Wrangler Port 8788)
echo  ================================================
echo.

:: Kill Vite (Port 8000)
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr :8000') do (
    echo Killing Vite Process ID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill Wrangler (Port 8788)
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr :8788') do (
    echo Killing Wrangler Process ID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Servers successfully stopped.
pause
