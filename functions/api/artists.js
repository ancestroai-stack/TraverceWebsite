/**
 * TRAVERCE — Cloudflare Pages Function
 * Route: /api/artists  (GET, POST, PUT, DELETE)
 *
 * Bindings required in wrangler.toml:
 *   [[d1_databases]]  binding = "DB"
 *
 * Protected by X-Admin-Key header for all write operations.
 * Admin key is set as TRAVERCE_ADMIN_KEY in Cloudflare Pages env vars.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  'Content-Type': 'application/json',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

function requireAdminKey(request, env) {
  const provided = request.headers.get('X-Admin-Key');
  const expected  = env.TRAVERCE_ADMIN_KEY;
  if (!expected) return null; // No key configured — open (dev mode)
  if (provided !== expected) return err('Unauthorized', 401);
  return null;
}

// Parse JSON array fields back from text storage
function parseArtist(row) {
  if (!row) return null;
  return {
    ...row,
    is_verified: row.is_verified === 1,
    genres:      safeParseJSON(row.genres,   []),
    releases:    safeParseJSON(row.releases, []),
  };
}

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// Serialize for D1 storage
function serializeForDB(data) {
  return {
    ...data,
    is_verified: data.is_verified ? 1 : 0,
    genres:      JSON.stringify(Array.isArray(data.genres)   ? data.genres   : []),
    releases:    JSON.stringify(Array.isArray(data.releases) ? data.releases : []),
    updated_at:  new Date().toISOString(),
  };
}

// ── HANDLERS ─────────────────────────────────────────────────

async function handleGet(request, env) {
  const url = new URL(request.url);
  const id  = url.searchParams.get('id');
  const slug = url.searchParams.get('slug');
  const verifiedOnly = url.searchParams.get('verified') === 'true';

  if (id) {
    const { results } = await env.DB.prepare(
      'SELECT * FROM artists WHERE id = ?'
    ).bind(id).all();
    return results.length ? json(parseArtist(results[0])) : err('Artist not found', 404);
  }

  if (slug) {
    const { results } = await env.DB.prepare(
      'SELECT * FROM artists WHERE slug = ?'
    ).bind(slug).all();
    return results.length ? json(parseArtist(results[0])) : err('Artist not found', 404);
  }

  const query = verifiedOnly
    ? 'SELECT * FROM artists WHERE is_verified = 1 ORDER BY popularity DESC, name ASC'
    : 'SELECT * FROM artists ORDER BY is_verified DESC, popularity DESC, name ASC';

  const { results } = await env.DB.prepare(query).all();
  return json({
    artists: results.map(parseArtist),
    total:   results.length,
    verified: results.filter(r => r.is_verified === 1).length,
  });
}

async function handlePost(request, env) {
  const authErr = requireAdminKey(request, env);
  if (authErr) return authErr;

  const body = await request.json().catch(() => null);
  if (!body || !body.name || !body.slug) return err('name and slug are required');

  const d = serializeForDB(body);

  try {
    const result = await env.DB.prepare(`
      INSERT INTO artists
        (spotify_artist_id, name, slug, bio_manual, is_verified,
         last_synced_at, spotify_url, genres, followers, popularity,
         portrait, releases, release_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      d.spotify_artist_id || null,
      d.name, d.slug,
      d.bio_manual || '',
      d.is_verified ? 1 : 0,
      d.last_synced_at || null,
      d.spotify_url || '',
      d.genres,
      d.followers || 0,
      d.popularity || 0,
      d.portrait || '',
      d.releases,
      d.release_count || 0,
    ).run();

    return json({ success: true, id: result.meta.last_row_id }, 201);
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return err('Artist with this slug or Spotify ID already exists', 409);
    throw e;
  }
}

async function handlePut(request, env) {
  const authErr = requireAdminKey(request, env);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const id  = url.searchParams.get('id');
  const spotifyId = url.searchParams.get('spotify_id');

  if (!id && !spotifyId) return err('id or spotify_id query param required');

  const body = await request.json().catch(() => null);
  if (!body) return err('Invalid JSON body');

  const d = serializeForDB(body);

  // Build dynamic SET clause — only update fields that are provided
  const fields  = [];
  const values  = [];
  const allowed = [
    'spotify_artist_id','name','slug','bio_manual','is_verified',
    'last_synced_at','spotify_url','genres','followers','popularity',
    'portrait','releases','release_count',
  ];
  for (const key of allowed) {
    if (key in d) {
      fields.push(`${key} = ?`);
      values.push(d[key] !== undefined ? d[key] : null);
    }
  }
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());

  const whereClause = id ? `id = ?` : `spotify_artist_id = ?`;
  values.push(id || spotifyId);

  const result = await env.DB.prepare(
    `UPDATE artists SET ${fields.join(', ')} WHERE ${whereClause}`
  ).bind(...values).run();

  if (result.meta.changes === 0) return err('Artist not found', 404);
  return json({ success: true, changes: result.meta.changes });
}

async function handleDelete(request, env) {
  const authErr = requireAdminKey(request, env);
  if (authErr) return authErr;

  const url = new URL(request.url);
  const id  = url.searchParams.get('id');
  if (!id) return err('id query param required');

  const result = await env.DB.prepare(
    'DELETE FROM artists WHERE id = ?'
  ).bind(id).run();

  if (result.meta.changes === 0) return err('Artist not found', 404);
  return json({ success: true });
}

// ── MAIN EXPORT ───────────────────────────────────────────────

export async function onRequest(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    switch (request.method) {
      case 'GET':    return await handleGet(request, env);
      case 'POST':   return await handlePost(request, env);
      case 'PUT':    return await handlePut(request, env);
      case 'DELETE': return await handleDelete(request, env);
      default:       return err('Method not allowed', 405);
    }
  } catch (e) {
    console.error('[/api/artists]', e);
    return err(`Internal server error: ${e.message}`, 500);
  }
}
