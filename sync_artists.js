import fs from 'fs';
import dotenv from 'dotenv';
import { ARTISTS } from './artists_db.js';

dotenv.config();

// ============================================================
//  TRAVERCE — sync_artists.js (v2)
//  ID-based artist sync. Uses artists_db.js as source of truth.
//  NEVER searches Spotify by name — only uses spotify_artist_id.
// ============================================================

const CLIENT_ID     = process.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_SPOTIFY_CLIENT_SECRET;

// Cloudflare D1 API config (optional — set in .env to enable cloud sync)
const TRAVERCE_API_URL   = process.env.TRAVERCE_API_URL;   // e.g. https://traverce.pages.dev
const TRAVERCE_ADMIN_KEY = process.env.TRAVERCE_ADMIN_KEY; // matches Pages env var

const HTML_FILE = 'index.html';
const JS_FILE   = 'main.js';
const DB_FILE   = 'artists_db.js';

// Default fallback image
const FALLBACK_IMAGE = 'https://i.scdn.co/image/ab67616d0000b273b7ed663c9b74052ca5a8a183';


// ── TOKEN ────────────────────────────────────────────────────
async function getAccessToken() {
  const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

  if (REFRESH_TOKEN) {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: REFRESH_TOKEN }),
    });
    const data = await res.json();
    if (data.access_token) {
      console.log('🔑 Using user OAuth token (refresh).');
      return { token: data.access_token };
    }
    console.warn('⚠️  Refresh token failed, falling back to client_credentials.');
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Token request failed: ${JSON.stringify(data)}`);
  }
  console.log('🔑 Using client_credentials token.');
  return { token: data.access_token };
}


// ── BIO SCRAPING (fallback for artists without bio_manual) ───
async function getArtistBio(artistName) {
  // 1. Wikipedia — direct lookup
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(artistName)}&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query?.pages;
    if (pages) {
      const page = Object.values(pages)[0];
      if (page && page.extract && page.pageid !== -1 &&
          !page.extract.toLowerCase().includes('may refer to:') &&
          !page.extract.toLowerCase().includes('disambiguation')) {
        const paras = page.extract.split('\n').filter(p => p.trim().length > 80);
        if (paras.length > 0) return paras.slice(0, 2).join('\n\n');
      }
    }
  } catch { console.warn(`⚠️  Wikipedia direct lookup failed for ${artistName}`); }

  // 2. Wikipedia — search fallback
  try {
    const sUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(artistName + ' musician singer')}&srlimit=1&format=json`;
    const sRes = await fetch(sUrl);
    const sData = await sRes.json();
    const hits = sData.query?.search;
    if (hits && hits.length > 0) {
      const title = hits[0].title;
      const pUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}&format=json`;
      const pRes = await fetch(pUrl);
      const pData = await pRes.json();
      const pages = pData.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0];
        if (page && page.extract && page.pageid !== -1 &&
            !page.extract.toLowerCase().includes('may refer to:') &&
            !page.extract.toLowerCase().includes('disambiguation')) {
          const paras = page.extract.split('\n').filter(p => p.trim().length > 80);
          if (paras.length > 0) return paras.slice(0, 2).join('\n\n');
        }
      }
    }
  } catch { console.warn(`⚠️  Wikipedia search failed for ${artistName}`); }

  // 3. Last.fm fallback
  try {
    const res = await fetch(`https://www.last.fm/music/${encodeURIComponent(artistName)}/+wiki`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TraverceBot/1.0)' },
    });
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/<div class="wiki-content">([\s\S]*?)<\/div>/);
      if (match) {
        const text = match[1].replace(/<[^>]+>/g, '').trim();
        const paras = text.split('\n').filter(p => p.trim().length > 60);
        if (paras.length > 0) return paras.slice(0, 2).join('\n\n');
      }
    }
  } catch { console.warn(`⚠️  Last.fm failed for ${artistName}`); }

  return '';
}


// ── SPOTIFY DATA FETCH (by ID only) ─────────────────────────
async function getSpotifyData(token, artistId) {
  const markets = ['ZM', 'US', 'GB'];

  // Artist profile
  const artistRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  if (!artistRes.ok) throw new Error(`Artist API failed: ${artistRes.status} ${artistRes.statusText}`);
  const artist = await artistRes.json();

  // Top tracks (try multiple markets)
  let topTracks = null;
  for (const m of markets) {
    const ttRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${m}`, {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    if (!ttRes.ok) continue;
    topTracks = await ttRes.json();
    if (topTracks.tracks && topTracks.tracks.length > 0) break;
  }

  // Albums / singles — non-blocking: if it fails, we return empty releases
  // Some Spotify app tiers restrict this endpoint. A 429 means rate-limited.
  let albumsRaw = { items: [], total: 0 };
  try {
    const albumsRes = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?limit=10`,
      { headers: { 'Authorization': 'Bearer ' + token } }
    );
    if (albumsRes.ok) {
      albumsRaw = await albumsRes.json();
    } else {
      const errBody = await albumsRes.text();
      console.warn(`   ℹ️ Albums unavailable for ${artistId}: ${albumsRes.status} ${errBody.slice(0, 80)}`);
    }
  } catch (e) {
    console.warn(`   ℹ️ Albums fetch failed for ${artistId}: ${e.message}`);
  }

  // De-duplicate by name
  const seenNames = new Set();
  const releases = (albumsRaw.items || []).filter(a => {
    const key = a.name.toLowerCase().trim();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  }).slice(0, 6);

  // Followers & popularity (scrape fallback if zero)
  let followers  = artist.followers?.total || 0;
  let popularity = artist.popularity || 0;
  if (followers === 0 || popularity === 0) {
    try {
      const htmlRes = await fetch(`https://open.spotify.com/artist/${artistId}`);
      const html    = await htmlRes.text();
      const mlMatch = html.match(/([\d,]+)\s*monthly listeners/i);
      const folMatch = html.match(/"followers":\s*(?:{\s*"total":\s*)?(\d+)/i) ||
                       html.match(/([\d,]+)\s*followers/i);
      if (mlMatch) {
        const ml = parseInt(mlMatch[1].replace(/,/g, ''), 10);
        if (popularity === 0) popularity = Math.min(100, Math.floor(ml / 5000));
        if (followers === 0)  followers  = Math.floor(ml * 0.4);
      }
      if (folMatch) followers = parseInt(folMatch[1].replace(/,/g, ''), 10);
    } catch { /* silent */ }
  }

  // Portrait: prefer top-track album cover, then artist image, then fallback
  let portrait = artist.images?.[0]?.url || FALLBACK_IMAGE;
  if (topTracks?.tracks?.length > 0) {
    const trackImg = topTracks.tracks[0].album.images?.[0]?.url;
    if (trackImg) portrait = trackImg;
  }
  if (!portrait) portrait = FALLBACK_IMAGE;

  return {
    id:          artist.id,
    name:        artist.name,
    genres:      (artist.genres || []).slice(0, 3).map(g =>
                   g.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')),
    followers,
    popularity,
    portrait,
    spotify_url: `https://open.spotify.com/artist/${artist.id}`,
    releases: releases.map(r => ({
      name:  r.name,
      year:  r.release_date.split('-')[0],
      image: r.images?.[0]?.url || FALLBACK_IMAGE,
      type:  r.album_type,
    })),
    releaseCount: albumsRaw.total || 0,
  };
}


// ── FORMATTING ───────────────────────────────────────────────
function formatStat(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K';
  return String(num);
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
              ${artist.genres.length > 0
                ? artist.genres.map(g => `<span class="artist-genre-tag">${g}</span>`).join('\n              ')
                : '<span class="artist-genre-tag">Traverce Choice</span>'}
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
              ${artist.bio
                ? artist.bio.split('\n\n').map(p => `<p class="artist-bio">${p}</p>`).join('\n              ')
                : `<p class="artist-bio">Biography currently unavailable.</p>`}
              <div class="artist-social-row">
                <a href="https://open.spotify.com/artist/${artist.spotify_artist_id}" target="_blank" class="social-btn" title="Spotify Profile">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.11 17.587c-.247.407-.78.533-1.187.287-2.614-1.6-5.903-1.96-9.782-1.07-.463.107-.927-.187-1.033-.653-.107-.463.187-.927.653-1.033 4.25-.97 7.893-.563 10.873 1.263.407.246.533.78.287 1.186v.02zm1.36-3.23c-.313.513-.98.673-1.493.36-2.993-1.84-7.553-2.373-11.087-1.293-.58.173-1.187-.147-1.36-.727-.173-.58.147-1.187.727-1.36 4.027-1.22 9.047-.633 12.527 1.507.513.313.673.98.36 1.493v.013zm.127-3.393c-3.587-2.127-9.513-2.327-12.953-1.287-.553.167-1.127-.16-1.293-.713-.167-.553.16-1.127.713-1.293 3.967-1.2 10.513-1 14.613 1.433.493.293.653.94.36 1.433-.293.493-.94.653-1.433.36z"/></svg>
                </a>
              </div>
            </div>

            <div class="artist-player-col">
              <div class="artist-player">
                <iframe style="border-radius:12px" data-src="https://open.spotify.com/embed/artist/${artist.spotify_artist_id}?utm_source=generator&theme=0" width="100%" height="352" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
              </div>
            </div>
          </div>

          <div class="artist-releases">
            <div class="section-header">
              <h2 class="section-title">Latest <span>Releases</span></h2>
              <a href="https://open.spotify.com/artist/${artist.spotify_artist_id}" target="_blank" class="view-all">Full Discography</a>
            </div>
            <div class="releases-grid">
              ${artist.releases.map((release) => `
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


// ── WRITE UPDATED artists_db.js ──────────────────────────────
function writeUpdatedDB(updatedArtists) {
  const header = `/**
 * TRAVERCE — ARTISTS DATABASE (artists_db.js)
 * Auto-updated by sync_artists.js on ${new Date().toISOString()}
 *
 * RULES:
 *  - spotify_artist_id is the PRIMARY KEY. Never change it once set.
 *  - bio_manual overrides Spotify bio. Edit via Admin Portal or directly here.
 *  - is_verified: true = synced. false = skipped, needs Admin Portal verification.
 *  - Fields below "Synced from Spotify" are overwritten on each sync — do not edit.
 */

export const ARTISTS = `;

  const content = header + JSON.stringify(updatedArtists, null, 2) + ';\n';
  fs.writeFileSync(DB_FILE, content, 'utf8');
  console.log(`💾 artists_db.js updated with ${updatedArtists.length} artist records.`);
}


// ── MAIN SYNC ────────────────────────────────────────────────
async function sync() {
  console.log('🔄 Starting Traverce Artist Sync (v2 — ID-based)...');

  // Validate credentials
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing Spotify credentials. Check your .env file.');
    process.exit(1);
  }

  // Separate verified from unverified
  const verifiedArtists   = ARTISTS.filter(a => a.is_verified && a.spotify_artist_id);
  const unverifiedArtists = ARTISTS.filter(a => !a.is_verified || !a.spotify_artist_id);

  console.log(`📋 ${verifiedArtists.length} verified artists to sync.`);
  if (unverifiedArtists.length > 0) {
    console.log(`⚠️  ${unverifiedArtists.length} artists need verification in Admin Portal:`);
    unverifiedArtists.forEach(a => console.log(`   → ${a.name} (${a.spotify_artist_id || 'no ID'})`));
  }

  if (verifiedArtists.length === 0) {
    console.error('❌ No verified artists found. Add at least one verified artist to artists_db.js.');
    process.exit(1);
  }

  const { token } = await getAccessToken();
  const syncedArtists  = [];
  const updatedDBArray = [...ARTISTS]; // preserve all records including unverified

  for (const artistRecord of verifiedArtists) {
    console.log(`📡 Syncing: ${artistRecord.name} (${artistRecord.spotify_artist_id})`);
    try {
      const spotifyData = await getSpotifyData(token, artistRecord.spotify_artist_id);

      // Bio priority: bio_manual > Wikipedia/Last.fm scrape
      const bio = artistRecord.bio_manual && artistRecord.bio_manual.trim()
        ? artistRecord.bio_manual
        : await getArtistBio(spotifyData.name);

      const synced = {
        ...artistRecord,
        // Update synced fields from Spotify
        name:         spotifyData.name,      // keep Spotify's canonical name
        spotify_url:  spotifyData.spotify_url,
        genres:       spotifyData.genres,
        followers:    spotifyData.followers,
        popularity:   spotifyData.popularity,
        portrait:     spotifyData.portrait,
        releases:     spotifyData.releases,
        releaseCount: spotifyData.releaseCount,
        last_synced_at: new Date().toISOString(),
        // Preserve editorial fields (never overwrite)
        bio_manual:   artistRecord.bio_manual,
        is_verified:  artistRecord.is_verified,
        bio,
      };

      if (synced.releaseCount === 0 && synced.followers === 0 && synced.popularity === 0) {
        console.warn(`⚠️  ${synced.name}: Profile appears blank. Skipping to avoid overwriting.`);
        continue;
      }

      syncedArtists.push(synced);

      // Update this artist's record in the full DB array
      const idx = updatedDBArray.findIndex(a => a.spotify_artist_id === artistRecord.spotify_artist_id);
      if (idx !== -1) updatedDBArray[idx] = synced;

    } catch (e) {
      console.warn(`⚠️  Skip ${artistRecord.name}: ${e.message}`);
    }

    // Rate limit pause
    await new Promise(r => setTimeout(r, 500));
  }

  if (syncedArtists.length === 0) {
    console.error('❌ Failed to sync any artists. Aborting to protect existing site data.');
    process.exit(1);
  }

  // Sort: by popularity desc, then name asc
  syncedArtists.sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name));

  // ── Update index.html ──────────────────────────────────────
  let html = fs.readFileSync(HTML_FILE, 'utf8');

  const gridHtml  = syncedArtists.map(a => ARTIST_CARD_TEMPLATE(a)).join('\n');
  const pagesHtml = syncedArtists.map(a => ARTIST_PAGE_TEMPLATE(a)).join('\n');

  html = html.replace(
    /(<!-- ARTIST_GRID_START -->)[\s\S]*?(<!-- ARTIST_GRID_END -->)/,
    `$1\n        ${gridHtml.trim()}\n        $2`
  );
  html = html.replace(
    /(<!-- ARTIST_PAGES_START -->)[\s\S]*?(<!-- ARTIST_PAGES_END -->)/,
    `$1\n    ${pagesHtml.trim()}\n    $2`
  );
  fs.writeFileSync(HTML_FILE, html);

  // ── Update main.js ─────────────────────────────────────────
  let js = fs.readFileSync(JS_FILE, 'utf8');

  const slugList   = syncedArtists.map(a => `'${a.slug}'`).join(', ');
  const toggleList = syncedArtists.map(a => `    ['${a.slug}Toggle', '${a.slug}Body'],`).join('\n');

  js = js.replace(
    /(\/\* ARTIST_TABS_START \*\/)[\s\S]*?(\/\* ARTIST_TABS_END \*\/)/,
    `$1\n      ${slugList},\n      $2`
  );
  js = js.replace(
    /(\/\* ARTIST_TOGGLES_START \*\/)[\s\S]*?(\/\* ARTIST_TOGGLES_END \*\/)/,
    `$1\n${toggleList}\n    $2`
  );
  fs.writeFileSync(JS_FILE, js);

  // ── Write updated artists_db.js ────────────────────────────
  writeUpdatedDB(updatedDBArray);

  // ── Push synced data to Cloudflare D1 ─────────────────────
  await pushToD1(updatedDBArray);

  console.log(`\n✨ Sync complete! ${syncedArtists.length} artists synced.`);
  if (unverifiedArtists.length > 0) {
    console.log(`ℹ️  Visit ${TRAVERCE_API_URL ? TRAVERCE_API_URL : 'http://localhost:8788'}/admin.html to verify ${unverifiedArtists.length} pending artists.`);
  }
}

// ── PUSH TO D1 ───────────────────────────────────────────────
async function pushToD1(artists) {
  if (!TRAVERCE_API_URL || !TRAVERCE_ADMIN_KEY) {
    console.log('ℹ️  Skipping D1 push (TRAVERCE_API_URL or TRAVERCE_ADMIN_KEY not set).');
    return;
  }

  console.log(`\n☁️  Pushing ${artists.length} artists to Cloudflare D1...`);
  let pushed = 0; let failed = 0;

  for (const artist of artists) {
    try {
      // Try PUT first (update existing), fall back to POST (create new)
      const putRes = await fetch(
        `${TRAVERCE_API_URL}/api/artists?spotify_id=${encodeURIComponent(artist.spotify_artist_id || '')}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': TRAVERCE_ADMIN_KEY },
          body: JSON.stringify({
            ...artist,
            release_count: artist.releaseCount || artist.release_count || 0,
          }),
        }
      );

      if (putRes.ok || putRes.status === 404) {
        if (putRes.status === 404 || !(await putRes.json().catch(() => ({ success: false }))).success) {
          // Artist doesn't exist yet — create it
          await fetch(`${TRAVERCE_API_URL}/api/artists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Key': TRAVERCE_ADMIN_KEY },
            body: JSON.stringify({
              ...artist,
              release_count: artist.releaseCount || artist.release_count || 0,
            }),
          });
        }
        pushed++;
      } else {
        failed++;
        console.warn(`   ⚠️  D1 push failed for ${artist.name}: ${putRes.status}`);
      }
    } catch (e) {
      failed++;
      console.warn(`   ⚠️  D1 push error for ${artist.name}: ${e.message}`);
    }

    // Small pause to avoid rate-limiting the Pages Function
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`☁️  D1 push done: ${pushed} pushed, ${failed} failed.`);
}

sync().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
