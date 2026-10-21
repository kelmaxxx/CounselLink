-- Migration 039: Keep uploaded pubmat bytes in the database.
-- Local disk on ephemeral hosts (Render free tier etc.) is wiped on every
-- redeploy, which is why announcement pubmats disappeared while their
-- /uploads/... URL stayed in the announcements table. Files are still written
-- to disk (fast static serving), and this table is the durable fallback that
-- /uploads/pubmats/:file is served from when the disk copy is gone.

USE counselink;

CREATE TABLE IF NOT EXISTS upload_blobs (
  url         VARCHAR(255) NOT NULL PRIMARY KEY,
  mime_type   VARCHAR(100) NOT NULL,
  data        LONGBLOB     NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
