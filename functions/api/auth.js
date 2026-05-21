/**
 * TRAVERCE — Cloudflare Pages Function
 * Route: /api/auth
 *
 * POST /api/auth  — validate password, return session token
 * GET  /api/auth  — verify an existing token
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  'Content-Type': 'application/json',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const ADMIN_KEY = env.TRAVERCE_ADMIN_KEY;

  // ── POST /api/auth — Login ─────────────────────────────────
  if (request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || !body.password) {
      return json({ error: 'Password required' }, 400);
    }

    if (!ADMIN_KEY) {
      // No key set — open mode (dev/setup)
      return json({ success: true, token: 'dev-mode', dev: true });
    }

    if (body.password !== ADMIN_KEY) {
      // Introduce a small delay to slow down brute force
      await new Promise(r => setTimeout(r, 800));
      return json({ error: 'Invalid password' }, 401);
    }

    return json({ success: true, token: ADMIN_KEY });
  }

  // ── GET /api/auth — Verify token ──────────────────────────
  if (request.method === 'GET') {
    const token = request.headers.get('X-Admin-Key') ||
                  new URL(request.url).searchParams.get('token');

    if (!ADMIN_KEY) {
      return json({ valid: true, dev: true });
    }

    if (token === ADMIN_KEY) {
      return json({ valid: true });
    }

    return json({ valid: false }, 401);
  }

  return json({ error: 'Method not allowed' }, 405);
}
