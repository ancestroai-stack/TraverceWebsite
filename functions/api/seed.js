/**
 * TRAVERCE — Cloudflare Pages Function
 * Route: /api/seed
 *
 * One-time endpoint to seed D1 from the artists_db.js flat file.
 * Call once after initial D1 setup: GET /api/seed?key=YOUR_ADMIN_KEY
 *
 * Protected by ?key= query param (same as TRAVERCE_ADMIN_KEY).
 * After seeding, this endpoint can be left in place — re-running it
 * will UPSERT (update existing, insert new) so it is safe to re-run.
 */

import { ARTISTS } from '../../artists_db.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

function safeStr(val, fallback = '') {
  return val !== undefined && val !== null ? String(val) : fallback;
}

export async function onRequest(context) {
  const { request, env } = context;

  // Auth check via query param
  const url      = new URL(request.url);
  const provided = url.searchParams.get('key');
  const expected  = env.TRAVERCE_ADMIN_KEY;
  if (expected && provided !== expected) {
    return json({ error: 'Unauthorized — pass ?key=YOUR_ADMIN_KEY' }, 401);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const results  = { inserted: 0, updated: 0, skipped: 0, errors: [] };

  for (const artist of ARTISTS) {
    if (!artist.name || !artist.slug) {
      results.skipped++;
      continue;
    }

    const genres   = JSON.stringify(Array.isArray(artist.genres)   ? artist.genres   : []);
    const releases = JSON.stringify(Array.isArray(artist.releases) ? artist.releases : []);

    try {
      // UPSERT: insert or replace on slug conflict
      const result = await env.DB.prepare(`
        INSERT INTO artists
          (spotify_artist_id, name, slug, bio_manual, is_verified,
           last_synced_at, spotify_url, genres, followers, popularity,
           portrait, releases, release_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(slug) DO UPDATE SET
          spotify_artist_id = excluded.spotify_artist_id,
          name              = excluded.name,
          bio_manual        = excluded.bio_manual,
          is_verified       = excluded.is_verified,
          last_synced_at    = excluded.last_synced_at,
          spotify_url       = excluded.spotify_url,
          genres            = excluded.genres,
          followers         = excluded.followers,
          popularity        = excluded.popularity,
          portrait          = excluded.portrait,
          releases          = excluded.releases,
          release_count     = excluded.release_count,
          updated_at        = datetime('now')
      `).bind(
        artist.spotify_artist_id || null,
        safeStr(artist.name),
        safeStr(artist.slug),
        safeStr(artist.bio_manual),
        artist.is_verified ? 1 : 0,
        artist.last_synced_at || null,
        safeStr(artist.spotify_url),
        genres,
        artist.followers  || 0,
        artist.popularity || 0,
        safeStr(artist.portrait),
        releases,
        artist.releaseCount || artist.release_count || 0,
      ).run();

      if (result.meta.changes > 0) {
        // D1 doesn't easily distinguish insert vs update on upsert,
        // so we just count changes
        results.inserted++;
      } else {
        results.skipped++;
      }
    } catch (e) {
      results.errors.push({ artist: artist.name, error: e.message });
    }
  }

  return json({
    success: true,
    message: `Seed complete. ${results.inserted} upserted, ${results.skipped} skipped.`,
    total:   ARTISTS.length,
    ...results,
  });
}
