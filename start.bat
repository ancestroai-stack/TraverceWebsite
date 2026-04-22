@echo off
SETLOCAL

title TRAVERCE Development Server (Vite)

echo.
echo  ================================================
echo    TRAVERCE - THE NEW SOUND FRONTIER
echo    Vite Real-Time Server
echo  ================================================
echo.
echo  Starting Vite...
echo.

:: Run Vite dev server
npx vite --open --port 8000

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERROR: Failed to start Vite. 
    echo  Make sure Node.js is installed and you have run npm install.
    pause
)

ENDLOCAL
