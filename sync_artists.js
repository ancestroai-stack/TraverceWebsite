import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const PLAYLIST_ID = '7nC2I08ZK98QLzR3Ov3HvG';
const CLIENT_ID = process.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_SPOTIFY_CLIENT_SECRET;

const HTML_FILE = 'index.html';
const JS_FILE = 'main.js';

// Default BRAND image for fallback
const FALLBACK_IMAGE = 'https://i.scdn.co/image/ab67616d0000b273b7ed663c9b74052ca5a8a183'; // Soulful Start Cover

async function getAccessToken() {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
        },
        body: 'grant_type=client_credentials'
    });
    const data = await response.json();
    return data.access_token;
}

async function getArtistBio(artistName) {
    // 1. Try Wikipedia
    try {
        const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(artistName)}&format=json`);
        const data = await res.json();
        const pages = data.query?.pages;
        if (pages) {
            const page = Object.values(pages)[0];
            if (page && page.extract && !page.extract.includes("may refer to:")) {
                return page.extract.split('\n').filter(p => p.trim() !== '').slice(0, 2).join('\n\n');
            }
        }
    } catch (e) {
        console.warn(`⚠️ Failed to fetch Wikipedia bio for ${artistName}`);
    }

    // 2. Fallback to Last.fm
    try {
        const res = await fetch(`https://www.last.fm/music/${encodeURIComponent(artistName)}/+wiki`);
        if (res.ok) {
            const html = await res.text();
            const match = html.match(/<div class="wiki-content">([\s\S]*?)<\/div>/);
            if (match) {
                const text = match[1].replace(/<[^>]+>/g, '').trim();
                return text.split('\n').filter(p => p.trim() !== '').slice(0, 2).join('\n\n');
            }
        }
    } catch (e) {
        console.warn(`⚠️ Failed to fetch Last.fm bio for ${artistName}`);
    }

    return '';
}

async function getPlaylistArtistIds() {
    console.log('📡 Fetching playlist page to extract artist IDs...');
    try {
        const response = await fetch(`https://open.spotify.com/playlist/${PLAYLIST_ID}`);
        const html = await response.text();
        
        const artistRegex = /\/artist\/([a-zA-Z0-9]{22})/g;
        const ids = new Set();
        let match;
        while ((match = artistRegex.exec(html)) !== null) {
            ids.add(match[1]);
        }
        
        const artistIds = Array.from(ids);
        console.log(`✅ Found ${artistIds.length} unique artists in playlist.`);
        return artistIds;
    } catch (error) {
        console.error('❌ Error scraping playlist:', error);
        throw error;
    }
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
    console.log('🔄 Starting Automated Artist Sync...');
    
    // 1. Get Artists from Playlist
    const artistIds = await getPlaylistArtistIds();
    if (artistIds.length === 0) {
        console.error('❌ No artists found to sync.');
        return;
    }

    // 2. Get Data
    const token = await getAccessToken();
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

    js = js.replace(/(\/\* ARTIST_TABS_START \*\/)[\s\S]*?(\/\* ARTIST_TABS_END \*\/)/, `$1\n      ${slugList},\n      $2`);
    js = js.replace(/(\/\* ARTIST_TOGGLES_START \*\/)[\s\S]*?(\/\* ARTIST_TOGGLES_END \*\/)/, `$1\n${toggleList}\n    $2`);
    fs.writeFileSync(JS_FILE, js);

    console.log(`\n✨ Sync Complete! ${artists.length} artists updated.`);
}

sync().catch(err => {
    console.error('❌ Automation failed:', err);
    process.exit(1);
});
