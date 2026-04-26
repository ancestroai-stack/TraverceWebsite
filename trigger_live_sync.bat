@echo off
echo Triggering Traverce Cloudflare Rebuild...

:: Replace the URL below with your actual Cloudflare webhook URL
curl -X POST "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/PASTE-YOUR-WEBHOOK-URL-HERE"

echo.
echo Sync Triggered! Cloudflare will now fetch the new Spotify artists.
pause
