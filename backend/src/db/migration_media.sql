-- ============================================================
--  FreshCut ERP — Image/Media Management
--  Migration: Add to existing schema
-- ============================================================

-- ── Enum for modules that support images ────────────────────
CREATE TYPE media_module AS ENUM (
  'product','raw_material','work_order','qc_record',
  'loss_record','sales_order','delivery_note','grn',
  'supplier','customer','employee','shortfall','import'
);

CREATE TYPE media_type AS ENUM ('image','document','video');

-- ── Central media table ──────────────────────────────────────
CREATE TABLE media (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module       media_module NOT NULL,
  record_id    UUID NOT NULL,             -- FK to any module record
  filename     VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path    TEXT NOT NULL,             -- relative path on disk / S3 key
  file_url     TEXT,                      -- public URL (S3 / CDN)
  file_size    INTEGER,
  mime_type    VARCHAR(100),
  media_type   media_type NOT NULL DEFAULT 'image',
  width        INTEGER,                   -- px (images only)
  height       INTEGER,                  -- px (images only)
  is_primary   BOOLEAN NOT NULL DEFAULT false,
  alt_text     VARCHAR(500),
  caption      TEXT,
  uploaded_by  UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one primary image per record
CREATE UNIQUE INDEX idx_media_primary
  ON media(module, record_id)
  WHERE is_primary = true;

CREATE INDEX idx_media_module_record ON media(module, record_id);
CREATE INDEX idx_media_uploaded_by   ON media(uploaded_by);
CREATE INDEX idx_media_created       ON media(created_at);

-- ── Thumbnail metadata (stored separately for performance) ──
CREATE TABLE media_thumbnails (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id   UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  size       VARCHAR(20) NOT NULL,  -- 'sm'(80px), 'md'(300px), 'lg'(800px)
  file_path  TEXT NOT NULL,
  file_url   TEXT,
  width      INTEGER,
  height     INTEGER
);

CREATE INDEX idx_thumbs_media ON media_thumbnails(media_id);
