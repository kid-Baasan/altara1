-- Initial schema for Altara: tours (with itinerary), journal posts, enquiries.
-- Additive only. Never add DROP/DELETE statements to a migration.

CREATE TABLE tours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'cultural',   -- slug of a row in tour_categories
  duration_days INTEGER NOT NULL DEFAULT 1 CHECK (duration_days >= 1),
  summary TEXT NOT NULL DEFAULT '',            -- hero sub-line on the tour page
  cover_image_url TEXT NOT NULL DEFAULT '',    -- card photo and hero photo
  cover_image_alt TEXT NOT NULL DEFAULT '',
  hero_position TEXT NOT NULL DEFAULT 'center', -- CSS background-position for the hero crop
  card_position TEXT NOT NULL DEFAULT '',      -- CSS background-position for the card crop (empty = default)
  max_altitude TEXT NOT NULL DEFAULT '',       -- shown on the card, e.g. 4,210m
  has_page INTEGER NOT NULL DEFAULT 0 CHECK (has_page IN (0, 1)), -- 0: card links to the enquiry form instead
  overview_title TEXT NOT NULL DEFAULT '',
  overview TEXT NOT NULL DEFAULT '',
  highlights TEXT NOT NULL DEFAULT '[]',       -- JSON array of strings
  facts TEXT NOT NULL DEFAULT '[]',            -- JSON array of {icon, label, value}
  facts_note TEXT NOT NULL DEFAULT '',         -- small print under the trip facts
  pack_title TEXT NOT NULL DEFAULT '',
  pack_text TEXT NOT NULL DEFAULT '',
  inclusions TEXT NOT NULL DEFAULT '[]',       -- JSON array of strings
  exclusions TEXT NOT NULL DEFAULT '[]',       -- JSON array of strings
  extras_title TEXT NOT NULL DEFAULT '',        -- heading of an optional third list, e.g. Trek Cost Includes
  extras TEXT NOT NULL DEFAULT '[]',           -- JSON array of strings
  inclusions_note TEXT NOT NULL DEFAULT '',    -- small print under the included/excluded lists
  faqs TEXT NOT NULL DEFAULT '[]',             -- JSON array of {question, answer}
  districts TEXT NOT NULL DEFAULT '[]',        -- JSON array of district names on the map
  cost_title TEXT NOT NULL DEFAULT 'Package Cost',
  cost_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tours_slug ON tours (slug);
CREATE INDEX idx_tours_status_category ON tours (status, category, sort_order);

CREATE TABLE itinerary_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours (id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_itinerary_days_tour_id ON itinerary_days (tour_id);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  published_on TEXT NOT NULL,                  -- YYYY-MM-DD
  author TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT NOT NULL DEFAULT '',
  cover_image_alt TEXT NOT NULL DEFAULT '',
  hero_position TEXT NOT NULL DEFAULT 'center',
  body_html TEXT NOT NULL DEFAULT '',          -- article body; empty means the card has no article page yet
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  seo_description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_posts_status_date ON posts (status, published_on);

CREATE TABLE enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER REFERENCES tours (id) ON DELETE SET NULL,
  purpose TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  preferred_dates TEXT NOT NULL DEFAULT '',
  travellers INTEGER,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_enquiries_tour_id ON enquiries (tour_id);
CREATE INDEX idx_enquiries_is_read ON enquiries (is_read);
