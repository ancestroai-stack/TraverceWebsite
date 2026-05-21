@echo off
SETLOCAL

title TRAVERCE Playlist Sync

echo.
echo  ================================================
echo    TRAVERCE - Playlist Sync
echo  ================================================
echo.
echo  Updating Zambian Charts from Spotify playlist...
echo.

node sync_artists.js --playlists-only

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERROR: Playlist sync failed.
    echo  Check that .env has SPOTIFY_REFRESH_TOKEN and that Node.js is installed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo  Done. Zambian Charts has been updated in the code.
echo.
pause

ENDLOCAL
