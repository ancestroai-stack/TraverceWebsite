@echo off
SETLOCAL

title TRAVERCE Development Server (Wrangler + Vite)

echo.
echo  ================================================
echo    TRAVERCE - THE NEW SOUND FRONTIER
echo    Cloudflare Pages + D1 Local Server
echo  ================================================
echo.

:: Automatically run the sync script before starting
echo  [1/2] Running Spotify Sync (pushing to local D1)...
node sync_artists.js
echo.

echo  [2/2] Starting Wrangler Pages Dev Server...
echo  (This runs Vite on port 8000 and Cloudflare API on port 8788)
echo.

:: We run wrangler pages dev, which automatically starts Vite.
:: We bind the D1 database locally so the /api/ functions work.
:: We set the API URL so the admin portal talks to the local API.
set TRAVERCE_API_URL=http://localhost:8788
set TRAVERCE_ADMIN_KEY=traverce-admin-2024-secret

:: Start wrangler mapped to our Vite dev server
npx wrangler pages dev --proxy 8000 --d1 DB=traverce-artists --command "npx vite --port 8000"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERROR: Failed to start Wrangler server.
    echo  Make sure you ran `npm install` and `npm install -g wrangler`
    pause
)

ENDLOCAL
