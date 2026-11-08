-- Photo gallery (managed in the admin). Additive only.

CREATE TABLE gallery_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url TEXT NOT NULL,                       -- /assets/images/..., /media/uploads/..., or https URL
  alt TEXT NOT NULL DEFAULT '',                  -- describes the photo for screen readers; also shown as the caption
  tag TEXT NOT NULL DEFAULT '',                  -- filter group, e.g. Landscapes
  is_visible INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_gallery_visible_sort ON gallery_images (is_visible, sort_order);
