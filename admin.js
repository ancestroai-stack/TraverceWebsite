/**
 * TRAVERCE — Admin Portal JS
 * Encapsulates CSS styles, layout markup, and management dashboard logic.
 */

// ── DYNAMIC STYLE INJECTION ────────────────────────────────
const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:       #0d0d0d;
    --bg-2:     #141414;
    --bg-3:     #1a1a1a;
    --bg-4:     #222222;
    --accent:   #FFD042;
    --accent-dim: rgba(255,208,66,0.12);
    --green:    #22c55e;
    --green-dim: rgba(34,197,94,0.12);
    --red:      #ef4444;
    --red-dim:  rgba(239,68,68,0.12);
    --orange:   #f97316;
    --orange-dim: rgba(249,115,22,0.12);
    --white:    #ffffff;
    --off-white:#e8e8e8;
    --muted:    #666666;
    --border:   rgba(255,255,255,0.07);
    --border-2: rgba(255,255,255,0.12);
    --font:     'Inter', sans-serif;
    --font-head:'Barlow Condensed', sans-serif;
  }
  html { scroll-behavior: smooth; }
  body { background: var(--bg); color: var(--off-white); font-family: var(--font); font-size: 14px; line-height: 1.6; overflow-x: hidden; }
  a { color: var(--accent); text-decoration: none; }
  button { cursor: pointer; font-family: var(--font); border: none; outline: none; }
  input, textarea, select { font-family: var(--font); }
  img { display: block; max-width: 100%; }

  /* ── LAYOUT ───────────────────────────────────────────── */
  .admin-layout { display: flex; min-height: 100vh; }

  /* ── SIDEBAR ──────────────────────────────────────────── */
  .sidebar {
    width: 220px; flex-shrink: 0;
    background: var(--bg-2);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    position: fixed; top: 0; left: 0; bottom: 0;
    z-index: 100;
  }
  .sidebar-brand {
    padding: 1.5rem 1.25rem 1rem;
    border-bottom: 1px solid var(--border);
  }
  .sidebar-logo {
    font-family: var(--font-head);
    font-size: 1.3rem; font-weight: 900;
    color: var(--white); letter-spacing: -0.01em;
  }
  .sidebar-logo span { color: var(--accent); }
  .sidebar-tag {
    font-size: 0.65rem; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--muted);
    margin-top: 0.2rem;
  }
  .sidebar-nav { flex: 1; padding: 1rem 0; }
  .sidebar-nav-item {
    display: flex; align-items: center; gap: 0.65rem;
    padding: 0.65rem 1.25rem;
    color: var(--muted); font-size: 0.8rem; font-weight: 500;
    cursor: pointer; transition: all 0.15s;
    border-left: 2px solid transparent;
  }
  .sidebar-nav-item:hover { color: var(--white); background: rgba(255,255,255,0.03); }
  .sidebar-nav-item.active { color: var(--accent); border-left-color: var(--accent); background: var(--accent-dim); }
  .sidebar-nav-icon { width: 16px; height: 16px; opacity: 0.7; flex-shrink: 0; }
  .sidebar-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--border);
  }
  .sidebar-back-btn {
    display: block; width: 100%; padding: 0.55rem 1rem;
    background: var(--bg-4); color: var(--muted);
    font-size: 0.75rem; text-align: center;
    border: 1px solid var(--border); border-radius: 4px;
    transition: all 0.15s;
  }
  .sidebar-back-btn:hover { color: var(--white); border-color: var(--border-2); }

  /* ── MAIN CONTENT ─────────────────────────────────────── */
  .main-content { margin-left: 220px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }

  /* ── TOPBAR ───────────────────────────────────────────── */
  .topbar {
    position: sticky; top: 0; z-index: 50;
    background: rgba(13,13,13,0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    padding: 0.9rem 2rem;
    display: flex; align-items: center; gap: 1rem;
  }
  .topbar-title { font-size: 0.9rem; font-weight: 600; color: var(--white); }
  .topbar-right { margin-left: auto; display: flex; align-items: center; gap: 0.75rem; }
  .topbar-sync-btn {
    padding: 0.5rem 1.25rem;
    background: var(--accent); color: #000;
    font-size: 0.78rem; font-weight: 700;
    letter-spacing: 0.08em; border-radius: 3px;
    transition: opacity 0.15s;
  }
  .topbar-sync-btn:hover { opacity: 0.88; }
  .topbar-sync-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .topbar-export-btn {
    padding: 0.5rem 1.25rem;
    background: transparent; color: var(--off-white);
    font-size: 0.78rem; font-weight: 500;
    border: 1px solid var(--border-2); border-radius: 3px;
    transition: all 0.15s;
  }
  .topbar-export-btn:hover { background: var(--bg-4); color: var(--white); }

  /* ── PAGES ────────────────────────────────────────────── */
  .page { display: none; padding: 2rem; }
  .page.active { display: block; }

  /* ── STATS BAR ────────────────────────────────────────── */
  .stats-bar {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 1px; background: var(--border);
    border: 1px solid var(--border); margin-bottom: 2rem;
  }
  .stat-card {
    background: var(--bg-2); padding: 1.25rem 1.5rem;
  }
  .stat-num { font-size: 2rem; font-weight: 700; font-family: var(--font-head); color: var(--white); line-height: 1; }
  .stat-label { font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-top: 0.4rem; }
  .stat-card.verified .stat-num { color: var(--green); }
  .stat-card.pending .stat-num { color: var(--orange); }
  .stat-card.total .stat-num { color: var(--accent); }

  /* ── TOOLBAR ──────────────────────────────────────────── */
  .toolbar {
    display: flex; align-items: center; gap: 1rem;
    margin-bottom: 1.25rem; flex-wrap: wrap;
  }
  .search-field {
    flex: 1; min-width: 220px; max-width: 360px;
    position: relative;
  }
  .search-field input {
    width: 100%; padding: 0.55rem 0.9rem 0.55rem 2.2rem;
    background: var(--bg-3); color: var(--white);
    border: 1px solid var(--border); border-radius: 4px;
    font-size: 0.82rem; outline: none;
    transition: border-color 0.15s;
  }
  .search-field input:focus { border-color: var(--accent); }
  .search-field svg { position: absolute; left: 0.7rem; top: 50%; transform: translateY(-50%); opacity: 0.4; }
  .filter-tabs { display: flex; gap: 0.5rem; }
  .filter-tab {
    padding: 0.45rem 0.85rem; border-radius: 3px;
    font-size: 0.75rem; font-weight: 500;
    background: var(--bg-3); color: var(--muted);
    border: 1px solid var(--border);
    transition: all 0.15s; cursor: pointer;
  }
  .filter-tab.active { background: var(--accent-dim); color: var(--accent); border-color: var(--accent); }
  .add-artist-btn {
    margin-left: auto; padding: 0.5rem 1.1rem;
    background: var(--bg-3); color: var(--off-white);
    font-size: 0.78rem; font-weight: 500;
    border: 1px solid var(--border-2); border-radius: 3px;
    transition: all 0.15s;
  }
  .add-artist-btn:hover { background: var(--bg-4); color: var(--white); }

  /* ── ARTIST TABLE ─────────────────────────────────────── */
  .artist-table-wrap { overflow-x: auto; }
  .artist-table {
    width: 100%; border-collapse: collapse;
    font-size: 0.82rem;
  }
  .artist-table thead th {
    padding: 0.65rem 1rem; text-align: left;
    font-size: 0.65rem; font-weight: 600;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--muted); border-bottom: 1px solid var(--border);
    white-space: nowrap; background: var(--bg-2);
  }
  .artist-table tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background 0.12s;
  }
  .artist-table tbody tr:hover { background: rgba(255,255,255,0.025); }
  .artist-table tbody tr.hidden { display: none; }
  .artist-table td { padding: 0.75rem 1rem; vertical-align: middle; }
  .artist-table td:first-child { padding-left: 1rem; }

  .artist-portrait { width: 36px; height: 36px; border-radius: 4px; object-fit: cover; background: var(--bg-4); }
  .artist-name-cell { font-weight: 600; color: var(--white); }
  .artist-name-cell small { display: block; color: var(--muted); font-size: 0.72rem; font-weight: 400; }

  .badge {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.2rem 0.55rem; border-radius: 3px;
    font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em;
  }
  .badge-verified { background: var(--green-dim); color: var(--green); }
  .badge-pending  { background: var(--orange-dim); color: var(--orange); }
  .badge-noid     { background: var(--red-dim); color: var(--red); }

  .spotify-id-cell {
    font-family: monospace; font-size: 0.72rem;
    color: var(--muted); max-width: 180px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .spotify-id-cell.empty { color: var(--red); font-style: italic; }

  .bio-preview {
    max-width: 260px; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
    color: var(--muted); font-size: 0.75rem;
  }
  .bio-preview.has-manual { color: var(--green); }
  .bio-preview.no-bio { color: var(--red); font-style: italic; }

  .action-btns { display: flex; gap: 0.4rem; white-space: nowrap; }
  .btn-sm {
    padding: 0.3rem 0.7rem; border-radius: 3px;
    font-size: 0.72rem; font-weight: 600;
    transition: all 0.12s; cursor: pointer;
  }
  .btn-edit  { background: var(--bg-4); color: var(--off-white); border: 1px solid var(--border-2); }
  .btn-edit:hover { background: var(--bg-3); color: var(--white); }
  .btn-verify { background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(255,208,66,0.3); }
  .btn-verify:hover { background: rgba(255,208,66,0.2); }
  .btn-delete { background: var(--red-dim); color: var(--red); border: 1px solid rgba(239,68,68,0.3); }
  .btn-delete:hover { background: rgba(239,68,68,0.2); }

  /* ── MODAL ────────────────────────────────────────────── */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
    display: none; align-items: center; justify-content: center;
    padding: 1.5rem;
  }
  .modal-overlay.open { display: flex; }
  .modal {
    background: var(--bg-2); border: 1px solid var(--border-2);
    border-radius: 6px; width: 100%; max-width: 640px;
    max-height: 90vh; overflow-y: auto;
  }
  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border);
    position: sticky; top: 0; background: var(--bg-2); z-index: 1;
  }
  .modal-title { font-size: 1rem; font-weight: 700; color: var(--white); }
  .modal-close {
    width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
    background: var(--bg-4); color: var(--muted); border-radius: 3px;
    font-size: 1rem; transition: color 0.12s;
  }
  .modal-close:hover { color: var(--white); }
  .modal-body { padding: 1.5rem; }
  .modal-footer {
    padding: 1rem 1.5rem; border-top: 1px solid var(--border);
    display: flex; justify-content: flex-end; gap: 0.75rem;
  }

  /* ── FORM ─────────────────────────────────────────────── */
  .form-group { margin-bottom: 1.2rem; }
  .form-label {
    display: block; font-size: 0.72rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--muted); margin-bottom: 0.4rem;
  }
  .form-input, .form-textarea, .form-select {
    width: 100%; padding: 0.65rem 0.9rem;
    background: var(--bg-3); color: var(--white);
    border: 1px solid var(--border); border-radius: 4px;
    font-size: 0.85rem; outline: none; transition: border-color 0.15s;
  }
  .form-input:focus, .form-textarea:focus { border-color: var(--accent); }
  .form-textarea { resize: vertical; min-height: 100px; }
  .form-hint { font-size: 0.72rem; color: var(--muted); margin-top: 0.35rem; }
  .form-hint.warning { color: var(--orange); }
  .form-hint.success { color: var(--green); }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

  .btn-primary {
    padding: 0.6rem 1.5rem;
    background: var(--accent); color: #000;
    font-size: 0.8rem; font-weight: 700; border-radius: 3px;
    transition: opacity 0.15s;
  }
  .btn-primary:hover { opacity: 0.88; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary {
    padding: 0.6rem 1.2rem;
    background: var(--bg-4); color: var(--off-white);
    font-size: 0.8rem; font-weight: 500;
    border: 1px solid var(--border-2); border-radius: 3px;
    transition: all 0.15s;
  }
  .btn-secondary:hover { background: var(--bg-3); color: var(--white); }

  /* ── SPOTIFY SEARCH ───────────────────────────────────── */
  .spotify-search-page { max-width: 760px; }
  .spotify-search-box { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; }
  .spotify-search-box input {
    flex: 1; padding: 0.75rem 1rem;
    background: var(--bg-3); color: var(--white);
    border: 1px solid var(--border); border-radius: 4px;
    font-size: 0.9rem; outline: none;
  }
  .spotify-search-box input:focus { border-color: var(--accent); }
  .spotify-search-box button {
    padding: 0.75rem 1.5rem;
    background: var(--accent); color: #000;
    font-size: 0.82rem; font-weight: 700;
    border-radius: 4px; transition: opacity 0.15s;
  }
  .spotify-search-box button:hover { opacity: 0.88; }

  .candidate-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .candidate-card {
    display: flex; align-items: center; gap: 1rem;
    padding: 1rem; background: var(--bg-2);
    border: 1px solid var(--border); border-radius: 5px;
    transition: border-color 0.15s;
  }
  .candidate-card:hover { border-color: var(--border-2); }
  .candidate-img { width: 52px; height: 52px; border-radius: 4px; object-fit: cover; background: var(--bg-4); flex-shrink: 0; }
  .candidate-info { flex: 1; }
  .candidate-name { font-weight: 600; color: var(--white); font-size: 0.9rem; }
  .candidate-meta { color: var(--muted); font-size: 0.75rem; margin-top: 0.15rem; }
  .candidate-id { font-family: monospace; font-size: 0.7rem; color: var(--muted); margin-top: 0.15rem; }
  .candidate-assign-btn {
    padding: 0.45rem 1rem;
    background: var(--accent-dim); color: var(--accent);
    font-size: 0.75rem; font-weight: 600;
    border: 1px solid rgba(255,208,66,0.3); border-radius: 3px;
    transition: background 0.15s; flex-shrink: 0;
  }
  .candidate-assign-btn:hover { background: rgba(255,208,66,0.2); }

  .search-status {
    padding: 1.5rem; text-align: center;
    color: var(--muted); font-size: 0.85rem;
    background: var(--bg-2); border: 1px solid var(--border); border-radius: 5px;
  }
  .assign-target-label {
    padding: 0.75rem 1rem; background: var(--accent-dim);
    border: 1px solid rgba(255,208,66,0.25); border-radius: 4px;
    color: var(--accent); font-size: 0.82rem; margin-bottom: 1.5rem;
  }
  .assign-target-label strong { color: var(--white); }

  /* ── PAGE HEADER ──────────────────────────────────────── */
  .page-header { margin-bottom: 2rem; }
  .page-header h1 { font-family: var(--font-head); font-size: 2rem; font-weight: 900; color: var(--white); }
  .page-header p { color: var(--muted); font-size: 0.85rem; margin-top: 0.3rem; }

  /* ── TOAST ────────────────────────────────────────────── */
  .toast-container { position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.5rem; }
  .toast {
    padding: 0.75rem 1.25rem; border-radius: 5px;
    font-size: 0.82rem; font-weight: 500;
    animation: slideIn 0.25s ease;
    max-width: 320px;
  }
  .toast.success { background: var(--green); color: #000; }
  .toast.error   { background: var(--red); color: #fff; }
  .toast.info    { background: var(--bg-4); color: var(--white); border: 1px solid var(--border-2); }
  @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

  /* ── SYNC LOG ─────────────────────────────────────────── */
  .sync-log {
    background: var(--bg-2); border: 1px solid var(--border);
    border-radius: 4px; padding: 1rem;
    font-family: monospace; font-size: 0.78rem;
    color: var(--muted); max-height: 300px; overflow-y: auto;
    white-space: pre-wrap; margin-top: 1.5rem;
  }
  .sync-log .log-success { color: var(--green); }
  .sync-log .log-warn    { color: var(--orange); }
  .sync-log .log-error   { color: var(--red); }

  /* ── RESPONSIVE ───────────────────────────────────────── */
  @media (max-width: 900px) {
    .sidebar { width: 60px; }
    .sidebar-brand, .sidebar-tag, .sidebar-nav-item span, .sidebar-footer { display: none; }
    .sidebar-nav-item { justify-content: center; padding: 0.75rem; }
    .main-content { margin-left: 60px; }
    .stats-bar { grid-template-columns: 1fr 1fr; }
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// ── DYNAMIC HTML RENDERING ─────────────────────────────────
const markup = `
<div class="admin-layout">
  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="sidebar-logo">Trav<span>erce</span></div>
      <div class="sidebar-tag">Admin Portal</div>
    </div>
    <nav class="sidebar-nav">
      <div class="sidebar-nav-item active" data-page="artists">
        <svg class="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        <span>Artist Database</span>
      </div>
      <div class="sidebar-nav-item" data-page="search">
        <svg class="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span>Spotify Search</span>
      </div>
      <div class="sidebar-nav-item" data-page="export">
        <svg class="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>Export Database</span>
      </div>
    </nav>
    <div class="sidebar-footer">
      <a href="/" class="sidebar-back-btn" style="margin-bottom:0.5rem;">← Back to Site</a>
      <button onclick="logout()" style="display:block;width:100%;padding:0.55rem 1rem;background:rgba(239,68,68,0.1);color:#ef4444;font-size:0.75rem;font-family:var(--font);border:1px solid rgba(239,68,68,0.2);border-radius:4px;cursor:pointer;transition:all 0.15s;" onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'">⏻ Logout</button>
    </div>
  </aside>

  <!-- MAIN -->
  <div class="main-content">
    <!-- TOPBAR -->
    <div class="topbar">
      <span class="topbar-title" id="topbarTitle">Artist Database</span>
      <div class="topbar-right">
        <button class="topbar-export-btn" id="quickExportBtn">⬇ Export DB</button>
        <button class="topbar-sync-btn" id="topSyncBtn">↻ Instructions to Sync</button>
      </div>
    </div>

    <!-- ── PAGE: ARTIST DATABASE ── -->
    <div class="page active" id="page-artists">
      <div class="page-header">
        <h1>Artist Database</h1>
        <p>All Traverce artists. Verified artists sync with Spotify. Unverified need ID confirmation.</p>
      </div>

      <div class="stats-bar">
        <div class="stat-card total">
          <div class="stat-num" id="statTotal">—</div>
          <div class="stat-label">Total Artists</div>
        </div>
        <div class="stat-card verified">
          <div class="stat-num" id="statVerified">—</div>
          <div class="stat-label">Verified</div>
        </div>
        <div class="stat-card pending">
          <div class="stat-num" id="statPending">—</div>
          <div class="stat-label">Needs Verification</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" id="statBios">—</div>
          <div class="stat-label">With Manual Bio</div>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-field">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="artistSearch" placeholder="Search artists…" autocomplete="off">
        </div>
        <div class="filter-tabs">
          <div class="filter-tab active" data-filter="all">All</div>
          <div class="filter-tab" data-filter="verified">Verified</div>
          <div class="filter-tab" data-filter="pending">Needs Review</div>
          <div class="filter-tab" data-filter="bio">Has Bio</div>
        </div>
        <button class="add-artist-btn" id="addArtistBtn">+ Add Artist</button>
      </div>

      <div class="artist-table-wrap">
        <table class="artist-table" id="artistTable">
          <thead>
            <tr>
              <th></th>
              <th>Artist</th>
              <th>Status</th>
              <th>Spotify ID</th>
              <th>Bio</th>
              <th>Followers</th>
              <th>Last Synced</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="artistTableBody">
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── PAGE: SPOTIFY SEARCH ── -->
    <div class="page" id="page-search">
      <div class="page-header">
        <h1>Spotify Search</h1>
        <p>Search for an artist and assign their verified Spotify Artist ID to a record.</p>
      </div>

      <div class="spotify-search-page">
        <div id="assignTargetInfo" class="assign-target-label" style="display:none;">
          Assigning ID to: <strong id="assignTargetName">—</strong>
          <button onclick="clearAssignTarget()" style="margin-left:1rem;font-size:0.72rem;color:var(--muted);background:none;cursor:pointer;">Clear</button>
        </div>

        <div class="spotify-search-box">
          <input type="text" id="spotifySearchInput" placeholder="Artist name (e.g. Yo Maps, Jemax, TBwoy)…" autocomplete="off">
          <button id="spotifySearchBtn">Search Spotify</button>
        </div>

        <div id="candidateContainer">
          <div class="search-status">Search for an artist above to see Spotify candidates.</div>
        </div>
      </div>
    </div>

    <!-- ── PAGE: EXPORT ── -->
    <div class="page" id="page-export">
      <div class="page-header">
        <h1>Export Database</h1>
        <p>Download the updated <code>artists_db.js</code> file and replace the one in your project directory.</p>
      </div>
      <div style="max-width:620px;">
        <div class="stats-bar" style="margin-bottom:1.5rem;">
          <div class="stat-card total">
            <div class="stat-num" id="exportStatTotal">—</div>
            <div class="stat-label">Artists</div>
          </div>
          <div class="stat-card verified">
            <div class="stat-num" id="exportStatVerified">—</div>
            <div class="stat-label">Verified</div>
          </div>
        </div>
        <button class="btn-primary" id="downloadDbBtn" style="font-size:0.9rem;padding:0.75rem 2rem;">
          ⬇ Download artists_db.js
        </button>
        <p class="form-hint" style="margin-top:1rem;">
          After downloading, replace <code>c:\\Users\\hilla\\OneDrive\\المستندات\\TraverceWebsite\\artists_db.js</code> with the downloaded file, then run <code>node sync_artists.js</code>.
        </p>

        <div style="margin-top:2rem;padding:1.25rem;background:var(--bg-2);border:1px solid var(--border);border-radius:4px;">
          <div style="font-weight:600;color:var(--white);margin-bottom:0.75rem;">How to sync after changes:</div>
          <div style="font-family:monospace;font-size:0.8rem;color:var(--muted);line-height:2;">
            1. Replace artists_db.js with the downloaded file<br>
            2. Open terminal in your project folder<br>
            3. Run: <code style="color:var(--accent)">node sync_artists.js</code><br>
            4. Or run: <code style="color:var(--accent)">npm run dev</code> (runs sync automatically)<br>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- EDIT MODAL -->
<div class="modal-overlay" id="editModal">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title" id="editModalTitle">Edit Artist</span>
      <button class="modal-close" id="editModalClose">✕</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="editIndex">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Artist Name</label>
          <input type="text" class="form-input" id="editName">
        </div>
        <div class="form-group">
          <label class="form-label">URL Slug</label>
          <input type="text" class="form-input" id="editSlug">
          <p class="form-hint">Auto-derived from name. Used in page routing.</p>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Spotify Artist ID <span style="color:var(--accent)">*</span></label>
        <input type="text" class="form-input" id="editSpotifyId" placeholder="22-character Spotify Artist ID">
        <p class="form-hint">Find it on open.spotify.com/artist/[ID]. Must be exactly 22 characters.</p>
        <p class="form-hint warning" id="idLengthHint" style="display:none;"></p>
      </div>
      <div class="form-group">
        <label class="form-label">Verification Status</label>
        <select class="form-select form-input" id="editVerified">
          <option value="true">✓ Verified — Spotify ID confirmed, will sync</option>
          <option value="false">⚠ Unverified — Needs ID confirmation, will not sync</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Manual Bio <span style="color:var(--green);font-size:0.65rem;">(OVERRIDES SCRAPED BIO)</span></label>
        <textarea class="form-textarea" id="editBio" rows="6" placeholder="Write a curated editorial bio for this artist. This will be used on the website instead of scraped Wikipedia/Last.fm content."></textarea>
        <p class="form-hint">Leave empty to use the auto-scraped bio from Wikipedia/Last.fm.</p>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" id="editModalCancel">Cancel</button>
      <button class="btn-primary" id="editModalSave">Save Changes</button>
    </div>
  </div>
</div>

<!-- ADD ARTIST MODAL -->
<div class="modal-overlay" id="addModal">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">Add New Artist</span>
      <button class="modal-close" id="addModalClose">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Artist Name *</label>
          <input type="text" class="form-input" id="addName" placeholder="e.g. Macky 2">
        </div>
        <div class="form-group">
          <label class="form-label">Spotify Artist ID</label>
          <input type="text" class="form-input" id="addSpotifyId" placeholder="22-char ID (or leave blank)">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Manual Bio</label>
        <textarea class="form-textarea" id="addBio" rows="4" placeholder="Write editorial bio…"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Mark as Verified?</label>
        <select class="form-select form-input" id="addVerified">
          <option value="false">No — add Spotify ID via search first</option>
          <option value="true">Yes — I've confirmed the Spotify ID is correct</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" id="addModalCancel">Cancel</button>
      <button class="btn-primary" id="addModalSave">Add Artist</button>
    </div>
  </div>
</div>

<!-- SYNC INSTRUCTIONS MODAL -->
<div class="modal-overlay" id="syncModal">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">How to Sync</span>
      <button class="modal-close" id="syncModalClose">✕</button>
    </div>
    <div class="modal-body">
      <p style="color:var(--muted);margin-bottom:1rem;">The admin portal runs in the browser and cannot directly execute Node.js scripts. To sync artist data from Spotify:</p>
      <ol style="padding-left:1.5rem;display:flex;flex-direction:column;gap:0.75rem;color:var(--off-white);font-size:0.85rem;">
        <li>Export the updated <code style="color:var(--accent)">artists_db.js</code> from the Export tab and replace the project file.</li>
        <li>Open a terminal in your project folder.</li>
        <li>Run: <code style="color:var(--accent);background:var(--bg-4);padding:0.1rem 0.5rem;border-radius:3px;">node sync_artists.js</code></li>
        <li>The sync will fetch live data from Spotify for all verified artists and update the website.</li>
      </ol>
      <p style="color:var(--muted);font-size:0.8rem;margin-top:1.5rem;">Alternatively, start the dev server with <code style="color:var(--accent)">npm run dev</code> — this automatically runs the sync before starting Vite.</p>
    </div>
    <div class="modal-footer">
      <button class="btn-primary" id="syncModalClose2">Got it</button>
    </div>
  </div>
</div>

<!-- TOAST CONTAINER -->
<div class="toast-container" id="toastContainer"></div>
`;

const appEl = document.getElementById('admin-app');
if (appEl) {
  appEl.innerHTML = markup;
}

// ── API CONFIG ────────────────────────────────────────────
const API_BASE = window.location.origin;

function getAdminKey() {
  return sessionStorage.getItem('traverce_session') || '';
}

function apiHeaders(write = false) {
  const h = { 'Content-Type': 'application/json' };
  if (write) h['X-Admin-Key'] = getAdminKey();
  return h;
}

window.logout = function() {
  sessionStorage.removeItem('traverce_session');
  window.location.replace('/backstage');
};

// ── STATE ─────────────────────────────────────────────────
let artists      = [];
let currentFilter = 'all';
let searchQuery   = '';
let assignTarget  = null;

const SPOTIFY_CLIENT_ID     = 'b7e756ef42f84b0ca0b506d367b5b0d3';
const SPOTIFY_CLIENT_SECRET = '574c23ec6d18419d98937732ad1cd037';
let spotifyToken = null;

// ── LOAD FROM D1 ──────────────────────────────────────────
async function loadArtists() {
  const tbody = document.getElementById('artistTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--muted)">Loading from database…</td></tr>';
  try {
    const res  = await fetch(`${API_BASE}/api/artists`, { headers: apiHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    artists = data.artists || [];
    renderTable();
    showToast(`Loaded ${artists.length} artists from D1.`, 'info');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--red)">Failed to load: ${escHtml(e.message)}</td></tr>`;
    showToast('Could not connect to D1 API. Are you on the deployed site?', 'error');
  }
}

// ── SPOTIFY TOKEN ─────────────────────────────────────────
async function getSpotifyToken() {
  if (spotifyToken) return spotifyToken;
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET),
      },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    if (data.access_token) { spotifyToken = data.access_token; return spotifyToken; }
  } catch { /* silent */ }
  return null;
}

// ── NAVIGATION ────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
  
  const targetPage = document.getElementById('page-' + id);
  const targetNav = document.querySelector(`.sidebar-nav-item[data-page="${id}"]`);
  
  if (targetPage) targetPage.classList.add('active');
  if (targetNav) targetNav.classList.add('active');
  
  const titles = { artists: 'Artist Database', search: 'Spotify Search', export: 'Export Database' };
  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) titleEl.textContent = titles[id] || id;
  
  if (id === 'export') renderExportPage();
}

document.querySelectorAll('.sidebar-nav-item').forEach(item => {
  item.addEventListener('click', () => showPage(item.dataset.page));
});

// ── STATS ─────────────────────────────────────────────────
function updateStats() {
  const verified = artists.filter(a => a.is_verified && a.spotify_artist_id).length;
  const pending  = artists.filter(a => !a.is_verified || !a.spotify_artist_id).length;
  const bios     = artists.filter(a => a.bio_manual && a.bio_manual.trim()).length;
  
  const statTotal = document.getElementById('statTotal');
  const statVerified = document.getElementById('statVerified');
  const statPending = document.getElementById('statPending');
  const statBios = document.getElementById('statBios');
  
  if (statTotal) statTotal.textContent = artists.length;
  if (statVerified) statVerified.textContent = verified;
  if (statPending) statPending.textContent = pending;
  if (statBios) statBios.textContent = bios;
}

// ── RENDER TABLE ──────────────────────────────────────────
function formatStat(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n > 0 ? n.toString() : '—';
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZM', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderTable() {
  const tbody = document.getElementById('artistTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const q = searchQuery.toLowerCase();

  artists.forEach((artist, idx) => {
    const matchesSearch = !q ||
      artist.name.toLowerCase().includes(q) ||
      (artist.spotify_artist_id || '').toLowerCase().includes(q);
    const matchesFilter =
      currentFilter === 'all' ||
      (currentFilter === 'verified' && artist.is_verified && artist.spotify_artist_id) ||
      (currentFilter === 'pending'  && (!artist.is_verified || !artist.spotify_artist_id)) ||
      (currentFilter === 'bio'      && artist.bio_manual && artist.bio_manual.trim());

    const tr = document.createElement('tr');
    if (!matchesSearch || !matchesFilter) tr.classList.add('hidden');

    const hasId      = !!artist.spotify_artist_id;
    const isVerified = artist.is_verified && hasId;
    const hasBio     = !!(artist.bio_manual && artist.bio_manual.trim());

    const statusBadge = isVerified
      ? `<span class="badge badge-verified">✓ Verified</span>`
      : !hasId
        ? `<span class="badge badge-noid">No ID</span>`
        : `<span class="badge badge-pending">Pending</span>`;

    const bioCell = hasBio
      ? `<span class="bio-preview has-manual" title="${escHtml(artist.bio_manual)}">✓ ${escHtml(artist.bio_manual.slice(0, 55))}…</span>`
      : `<span class="bio-preview no-bio">No manual bio</span>`;

    tr.innerHTML = `
      <td>${artist.portrait
        ? `<img class="artist-portrait" src="${escHtml(artist.portrait)}" alt="${escHtml(artist.name)}" onerror="this.style.display='none'">`
        : `<div class="artist-portrait" style="background:var(--bg-4);border-radius:4px;"></div>`}
      </td>
      <td><div class="artist-name-cell">${escHtml(artist.name)}<small>${escHtml(artist.slug)}</small></div></td>
      <td>${statusBadge}</td>
      <td><span class="spotify-id-cell ${hasId ? '' : 'empty'}" title="${escHtml(artist.spotify_artist_id || 'Not set')}">${escHtml(artist.spotify_artist_id || 'Not set')}</span></td>
      <td>${bioCell}</td>
      <td style="color:${artist.followers > 0 ? 'var(--off-white)' : 'var(--muted)'}">${formatStat(artist.followers || 0)}</td>
      <td style="color:var(--muted);font-size:0.75rem;">${formatDate(artist.last_synced_at)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-sm btn-edit" data-idx="${idx}">Edit</button>
          ${!isVerified ? `<button class="btn-sm btn-verify" data-idx="${idx}" data-name="${escHtml(artist.name)}">Verify</button>` : ''}
          <button class="btn-sm btn-delete" data-idx="${idx}">×</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.idx)));
  });
  tbody.querySelectorAll('.btn-verify').forEach(btn => {
    btn.addEventListener('click', () => { setAssignTarget(parseInt(btn.dataset.idx), btn.dataset.name); showPage('search'); });
  });
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteArtist(parseInt(btn.dataset.idx)));
  });
  updateStats();
}

// ── FILTER & SEARCH ───────────────────────────────────────
const artistSearch = document.getElementById('artistSearch');
if (artistSearch) {
  artistSearch.addEventListener('input', e => {
    searchQuery = e.target.value; renderTable();
  });
}

document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderTable();
  });
});

// ── EDIT MODAL ────────────────────────────────────────────
function openEditModal(idx) {
  const artist = artists[idx];
  document.getElementById('editModalTitle').textContent = `Edit: ${artist.name}`;
  document.getElementById('editIndex').value     = idx;
  document.getElementById('editName').value      = artist.name;
  document.getElementById('editSlug').value      = artist.slug;
  document.getElementById('editSpotifyId').value = artist.spotify_artist_id || '';
  document.getElementById('editVerified').value  = artist.is_verified ? 'true' : 'false';
  document.getElementById('editBio').value       = artist.bio_manual || '';
  document.getElementById('idLengthHint').style.display = 'none';
  document.getElementById('editModal').classList.add('open');
}

const editSpotifyId = document.getElementById('editSpotifyId');
if (editSpotifyId) {
  editSpotifyId.addEventListener('input', e => {
    const len = e.target.value.trim().length;
    const hint = document.getElementById('idLengthHint');
    if (len > 0 && len !== 22) {
      hint.textContent = `⚠ Spotify IDs must be exactly 22 characters. Current: ${len}`;
      hint.style.display = 'block';
    } else {
      hint.style.display = 'none';
    }
  });
}

const editModalSave = document.getElementById('editModalSave');
if (editModalSave) {
  editModalSave.addEventListener('click', async () => {
    const idx       = parseInt(document.getElementById('editIndex').value);
    const spotifyId = document.getElementById('editSpotifyId').value.trim();
    if (spotifyId && spotifyId.length !== 22) { showToast('Spotify ID must be 22 characters.', 'error'); return; }

    const updates = {
      name:              document.getElementById('editName').value.trim(),
      slug:              document.getElementById('editSlug').value.trim() || slugify(document.getElementById('editName').value.trim()),
      spotify_artist_id: spotifyId || null,
      is_verified:       document.getElementById('editVerified').value === 'true',
      bio_manual:        document.getElementById('editBio').value.trim(),
      spotify_url:       spotifyId ? `https://open.spotify.com/artist/${spotifyId}` : (artists[idx].spotify_url || ''),
    };

    const btn = document.getElementById('editModalSave');
    btn.textContent = 'Saving…'; btn.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/api/artists?id=${artists[idx].id}`, {
        method: 'PUT', headers: apiHeaders(true), body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      artists[idx] = { ...artists[idx], ...updates };
      closeModals(); renderTable();
      showToast(`"${updates.name}" saved to database ✓`, 'success');
    } catch (e) {
      showToast(`Save failed: ${e.message}`, 'error');
    } finally {
      btn.textContent = 'Save Changes'; btn.disabled = false;
    }
  });
}

document.getElementById('editModalClose').addEventListener('click', closeModals);
document.getElementById('editModalCancel').addEventListener('click', closeModals);

// ── ADD MODAL ─────────────────────────────────────────────
const addArtistBtn = document.getElementById('addArtistBtn');
if (addArtistBtn) {
  addArtistBtn.addEventListener('click', () => {
    ['addName','addSpotifyId','addBio'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('addVerified').value = 'false';
    document.getElementById('addModal').classList.add('open');
  });
}

const addModalSave = document.getElementById('addModalSave');
if (addModalSave) {
  addModalSave.addEventListener('click', async () => {
    const name = document.getElementById('addName').value.trim();
    if (!name) { showToast('Artist name is required.', 'error'); return; }
    const spotifyId = document.getElementById('addSpotifyId').value.trim();
    if (spotifyId && spotifyId.length !== 22) { showToast('Spotify ID must be 22 characters.', 'error'); return; }

    const newArtist = {
      spotify_artist_id: spotifyId || null,
      name,
      slug:          slugify(name),
      bio_manual:    document.getElementById('addBio').value.trim(),
      is_verified:   document.getElementById('addVerified').value === 'true',
      spotify_url:   spotifyId ? `https://open.spotify.com/artist/${spotifyId}` : '',
      genres: [], followers: 0, popularity: 0, portrait: '', releases: [], release_count: 0,
    };

    const btn = document.getElementById('addModalSave');
    btn.textContent = 'Adding…'; btn.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/api/artists`, {
        method: 'POST', headers: apiHeaders(true), body: JSON.stringify(newArtist),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      const data = await res.json();
      artists.push({ ...newArtist, id: data.id });
      closeModals(); renderTable();
      showToast(`"${name}" added to database ✓`, 'success');
    } catch (e) {
      showToast(`Add failed: ${e.message}`, 'error');
    } finally {
      btn.textContent = 'Add Artist'; btn.disabled = false;
    }
  });
}

document.getElementById('addModalClose').addEventListener('click', closeModals);
document.getElementById('addModalCancel').addEventListener('click', closeModals);

// ── DELETE ────────────────────────────────────────────────
async function deleteArtist(idx) {
  const artist = artists[idx];
  if (!confirm(`Delete "${artist.name}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${API_BASE}/api/artists?id=${artist.id}`, {
      method: 'DELETE', headers: apiHeaders(true),
    });
    if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
    artists.splice(idx, 1);
    renderTable();
    showToast(`"${artist.name}" deleted from database.`, 'info');
  } catch (e) {
    showToast(`Delete failed: ${e.message}`, 'error');
  }
}

// ── SPOTIFY SEARCH & ASSIGN ───────────────────────────────
function setAssignTarget(idx, name) {
  assignTarget = { idx, name };
  const targetInfo = document.getElementById('assignTargetInfo');
  const targetName = document.getElementById('assignTargetName');
  if (targetInfo) targetInfo.style.display = 'block';
  if (targetName) targetName.textContent = name;
}

window.clearAssignTarget = function() {
  assignTarget = null;
  const targetInfo = document.getElementById('assignTargetInfo');
  if (targetInfo) targetInfo.style.display = 'none';
};

const spotifySearchBtn = document.getElementById('spotifySearchBtn');
if (spotifySearchBtn) {
  spotifySearchBtn.addEventListener('click', runSpotifySearch);
}
const spotifySearchInput = document.getElementById('spotifySearchInput');
if (spotifySearchInput) {
  spotifySearchInput.addEventListener('keydown', e => { if (e.key === 'Enter') runSpotifySearch(); });
}

async function runSpotifySearch() {
  const query = document.getElementById('spotifySearchInput').value.trim();
  if (!query) return;
  const container = document.getElementById('candidateContainer');
  if (!container) return;
  container.innerHTML = '<div class="search-status">Searching Spotify…</div>';
  const token = await getSpotifyToken();
  if (!token) { container.innerHTML = '<div class="search-status" style="color:var(--red)">Failed to get Spotify token.</div>'; return; }
  try {
    const searchUrl = `https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(query.toLowerCase().trim().replace(/[^\w\s]/g,''))}&type=artist&limit=6`;
    const res = await fetch(searchUrl, { headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();
    const items = data.artists?.items || [];
    if (!items.length) { container.innerHTML = '<div class="search-status">No results found.</div>'; return; }
    container.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'candidate-list';
    items.forEach(artist => {
      const card = document.createElement('div');
      card.className = 'candidate-card';
      const img = artist.images?.[0]?.url || '';
      card.innerHTML = `
        ${img ? `<img class="candidate-img" src="${escHtml(img)}" alt="${escHtml(artist.name)}" loading="lazy">` : '<div class="candidate-img"></div>'}
        <div class="candidate-info">
          <div class="candidate-name">${escHtml(artist.name)}</div>
          <div class="candidate-meta">${artist.genres?.slice(0,2).join(', ') || 'Unknown'} &nbsp;·&nbsp; ${(artist.followers?.total||0).toLocaleString()} followers</div>
          <div class="candidate-id">${escHtml(artist.id)}</div>
        </div>
        <button class="candidate-assign-btn" data-id="${escHtml(artist.id)}">${assignTarget ? 'Assign' : 'Copy ID'}</button>`;
      card.querySelector('.candidate-assign-btn').addEventListener('click', async e => {
        const spotifyId = e.target.dataset.id;
        if (assignTarget) {
          const target = artists[assignTarget.idx];
          const updates = { spotify_artist_id: spotifyId, spotify_url: `https://open.spotify.com/artist/${spotifyId}`, is_verified: true };
          e.target.textContent = 'Saving…'; e.target.disabled = true;
          try {
            const r = await fetch(`${API_BASE}/api/artists?id=${target.id}`, {
              method: 'PUT', headers: apiHeaders(true), body: JSON.stringify(updates),
            });
            if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
            Object.assign(artists[assignTarget.idx], updates);
            showToast(`ID assigned to "${target.name}" and saved to D1 ✓`, 'success');
            clearAssignTarget(); renderTable();
          } catch (err) {
            showToast(`Assign failed: ${err.message}`, 'error');
            e.target.textContent = 'Assign'; e.target.disabled = false;
          }
        } else {
          navigator.clipboard.writeText(spotifyId).then(() => showToast(`Copied: ${spotifyId}`, 'info'));
        }
      });
      list.appendChild(card);
    });
    container.appendChild(list);
  } catch (err) {
    container.innerHTML = `<div class="search-status" style="color:var(--red)">Search failed: ${escHtml(err.message)}</div>`;
  }
}

// ── EXPORT (download current DB as artists_db.js) ─────────
function renderExportPage() {
  const verified = artists.filter(a => a.is_verified && a.spotify_artist_id).length;
  const exportStatTotal = document.getElementById('exportStatTotal');
  const exportStatVerified = document.getElementById('exportStatVerified');
  if (exportStatTotal) exportStatTotal.textContent = artists.length;
  if (exportStatVerified) exportStatVerified.textContent = verified;
}

function generateDbFile() {
  const header = `/**\n * TRAVERCE — ARTISTS DATABASE (artists_db.js)\n * Exported from Admin Portal (D1): ${new Date().toISOString()}\n */\n\nexport const ARTISTS = `;
  const data = artists.map(a => {
    const { id, created_at, updated_at, ...clean } = a;
    return clean;
  });
  return header + JSON.stringify(data, null, 2) + ';\n';
}

['downloadDbBtn','quickExportBtn'].forEach(btnId => {
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.addEventListener('click', () => {
      const blob = new Blob([generateDbFile()], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'artists_db.js'; a.click();
      URL.revokeObjectURL(url);
      showToast('artists_db.js exported!', 'success');
    });
  }
});

// ── SYNC MODAL ────────────────────────────────────────────
const topSyncBtn = document.getElementById('topSyncBtn');
if (topSyncBtn) {
  topSyncBtn.addEventListener('click', () => document.getElementById('syncModal').classList.add('open'));
}
document.getElementById('syncModalClose').addEventListener('click', closeModals);
document.getElementById('syncModalClose2').addEventListener('click', closeModals);

// ── HELPERS ───────────────────────────────────────────────
function closeModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open')); }
document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeModals(); }));
function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function escHtml(str) { return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ── INIT ──────────────────────────────────────────────────
loadArtists();
