import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_SPOTIFY_CLIENT_SECRET;

const HTML_FILE = 'index.html';
const JS_FILE = 'main.js';

// Default BRAND image for fallback
const FALLBACK_IMAGE = 'https://i.scdn.co/image/ab67616d0000b273b7ed663c9b74052ca5a8a183'; // Soulful Start Cover

// ---------------------------------------------------------------------------
// ARTIST IDs LIST — update this when you change the playlist.
// WHY HARDCODED: Spotify client_credentials tokens (used in GitHub Actions /
// Cloudflare builds) cannot access user-owned playlist tracks — the /tracks
// endpoint returns 403. Scraping the Spotify HTML page also fails in headless
// CI environments because the page requires JavaScript to render.
// ---------------------------------------------------------------------------
const ARTIST_IDS = [
  '0uAUrmEQbwcDFzg0v7VicO', // Lila Ike
  '0rskhjcLm5BxjwZDRs4142', // Magixx
  '16rCzZOMQX7P8Kmn5YKexI', // Mahalia
  '3ukrG1BmfEiuo0KDj8YTTS', // Teni
  '6ctMiUYEAd4cy0CaH355Hk', // Yo Maps
  '26fSO7cYQ1Txtb8xNi8byv', // Chef 187
  '5Y8PQZPxzdPxPqGxoqKC5H', // Frank Ro
  '5f24U3gtxTUPIRT2HujkHm', // Xaven
  '3iBJAU4xa7sV1W9ZJO7uzK', // KB
  '2rtXAAlmUadQoZk7iXi4Fe', // Triple M
  '2ApKRJV8pKnEiq10xlTYTJ', // JC Kalinks
  '44vOrGC9wQuBCQIeBUNc1O', // Tio Nason
  '4fLTbvnsLjg1PHp1oEiWxl', // Chewe
  '4Un29hGNtmUOCCGQWiInis', // ESII
  '1S4KltOEUKNdbOd9RrI5Lg', // Mordecaii
  '2cm1BTICMJaTYi6OpPchTm', // Rustar
  '4O9BYjQLNhndddq00X0ALc', // The F.A.K.E
  '3aufVL9SkQwm5GVFydc1GG', // F Jay
  '3s9441fVkfNQrHBmXRFMWM', // Kanina Kandalama
  '1CGpjhbMNattNmUtBaj31Q', // Styve Ace
  '6T36EOpJj9B6SnyynRqpgG', // Bad Boy Shezy
  '4OKrofOC9Ypgu1HBxZIMb0', // IamWaters
  '2Ek5746GXl1ePTgpFBnbct', // Nyarai
  '4GbzyoLPE0z6jvL5h9st3F', // Vleko
  '4zefLiC0h0euXegWWgGq3p', // Zaggar
  '0j5CGslS41MUjK6uekSHZU', // Extra artist
];

const PLAYLIST_ID = '7nC2I08ZK98QLzR3Ov3HvG';
const FEATURED_PLAYLIST_ID = '6bkmEXVFb7zNtOzBvGGDK1';
const NEW_SINGLE_PLAYLIST_ID = '3t8rA0UFBU3FJ3ijqq7eBd';
const TRENDING_PLAYLIST_ID = '0Knatp2X7QhGt3d0EsJDhX';
const ESSENTIAL_PLAYLIST_ID = '1zRzXB4TZWBSQmnAdNBSGq';
const ZAMBIAN_CHARTS_PLAYLIST_ID = '66akVVFtLQuq3JaoBBxQwo';
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Gets an access token. If SPOTIFY_REFRESH_TOKEN is set (GitHub Secret),
// uses the user OAuth token which CAN read playlist tracks.
// Otherwise falls back to client_credentials (can only read artist data).
async function getAccessToken() {
    if (REFRESH_TOKEN) {
        // User token via refresh — can read playlist tracks
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: REFRESH_TOKEN
            })
        });
        const data = await response.json();
        if (data.access_token) {
            console.log('🔑 Using user OAuth token (playlist-read enabled).');
            return { token: data.access_token, canReadPlaylist: true };
        }
        console.warn('⚠️ Refresh token failed, falling back to client_credentials.');
    }

    // Client credentials fallback — cannot read user playlist tracks
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
        },
        body: 'grant_type=client_credentials'
    });
    const data = await response.json();
    console.log('🔑 Using client_credentials token (hardcoded artist list only).');
    return { token: data.access_token, canReadPlaylist: false };
}

// Reads all artist IDs directly from the Spotify playlist via the API.
// Only works when called with a user OAuth token (refresh token configured).
async function getPlaylistArtistIdsFromAPI(token) {
    console.log('📡 Reading artists from Spotify playlist via API...');
    const artistIds = new Set();

    // First page is embedded in the playlist object
    let url = `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}`;
    const firstRes = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
    const playlist = await firstRes.json();

    if (!playlist.tracks) {
        throw new Error('Playlist tracks unavailable — token may lack playlist-read scope.');
    }

    (playlist.tracks.items || []).forEach(item => {
        item.track?.artists?.forEach(a => a.id && artistIds.add(a.id));
    });

    // Paginate through remaining pages
    let nextUrl = playlist.tracks.next;
    while (nextUrl) {
        const res = await fetch(nextUrl, { headers: { 'Authorization': 'Bearer ' + token } });
        const page = await res.json();
        if (!page.items) break;
        page.items.forEach(item => {
            item.track?.artists?.forEach(a => a.id && artistIds.add(a.id));
        });
        nextUrl = page.next;
    }

    console.log(`✅ Found ${artistIds.size} unique artists in playlist.`);
    return [...artistIds];
}

async function getPlaylistTracksFromAPI(token, playlistId = PLAYLIST_ID, limit = 5) {
    console.log(`Reading ${limit} track(s) from Spotify playlist ${playlistId}...`);
    try {
        const tracks = [];
        let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&market=ZM`;

        while (url && tracks.length < limit) {
            const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
            if (!res.ok) {
                throw new Error(`Playlist tracks API failed: ${res.status} ${res.statusText}`);
            }

            const page = await res.json();
            for (const item of page.items || []) {
                const track = item.track;
                if (!track || track.is_local) continue;

                const album = track.album || {};
                const artists = (track.artists || []).map(a => a.name).filter(Boolean);
                tracks.push({
                    id: track.id,
                    name: track.name,
                    artist: artists.join(', '),
                    image: album.images?.[0]?.url || FALLBACK_IMAGE,
                    spotifyType: album.album_type === 'album' ? 'album' : 'track',
                    spotifyId: album.album_type === 'album' && album.id ? album.id : track.id
                });

                if (tracks.length >= limit) break;
            }

            url = page.next;
        }

        console.log(`Found ${tracks.length} Fresh Sonics playlist tracks.`);
        return tracks;
    } catch (e) {
        console.warn(`${e.message}. Falling back to Spotify embed data for playlist ${playlistId}.`);
        return getPlaylistTracksFromEmbed(token, playlistId, limit);
    }
}

async function getTracksFromPlaylistEmbedData(playlistId, limit) {
    const res = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) {
        throw new Error(`Spotify embed fetch failed: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) {
        throw new Error('Spotify embed data was not found.');
    }

    const data = JSON.parse(match[1]);
    const trackList = data.props?.pageProps?.state?.data?.entity?.trackList || [];
    return trackList
        .map(track => ({
            id: (track.uri || '').replace('spotify:track:', ''),
            name: track.title || '',
            artist: (track.subtitle || '').replace(/\u00a0/g, ' '),
            previewUrl: track.audioPreview?.url || ''
        }))
        .filter(track => track.id && track.id.length === 22 && track.name)
        .slice(0, limit);
}

async function getTrackOembed(id) {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${id}`)}`);
    if (!res.ok) return {};
    return res.json();
}

async function getPlaylistTracksFromEmbed(token, playlistId, limit = 5) {
    const tracks = await getTracksFromPlaylistEmbedData(playlistId, limit);
    return Promise.all(tracks.map(async track => {
        const oembed = await getTrackOembed(track.id);
        return {
            id: track.id,
            name: track.name,
            artist: track.artist,
            image: oembed.thumbnail_url || FALLBACK_IMAGE,
            spotifyType: 'track',
            spotifyId: track.id,
            previewUrl: track.previewUrl
        };
    }));
}

async function getZambianChartTracksFromAPI(token, limit = 5) {
    console.log(`Reading Zambian Charts from Spotify playlist ${ZAMBIAN_CHARTS_PLAYLIST_ID}...`);
    try {
        const tracks = [];
        let url = `https://api.spotify.com/v1/playlists/${ZAMBIAN_CHARTS_PLAYLIST_ID}/tracks?limit=50&market=ZM`;

        while (url && tracks.length < limit) {
            const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
            if (!res.ok) {
                throw new Error(`Zambian Charts playlist API failed: ${res.status} ${res.statusText}`);
            }

            const page = await res.json();
            for (const item of page.items || []) {
                const track = item.track;
                if (!track || track.is_local) continue;

                const album = track.album || {};
                const artists = (track.artists || []).filter(a => a?.name);
                let artistImage = album.images?.[0]?.url || FALLBACK_IMAGE;

                if (artists[0]?.id) {
                    try {
                        const artistRes = await fetch(`https://api.spotify.com/v1/artists/${artists[0].id}`, {
                            headers: { 'Authorization': 'Bearer ' + token }
                        });
                        if (artistRes.ok) {
                            const artistData = await artistRes.json();
                            artistImage = artistData.images?.[0]?.url || artistImage;
                        }
                    } catch (e) {
                        console.warn(`Could not fetch chart artist image for ${artists[0].name}: ${e.message}`);
                    }
                }

                tracks.push(chartTrackTemplate(track, tracks.length, artistImage));

                if (tracks.length >= limit) break;
            }

            url = page.next;
        }

        console.log(`Found ${tracks.length} Zambian Charts tracks.`);
        return tracks;
    } catch (e) {
        console.warn(`${e.message}. Falling back to Spotify embed data for Zambian Charts.`);
        const tracks = await getPlaylistTracksFromEmbed(token, ZAMBIAN_CHARTS_PLAYLIST_ID, limit);
        return tracks.map((track, index) => chartTrackFromEmbedTemplate(track, index));
    }
}

function chartTrackTemplate(track, index, artistImage) {
    const album = track.album || {};
    const artists = (track.artists || []).filter(a => a?.name);
    return {
        rank: String(index + 1).padStart(2, '0'),
        name: track.name,
        artist: artists.map(a => a.name).join(', '),
        image: album.images?.[0]?.url || FALLBACK_IMAGE,
        year: Number((album.release_date || '').slice(0, 4)) || new Date().getFullYear(),
        previewUrl: track.preview_url || '',
        plays: 'NEW',
        trend: 'new',
        artistImage,
        spotifyTrackId: track.id || '',
        trackUrl: track.external_urls?.spotify || ''
    };
}

function chartTrackFromEmbedTemplate(track, index) {
    return {
        rank: String(index + 1).padStart(2, '0'),
        name: track.name,
        artist: track.artist,
        image: track.image || FALLBACK_IMAGE,
        year: new Date().getFullYear(),
        previewUrl: track.previewUrl || '',
        plays: 'NEW',
        trend: 'new',
        artistImage: track.image || FALLBACK_IMAGE,
        spotifyTrackId: track.id || '',
        spotifyId: track.id || '',
        spotifyType: 'track',
        trackUrl: track.id ? `https://open.spotify.com/track/${track.id}` : ''
    };
}

async function readPlaylistTracksSafely(label, readFn) {
    try {
        return await readFn();
    } catch (e) {
        console.warn(`Could not sync ${label}: ${e.message}`);
        return [];
    }
}

const FRESH_SONICS_TAGS = ['LATEST DROP', 'FEATURED', 'NEW SINGLE', 'TRENDING', 'ESSENTIAL'];

function freshSonicsCardTemplate(track, index) {
    const featuredClass = index === 0 ? ' featured' : '';
    const type = escapeHtml(track.spotifyType || 'track');
    const id = escapeHtml(track.spotifyId || track.id);
    const name = escapeHtml(track.name);
    const artist = escapeHtml(track.artist);
    const image = escapeHtml(track.image || FALLBACK_IMAGE);
    const tag = escapeHtml(FRESH_SONICS_TAGS[index] || 'FEATURED');

    return `              <div class="sonics-card${featuredClass}" data-spotify-type="${type}" data-spotify-id="${id}" data-track-name="${name}" data-track-artist="${artist}">
                <div class="sonics-card-img">
                  <img src="${image}" alt="${artist} - ${name}" loading="lazy" />
                  <button class="sonics-play-btn" type="button" aria-label="Play ${name} by ${artist} on Spotify">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.14v13.72L18.79 12 8 5.14z"/></svg>
                  </button>
                </div>
                <div class="sonics-card-info">
                  <div class="sonics-card-tag">${tag}</div>
                  <div class="sonics-card-name">${name}</div>
                  <div class="sonics-card-sub">${artist}</div>
                </div>
              </div>`;
}

function updateFreshSonicsHtml(html, tracks) {
    if (!tracks.length) return html;

    const cardsHtml = tracks.map(freshSonicsCardTemplate).join('\n\n');
    const nextHtml = html.replace(
        /(<div class="sonics-grid fade-up">)[\s\S]*?(\n\s*<\/div>\s*\n\s*<\/div>\s*\n\s*<\/div>\s*\n\s*<!--)/,
        `$1\n${cardsHtml}\n            $2`
    );

    if (nextHtml === html) {
        throw new Error('Could not find Fresh Sonics grid in index.html.');
    }

    return nextHtml;
}

function updateSpotifyChartsJs(js, tracks) {
    if (!tracks.length) return js;

    const chartJson = JSON.stringify(tracks, null, 8)
        .split('\n')
        .map((line, index) => index === 0 ? line : `    ${line}`)
        .join('\n');

    const functionIndex = js.indexOf('async function fetchSpotifyCharts()');
    const returnIndex = js.indexOf('return', functionIndex);
    const arrayStart = js.indexOf('[', returnIndex);
    if (functionIndex === -1 || returnIndex === -1 || arrayStart === -1) {
        throw new Error('Could not find fetchSpotifyCharts array in main.js.');
    }

    let depth = 0;
    let inString = false;
    let stringQuote = '';
    let escaped = false;
    let arrayEnd = -1;

    for (let i = arrayStart; i < js.length; i += 1) {
        const char = js[i];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === stringQuote) {
                inString = false;
            }
            continue;
        }

        if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringQuote = char;
            continue;
        }

        if (char === '[') depth += 1;
        if (char === ']') {
            depth -= 1;
            if (depth === 0) {
                arrayEnd = i;
                break;
            }
        }
    }

    if (arrayEnd === -1) {
        throw new Error('Could not find the end of fetchSpotifyCharts array in main.js.');
    }

    return `${js.slice(0, arrayStart)}${chartJson}${js.slice(arrayEnd + 1)}`;
}

async function getArtistBio(artistName) {
    // 1. Wikipedia — direct title lookup with redirects
    try {
        const directUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(artistName)}&format=json`;
        const res = await fetch(directUrl);
        const data = await res.json();
        const pages = data.query?.pages;
        if (pages) {
            const page = Object.values(pages)[0];
            if (page && page.extract && page.pageid !== -1 &&
                !page.extract.toLowerCase().includes('may refer to:') &&
                !page.extract.toLowerCase().includes('disambiguation')) {
                const paragraphs = page.extract.split('\n').filter(p => p.trim().length > 80);
                if (paragraphs.length > 0) return paragraphs.slice(0, 2).join('\n\n');
            }
        }
    } catch (e) {
        console.warn(`⚠️ Wikipedia direct lookup failed for ${artistName}`);
    }

    // 2. Wikipedia — search fallback (catches stage name variations)
    try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(artistName + ' musician singer')}&srlimit=1&format=json`;
        const sRes = await fetch(searchUrl);
        const sData = await sRes.json();
        const hits = sData.query?.search;
        if (hits && hits.length > 0) {
            const title = hits[0].title;
            const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}&format=json`;
            const pRes = await fetch(pageUrl);
            const pData = await pRes.json();
            const pages = pData.query?.pages;
            if (pages) {
                const page = Object.values(pages)[0];
                if (page && page.extract && page.pageid !== -1 &&
                    !page.extract.toLowerCase().includes('may refer to:') &&
                    !page.extract.toLowerCase().includes('disambiguation')) {
                    const paragraphs = page.extract.split('\n').filter(p => p.trim().length > 80);
                    if (paragraphs.length > 0) return paragraphs.slice(0, 2).join('\n\n');
                }
            }
        }
    } catch (e) {
        console.warn(`⚠️ Wikipedia search failed for ${artistName}`);
    }

    // 3. Last.fm fallback
    try {
        const res = await fetch(`https://www.last.fm/music/${encodeURIComponent(artistName)}/+wiki`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TraverceBot/1.0)' }
        });
        if (res.ok) {
            const html = await res.text();
            const match = html.match(/<div class="wiki-content">([\s\S]*?)<\/div>/);
            if (match) {
                const text = match[1].replace(/<[^>]+>/g, '').trim();
                const paragraphs = text.split('\n').filter(p => p.trim().length > 60);
                if (paragraphs.length > 0) return paragraphs.slice(0, 2).join('\n\n');
            }
        }
    } catch (e) {
        console.warn(`⚠️ Last.fm failed for ${artistName}`);
    }

    return '';
}


async function getArtistData(token, id) {
    // Attempt multiple markets if ZM fails or returns empty
    const markets = ['ZM', 'US', 'GB'];
    let artist, albumsRaw, topTracks;

    const artistRes = await fetch(`https://api.spotify.com/v1/artists/${id}`, { headers: { 'Authorization': 'Bearer ' + token } });
    if (!artistRes.ok) throw new Error(`Artist API failed: ${artistRes.status} ${artistRes.statusText}`);
    artist = await artistRes.json();

    // Try to get top tracks from various markets to ensure we get a stable image
    for (const m of markets) {
        const topTracksRes = await fetch(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=${m}`, { headers: { 'Authorization': 'Bearer ' + token } });
        if (!topTracksRes.ok) continue;
        topTracks = await topTracksRes.json();
        if (topTracks.tracks && topTracks.tracks.length > 0) break;
    }

    const albumsRes = await fetch(`https://api.spotify.com/v1/artists/${id}/albums?include_groups=album,single`, { headers: { 'Authorization': 'Bearer ' + token } });
    if (!albumsRes.ok) throw new Error(`Albums API failed: ${albumsRes.status} ${albumsRes.statusText}`);
    albumsRaw = await albumsRes.json();

    let releaseCount = albumsRaw.total || 0;
    const seenNames = new Set();
    const releases = (albumsRaw.items || []).filter(a => {
        const key = a.name.toLowerCase().trim();
        if (seenNames.has(key)) return false;
        seenNames.add(key);
        return true;
    }).slice(0, 6);

    // Fallback scrape for popularity/followers if API is omitting them
    let followers = artist.followers?.total || 0;
    let popularity = artist.popularity || 0;
    
    if (followers === 0 || popularity === 0) {
        try {
            const htmlRes = await fetch(`https://open.spotify.com/artist/${id}`);
            const html = await htmlRes.text();
            
            const mlMatch = html.match(/([\d,]+)\s*monthly listeners/i);
            const folMatch = html.match(/"followers":\s*(?:{\s*"total":\s*)?(\d+)/i) || html.match(/([\d,]+)\s*followers/i);
            
            if (mlMatch) {
                const ml = parseInt(mlMatch[1].replace(/,/g, ''), 10);
                if (popularity === 0) popularity = Math.min(100, Math.floor(ml / 5000));
                if (followers === 0) followers = Math.floor(ml * 0.4); 
            }
            if (folMatch) {
                followers = parseInt(folMatch[1].replace(/,/g, ''), 10);
            }
        } catch(e) {}
    }

    // Stable Portrait Logic
    let portraitUrl = artist.images?.[0]?.url;
    // Prefer Top Track Album Cover (ab67616d...)
    if (topTracks && topTracks.tracks && topTracks.tracks.length > 0) {
        const trackImg = topTracks.tracks[0].album.images?.[0]?.url;
        if (trackImg) portraitUrl = trackImg;
    }
    
    // If STILL undefined or empty, use fallback
    if (!portraitUrl || portraitUrl === '') {
        portraitUrl = FALLBACK_IMAGE;
    }

    const bio = await getArtistBio(artist.name);

    return {
        id: artist.id,
        name: artist.name,
        slug: artist.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        genres: (artist.genres || []).slice(0, 3).map(g => g.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')),
        followers: followers,
        popularity: popularity,
        portrait: portraitUrl,
        releases: releases.map(r => ({
            name: r.name,
            year: r.release_date.split('-')[0],
            image: r.images?.[0]?.url || FALLBACK_IMAGE,
            type: r.album_type
        })),
        releaseCount: releaseCount,
        bio: bio
    };
}

function formatStat(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

const ARTIST_CARD_TEMPLATE = (artist) => `
        <a class="artist-card fade-up" href="#${artist.slug}" data-tab="${artist.slug}" aria-label="Open ${artist.name} profile">
          <div class="artist-card-media">
            <img src="${artist.portrait}" alt="${artist.name} portrait" loading="lazy" />
            <span class="artist-card-badge">${artist.popularity > 65 ? 'Hot' : 'Featured'}</span>
          </div>
          <div class="artist-card-body">
            <div class="artist-card-name">${artist.name}</div>
            <div class="artist-card-meta">${artist.genres.length > 0 ? artist.genres.join(' &middot; ') : 'Rising Artist'}</div>
            <div class="artist-card-action">Open profile</div>
          </div>
        </a>`;

const ARTIST_PAGE_TEMPLATE = (artist) => `
    <!-- Artist Page: ${artist.name} -->
    <div class="page-view" id="page-${artist.slug}" data-page="${artist.slug}">
      <article class="artist-profile-card" aria-label="${artist.name} profile card">
        <section class="artist-hero" aria-label="${artist.name} profile">
          <div class="artist-hero-bg">
            <img src="${artist.portrait}" alt="${artist.name} portrait" loading="eager" />
          </div>
          <div class="artist-hero-overlay"></div>
          <div class="artist-hero-content container">
            <div class="artist-breadcrumb">
              <span>Artist Directory</span>
              <span class="breadcrumb-sep">›</span>
              <span style="color:var(--accent)">${artist.name}</span>
            </div>
            <div class="artist-meta-tags">
              ${artist.genres.length > 0 ? artist.genres.map(g => `<span class="artist-genre-tag">${g}</span>`).join('\n              ') : '<span class="artist-genre-tag">Traverce Choice</span>'}
            </div>
            <h1 class="artist-name">${artist.name}</h1>
            <div class="artist-stats">
              <div class="artist-stat">
                <span class="stat-num">${formatStat(artist.popularity * 1250)}</span>
                <span class="stat-label">Power Score</span>
              </div>
              <div class="artist-stat">
                <span class="stat-num">${artist.releaseCount}</span>
                <span class="stat-label">Releases</span>
              </div>
              <div class="artist-stat">
                <span class="stat-num">${formatStat(artist.followers)}</span>
                <span class="stat-label">Followers</span>
              </div>
              <div class="artist-stat">
                <span class="stat-num">#${Math.max(1, 101 - artist.popularity)}</span>
                <span class="stat-label">Global Tier</span>
              </div>
            </div>
            <div class="artist-hero-ctas">
              <a class="btn-ghost" href="#artist">Back to artists</a>
              <button class="btn-primary" id="${artist.slug}-follow-btn" onclick="this.innerText='Following'">+ Follow</button>
              <button class="btn-ghost" id="${artist.slug}-play-all-btn">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 1l9 5-9 5V1z" fill="currentColor"/></svg>
                Listen Now
              </button>
            </div>
          </div>
        </section>

        <div class="artist-main container">
          <div class="artist-body-grid">
            <div class="artist-bio-col">
              <div class="artist-section-label">About</div>
              ${artist.bio ? artist.bio.split('\n\n').map(p => `<p class="artist-bio">${p}</p>`).join('\n              ') : `<p class="artist-bio">Biography currently unavailable.</p>`}
              <div class="artist-social-row">
                <a href="https://open.spotify.com/artist/${artist.id}" target="_blank" class="social-btn" title="Spotify Profile">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.11 17.587c-.247.407-.78.533-1.187.287-2.614-1.6-5.903-1.96-9.782-1.07-.463.107-.927-.187-1.033-.653-.107-.463.187-.927.653-1.033 4.25-.97 7.893-.563 10.873 1.263.407.246.533.78.287 1.186v.02zm1.36-3.23c-.313.513-.98.673-1.493.36-2.993-1.84-7.553-2.373-11.087-1.293-.58.173-1.187-.147-1.36-.727-.173-.58.147-1.187.727-1.36 4.027-1.22 9.047-.633 12.527 1.507.513.313.673.98.36 1.493v.013zm.127-3.393c-3.587-2.127-9.513-2.327-12.953-1.287-.553.167-1.127-.16-1.293-.713-.167-.553.16-1.127.713-1.293 3.967-1.2 10.513-1 14.613 1.433.493.293.653.94.36 1.433-.293.493-.94.653-1.433.36z"/></svg>
                </a>
              </div>
            </div>

            <div class="artist-player-col">
              <div class="artist-player">
                <iframe style="border-radius:12px" src="https://open.spotify.com/embed/artist/${artist.id}?utm_source=generator&theme=0" width="100%" height="352" frameborder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
              </div>
            </div>
          </div>

          <div class="artist-releases">
            <div class="section-header">
              <h2 class="section-title">Latest <span>Releases</span></h2>
              <a href="https://open.spotify.com/artist/${artist.id}" target="_blank" class="view-all">Full Discography</a>
            </div>
            <div class="releases-grid">
              ${artist.releases.map((release, i) => `
              <article class="release-card fade-up">
                <div class="release-img"><img src="${release.image}" alt="${release.name}" loading="lazy"/></div>
                <div class="release-tag">${release.type.charAt(0).toUpperCase() + release.type.slice(1)} &middot; ${release.year}</div>
                <div class="release-name">${release.name}</div>
                <div class="release-tracks">Studio Content</div>
              </article>`).join('')}
            </div>
          </div>

          ${artist.bio ? `
          <div class="artist-lyrics fade-up" id="${artist.slug}-notes">
            <div class="lyrics-header">
              <h2 class="section-title">Career <span>Narrative</span></h2>
              <button class="lyrics-toggle btn-ghost" id="${artist.slug}Toggle">Read More</button>
            </div>
            <div class="lyrics-body" id="${artist.slug}Body">
              <div class="lyrics-track-label">${artist.name} &mdash; Official Profile</div>
              <div class="lyrics-text">
                <p>${artist.bio.split('\n\n')[0]}</p>
                <p>Explore their catalog on Spotify for a deeper dive into their artistic journey and unique sonic palette.</p>
              </div>
            </div>
          </div>` : ''}
        </div>
      </article>
    </div>`;

async function sync() {
    const auth = await getAccessToken();
    const token = auth.token;
    let zambianChartTracks = [];
    if (auth.canReadPlaylist) {
        zambianChartTracks = await readPlaylistTracksSafely('Zambian Charts playlist', () => getZambianChartTracksFromAPI(token, 5));
    } else {
        console.warn('No SPOTIFY_REFRESH_TOKEN configured, so Zambian Charts will keep its current static data.');
    }

    if (process.argv.includes('--playlists-only')) {
        let js = fs.readFileSync(JS_FILE, 'utf8');

        if (zambianChartTracks.length === 5) {
            js = updateSpotifyChartsJs(js, zambianChartTracks);
            console.log('Zambian Charts updated from playlist.');
        } else {
            console.warn(`Zambian Charts was not updated because only ${zambianChartTracks.length}/5 playlist tracks were available.`);
        }

        fs.writeFileSync(JS_FILE, js);
        console.log('\nPlaylist sync complete.');
        return;
    }

    console.log('🔄 Starting Automated Artist Sync...');
    
    // 1. Use hardcoded ARTIST_IDS (Spotify client_credentials cannot access user playlist tracks)
    let artistIds = ARTIST_IDS.filter(id => id && id.trim().length === 22);
    if (auth.canReadPlaylist) {
        try {
            artistIds = await getPlaylistArtistIdsFromAPI(token);
        } catch (e) {
            console.warn(`Could not read artist IDs from playlist, using hardcoded list: ${e.message}`);
        }
    }
    console.log(`📋 Syncing ${artistIds.length} artists from hardcoded list.`);
    if (artistIds.length === 0) {
        console.error('❌ ARTIST_IDS list is empty — add Spotify artist IDs to sync_artists.js');
        process.exit(1);
    }

    // 2. Get Data
    const artists = [];

    for (const id of artistIds) {
        console.log(`📡 Syncing metadata for: ${id}`);
        try {
            const data = await getArtistData(token, id);
            if (data.releaseCount === 0 && data.followers === 0 && data.popularity === 0) {
                console.warn(`⚠️ Skip artist ${data.name || id}: Profile is completely blank (no data).`);
            } else {
                artists.push(data);
            }
        } catch (e) {
            console.warn(`⚠️ Skip artist ${id}:`, e.message);
        }
        // Delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (artists.length === 0) {
        console.error('❌ Failed to fetch data for any artists. Aborting sync to prevent wiping out the site.');
        process.exit(1);
    }

    // 3. Sort
    artists.sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name));

    // 4. Update Files
    let html = fs.readFileSync(HTML_FILE, 'utf8');
    const gridHtml = artists.map(a => ARTIST_CARD_TEMPLATE(a)).join('\n');
    const pagesHtml = artists.map(a => ARTIST_PAGE_TEMPLATE(a)).join('\n');

    html = html.replace(/(<!-- ARTIST_GRID_START -->)[\s\S]*?(<!-- ARTIST_GRID_END -->)/, `$1\n        ${gridHtml.trim()}\n        $2`);
    html = html.replace(/(<!-- ARTIST_PAGES_START -->)[\s\S]*?(<!-- ARTIST_PAGES_END -->)/, `$1\n    ${pagesHtml.trim()}\n    $2`);
    fs.writeFileSync(HTML_FILE, html);

    let js = fs.readFileSync(JS_FILE, 'utf8');
    const slugList = artists.map(a => `'${a.slug}'`).join(', ');
    const toggleList = artists.map(a => `    ['${a.slug}Toggle', '${a.slug}Body'],`).join('\n');

    if (zambianChartTracks.length === 5) {
        js = updateSpotifyChartsJs(js, zambianChartTracks);
    } else if (zambianChartTracks.length > 0) {
        console.warn(`Zambian Charts was not updated because only ${zambianChartTracks.length}/5 playlist tracks were available.`);
    }
    js = js.replace(/(\/\* ARTIST_TABS_START \*\/)[\s\S]*?(\/\* ARTIST_TABS_END \*\/)/, `$1\n      ${slugList},\n      $2`);
    js = js.replace(/(\/\* ARTIST_TOGGLES_START \*\/)[\s\S]*?(\/\* ARTIST_TOGGLES_END \*\/)/, `$1\n${toggleList}\n    $2`);
    fs.writeFileSync(JS_FILE, js);

    console.log(`\n✨ Sync Complete! ${artists.length} artists updated.`);
}

sync().catch(err => {
    console.error('❌ Automation failed:', err);
    process.exit(1);
});
