-- ============================================================
-- TRAVERCE — D1 Database Migration 0001
-- Run via: wrangler d1 execute traverce-artists --file=migrations/0001_artists.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS artists (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  spotify_artist_id  TEXT    UNIQUE,
  name               TEXT    NOT NULL,
  slug               TEXT    UNIQUE NOT NULL,
  bio_manual         TEXT    DEFAULT '',
  is_verified        INTEGER DEFAULT 0,   -- 0 = false, 1 = true
  last_synced_at     TEXT    DEFAULT NULL,
  spotify_url        TEXT    DEFAULT '',
  genres             TEXT    DEFAULT '[]',      -- JSON stored as text
  followers          INTEGER DEFAULT 0,
  popularity         INTEGER DEFAULT 0,
  portrait           TEXT    DEFAULT '',
  releases           TEXT    DEFAULT '[]',      -- JSON stored as text
  release_count      INTEGER DEFAULT 0,
  created_at         TEXT    DEFAULT (datetime('now')),
  updated_at         TEXT    DEFAULT (datetime('now'))
);

-- Index for fast slug lookups (used by frontend routing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_slug
  ON artists(slug);

-- Index for verified artists (used by sync)
CREATE INDEX IF NOT EXISTS idx_artists_verified
  ON artists(is_verified);

-- Index for Spotify ID lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_spotify_id
  ON artists(spotify_artist_id)
  WHERE spotify_artist_id IS NOT NULL;
