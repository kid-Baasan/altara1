-- Tour categories (managed in the admin) and journal videos imported from YouTube. Additive only.

CREATE TABLE tour_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,                          -- nav / page title, e.g. Cultural Tours
  heading TEXT NOT NULL,                        -- heading above the grid
  lede TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',         -- meta description
  hero_image TEXT NOT NULL DEFAULT '',
  hero_position TEXT NOT NULL DEFAULT 'center',
  cta_image TEXT NOT NULL DEFAULT '',
  cta_text TEXT NOT NULL DEFAULT '',
  related_lede TEXT NOT NULL DEFAULT '',
  enquire_noun TEXT NOT NULL DEFAULT 'Tour',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO tour_categories (slug, label, heading, lede, description, hero_image, hero_position, cta_image, cta_text, related_lede, enquire_noun, sort_order) VALUES ('cultural', 'Cultural Tours', 'Cultural Itineraries', 'Bhutan''s culture isn''t performed for visitors — it''s lived daily, in dzong courtyards, weaving villages and monasteries still active after centuries. These six itineraries are built around meeting it directly, guided by people who grew up inside it.', 'Six private cultural itineraries through Bhutan — dzongs, festivals, weaving villages and the eastern heritage trail — each shaped around how you want to feel.', '/assets/images/image/cultural dance.webp', 'center 40%', '/assets/images/image/Khoma 130723 by Amp Sripimanwat-28.webp', 'Share a little about how you''d like to feel, and our team will shape a private Bhutan journey around it — no templates, no packages.', 'More ways to meet Bhutan''s living culture, from Altara''s Cultural Tours collection.', 'Tour', 1);
INSERT INTO tour_categories (slug, label, heading, lede, description, hero_image, hero_position, cta_image, cta_text, related_lede, enquire_noun, sort_order) VALUES ('trekking', 'Trekking Tours', 'Trekking Itineraries', '', 'Six private trekking itineraries through Bhutan — from the legendary Snowman Trek to short valley walks — each paced and shaped around how you want to feel.', '/assets/images/image/himalayas.webp', 'center 40%', '/assets/images/image/dochula 3.webp', 'Share a little about how you''d like to feel, and our team will shape a private Bhutan journey around it — no templates, no packages.', 'More ways to walk Bhutan''s high country, from Altara''s Trekking Tours collection.', 'Trek', 2);
INSERT INTO tour_categories (slug, label, heading, lede, description, hero_image, hero_position, cta_image, cta_text, related_lede, enquire_noun, sort_order) VALUES ('luxury', 'Luxury Tours', 'Luxury Journeys', '', 'Six private luxury circuits through Bhutan — lodge-to-lodge journeys, wellness retreats and heritage stays, each shaped around how you want to feel.', '/assets/images/image/Omba Ney.webp', 'center 42%', '/assets/images/image/c hero.webp', 'Tell us the pace and privacy you''re after, and our team will shape a luxury circuit around it — no templates, no packages.', 'More ways to stay in comfort, from Altara''s Luxury Tours collection.', 'Tour', 3);

CREATE TABLE videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  channel_title TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL DEFAULT '',         -- ISO date from YouTube
  is_visible INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_videos_visible_published ON videos (is_visible, published_at);
