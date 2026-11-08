// D1 data layer. Every query is a prepared statement with bound parameters: never build SQL by concatenation.
// Errors are logged server-side and rethrown as a generic message so details never reach visitors.
import { env } from 'cloudflare:workers';

export type Status = 'draft' | 'published';

export interface ItineraryDay {
  id?: number;
  day_number: number;
  title: string;
  description: string;
  driving: string;
  elevation: string;
  attractions: string[];
  overnight: string;
}

/** What an admin writes for one day (day numbers come from the row order). */
export type ItineraryDayInput = Omit<ItineraryDay, 'id' | 'day_number'>;

type ItineraryDayRow = Omit<ItineraryDay, 'attractions'> & { attractions: string };
const parseList = (json: string): string[] => {
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

export interface TourFact {
  icon: string;
  label: string;
  value: string;
}

export interface TourFaq {
  question: string;
  answer: string;
}

export interface Tour {
  id: number;
  title: string;
  slug: string;
  category: string;
  duration_days: number;
  summary: string;
  cover_image_url: string;
  cover_image_alt: string;
  hero_position: string;
  card_position: string;
  max_altitude: string;
  has_page: boolean;
  overview_title: string;
  overview: string;
  highlights: string[];
  facts: TourFact[];
  facts_note: string;
  pack_title: string;
  pack_text: string;
  inclusions: string[];
  exclusions: string[];
  extras_title: string;
  extras: string[];
  inclusions_note: string;
  faqs: TourFaq[];
  districts: string[];
  cost_title: string;
  cost_text: string;
  status: Status;
  sort_order: number;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
}

export interface TourWithDetails extends Tour {
  itinerary: ItineraryDay[];
}

/** Fields an admin can write. The itinerary is replaced as a whole on save. */
export type TourInput = Omit<Tour, 'id' | 'created_at' | 'updated_at'> & {
  itinerary: ItineraryDayInput[];
};

export interface Post {
  id: number;
  title: string;
  slug: string;
  published_on: string;
  author: string;
  cover_image_url: string;
  cover_image_alt: string;
  hero_position: string;
  body_html: string;
  status: Status;
  seo_description: string;
  created_at: string;
  updated_at: string;
}

export type PostInput = Omit<Post, 'id' | 'created_at' | 'updated_at'>;

export interface Enquiry {
  id: number;
  tour_id: number | null;
  tour_title: string | null;
  tour_slug: string | null;
  purpose: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  preferred_dates: string;
  travellers: number | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface EnquiryInput {
  tour_id: number | null;
  purpose: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  preferred_dates: string;
  travellers: number | null;
  message: string;
}

export interface AdminTourRow {
  id: number;
  title: string;
  slug: string;
  category: string;
  status: Status;
  has_page: boolean;
  duration_days: number;
  updated_at: string;
}

export interface AdminPostRow {
  id: number;
  title: string;
  slug: string;
  status: Status;
  published_on: string;
  updated_at: string;
}

type JsonColumns = 'highlights' | 'facts' | 'extras' | 'inclusions' | 'exclusions' | 'faqs' | 'districts';
type TourRow = Omit<Tour, JsonColumns | 'has_page'> & Record<JsonColumns, string> & { has_page: number };
type EnquiryRow = Omit<Enquiry, 'is_read'> & { is_read: number };

export const db = () => env.DB;

/** Log details on the server and throw a generic error. */
export async function run<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[db] ${label} failed:`, error);
    throw new Error('Database error');
  }
}

function parseJson<T>(json: string, keep: (value: unknown) => value is T): T[] {
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) ? value.filter(keep) : [];
  } catch {
    return [];
  }
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isFact = (v: unknown): v is TourFact => isObject(v) && isString(v.icon) && isString(v.label) && isString(v.value);
const isFaq = (v: unknown): v is TourFaq => isObject(v) && isString(v.question) && isString(v.answer);

const toTour = (row: TourRow): Tour => ({
  ...row,
  has_page: row.has_page === 1,
  highlights: parseJson(row.highlights, isString),
  facts: parseJson(row.facts, isFact),
  inclusions: parseJson(row.inclusions, isString),
  exclusions: parseJson(row.exclusions, isString),
  extras: parseJson(row.extras, isString),
  faqs: parseJson(row.faqs, isFaq),
  districts: parseJson(row.districts, isString),
});

const toEnquiry = (row: EnquiryRow): Enquiry => ({ ...row, is_read: row.is_read === 1 });

// ---------- Public reads (published only) ----------

export const getPublishedTours = () =>
  run('getPublishedTours', async () => {
    const { results } = await db()
      .prepare(`SELECT * FROM tours WHERE status = 'published' ORDER BY category, sort_order, id`)
      .all<TourRow>();
    return results.map(toTour);
  });

export const getToursByCategory = (category: string) =>
  run('getToursByCategory', async () => {
    const { results } = await db()
      .prepare(`SELECT * FROM tours WHERE status = 'published' AND category = ? ORDER BY sort_order, id`)
      .bind(category)
      .all<TourRow>();
    return results.map(toTour);
  });

/** Other published tours in the same category, for the "Related Tours" slider. */
export const getRelatedTours = (category: string, exceptId: number) =>
  run('getRelatedTours', async () => {
    const { results } = await db()
      .prepare(`SELECT * FROM tours WHERE status = 'published' AND category = ? AND id != ? ORDER BY sort_order, id`)
      .bind(category, exceptId)
      .all<TourRow>();
    return results.map(toTour);
  });

async function withItinerary(row: TourRow | null): Promise<TourWithDetails | null> {
  if (!row) return null;
  const { results } = await db()
    .prepare(
      `SELECT id, day_number, title, description, driving, elevation, attractions, overnight
       FROM itinerary_days WHERE tour_id = ? ORDER BY day_number`,
    )
    .bind(row.id)
    .all<ItineraryDayRow>();
  return { ...toTour(row), itinerary: results.map((d) => ({ ...d, attractions: parseList(d.attractions) })) };
}

/** Published tour by slug, with its itinerary. Returns null for missing or draft tours. */
export const getTourBySlug = (slug: string) =>
  run('getTourBySlug', async () =>
    withItinerary(await db().prepare(`SELECT * FROM tours WHERE slug = ? AND status = 'published'`).bind(slug).first<TourRow>()),
  );

export const getPublishedPosts = (limit = 50) =>
  run('getPublishedPosts', async () => {
    const { results } = await db()
      .prepare(`SELECT * FROM posts WHERE status = 'published' ORDER BY published_on DESC, id DESC LIMIT ?`)
      .bind(limit)
      .all<Post>();
    return results;
  });

export const getPostBySlug = (slug: string) =>
  run('getPostBySlug', async () =>
    db().prepare(`SELECT * FROM posts WHERE slug = ? AND status = 'published'`).bind(slug).first<Post>(),
  );

// ---------- Admin: tours ----------

/** Any status. For the admin edit form. */
export const getTourById = (id: number) =>
  run('getTourById', async () =>
    withItinerary(await db().prepare(`SELECT * FROM tours WHERE id = ?`).bind(id).first<TourRow>()),
  );

export const listAdminTours = (search = '', category = '') =>
  run('listAdminTours', async () => {
    const term = `%${search.trim().replace(/[\\%_]/g, '\\$&')}%`;
    const { results } = await db()
      .prepare(
        `SELECT id, title, slug, category, status, has_page, duration_days, updated_at
         FROM tours WHERE (title LIKE ?1 ESCAPE '\\' OR slug LIKE ?1 ESCAPE '\\') AND (?2 = '' OR category = ?2)
         ORDER BY category, sort_order, id`,
      )
      .bind(term, category)
      .all<Omit<AdminTourRow, 'has_page'> & { has_page: number }>();
    return results.map((r): AdminTourRow => ({ ...r, has_page: r.has_page === 1 }));
  });

export const isSlugTaken = (slug: string, exceptId?: number) =>
  run('isSlugTaken', async () => {
    const row = await db()
      .prepare(`SELECT id FROM tours WHERE slug = ? AND id != ?`)
      .bind(slug, exceptId ?? 0)
      .first();
    return row !== null;
  });

const tourColumns = (t: TourInput) => [
  t.title, t.slug, t.category, t.duration_days, t.summary, t.cover_image_url, t.cover_image_alt, t.hero_position,
  t.card_position, t.max_altitude, t.has_page ? 1 : 0, t.overview_title, t.overview, JSON.stringify(t.highlights),
  JSON.stringify(t.facts), t.facts_note, t.pack_title, t.pack_text, JSON.stringify(t.inclusions), JSON.stringify(t.exclusions),
  t.extras_title, JSON.stringify(t.extras), t.inclusions_note, JSON.stringify(t.faqs), JSON.stringify(t.districts), t.cost_title, t.cost_text, t.status, t.sort_order,
  t.seo_title, t.seo_description,
];

const insertSql = `INSERT INTO tours (title, slug, category, duration_days, summary, cover_image_url, cover_image_alt, hero_position,
  card_position, max_altitude, has_page, overview_title, overview, highlights, facts, facts_note, pack_title, pack_text, inclusions,
  exclusions, extras_title, extras, inclusions_note, faqs, districts, cost_title, cost_text, status, sort_order, seo_title, seo_description)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`;

const updateSql = `UPDATE tours SET title = ?, slug = ?, category = ?, duration_days = ?, summary = ?, cover_image_url = ?,
  cover_image_alt = ?, hero_position = ?, card_position = ?, max_altitude = ?, has_page = ?, overview_title = ?, overview = ?,
  highlights = ?, facts = ?, facts_note = ?, pack_title = ?, pack_text = ?, inclusions = ?, exclusions = ?, extras_title = ?, extras = ?, inclusions_note = ?, faqs = ?, districts = ?,
  cost_title = ?, cost_text = ?, status = ?, sort_order = ?, seo_title = ?, seo_description = ?, updated_at = datetime('now')
  WHERE id = ?`;

/** Itinerary rows for a tour, as statements. `tourId` is bound, so this works inside a batch for updates. */
const dayStatements = (tourId: number, t: TourInput) =>
  t.itinerary.map((d, i) =>
    db()
      .prepare(
        `INSERT INTO itinerary_days (tour_id, day_number, title, description, driving, elevation, attractions, overnight)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(tourId, i + 1, d.title, d.description, d.driving, d.elevation, JSON.stringify(d.attractions), d.overnight),
  );

/** Creates a tour with its itinerary. Returns the new id. */
export const createTour = (input: TourInput) =>
  run('createTour', async () => {
    const insert = await db()
      .prepare(insertSql)
      .bind(...tourColumns(input))
      .first<{ id: number }>();
    if (!insert) throw new Error('Insert returned no row');
    const days = dayStatements(insert.id, input);
    if (days.length) await db().batch(days);
    return insert.id;
  });

/**
 * Updates a tour and replaces its itinerary, all in one D1 batch (one transaction).
 * The itinerary DELETE is an application-level replace of that tour's own rows, not a schema change.
 */
export const updateTour = (id: number, input: TourInput) =>
  run('updateTour', async () => {
    await db().batch([
      db()
        .prepare(updateSql)
        .bind(...tourColumns(input), id),
      db().prepare(`DELETE FROM itinerary_days WHERE tour_id = ?`).bind(id),
      ...dayStatements(id, input),
    ]);
  });

export const deleteTour = (id: number) =>
  run('deleteTour', async () => {
    // itinerary_days go with it (ON DELETE CASCADE); enquiries keep their text (tour_id set to NULL).
    await db().prepare(`DELETE FROM tours WHERE id = ?`).bind(id).run();
  });

/** Copies a tour as a draft with a unique slug. Returns the new id, or null if the source is missing. */
export const duplicateTour = (id: number) =>
  run('duplicateTour', async () => {
    const source = await getTourById(id);
    if (!source) return null;
    const base = `${source.slug}-copy`;
    let slug = base;
    for (let n = 2; await isSlugTaken(slug); n++) slug = `${base}-${n}`;
    return createTour({ ...source, title: `${source.title} (copy)`, slug, status: 'draft' });
  });

// ---------- Admin: journal posts ----------

export const listAdminPosts = () =>
  run('listAdminPosts', async () => {
    const { results } = await db()
      .prepare(`SELECT id, title, slug, status, published_on, updated_at FROM posts ORDER BY published_on DESC, id DESC`)
      .all<AdminPostRow>();
    return results;
  });

export const getPostById = (id: number) =>
  run('getPostById', async () => db().prepare(`SELECT * FROM posts WHERE id = ?`).bind(id).first<Post>());

export const isPostSlugTaken = (slug: string, exceptId?: number) =>
  run('isPostSlugTaken', async () => {
    const row = await db()
      .prepare(`SELECT id FROM posts WHERE slug = ? AND id != ?`)
      .bind(slug, exceptId ?? 0)
      .first();
    return row !== null;
  });

const postColumns = (p: PostInput) => [
  p.title, p.slug, p.published_on, p.author, p.cover_image_url, p.cover_image_alt, p.hero_position, p.body_html, p.status,
  p.seo_description,
];

export const createPost = (input: PostInput) =>
  run('createPost', async () => {
    const row = await db()
      .prepare(
        `INSERT INTO posts (title, slug, published_on, author, cover_image_url, cover_image_alt, hero_position, body_html, status, seo_description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      )
      .bind(...postColumns(input))
      .first<{ id: number }>();
    if (!row) throw new Error('Insert returned no row');
    return row.id;
  });

export const updatePost = (id: number, input: PostInput) =>
  run('updatePost', async () => {
    await db()
      .prepare(
        `UPDATE posts SET title = ?, slug = ?, published_on = ?, author = ?, cover_image_url = ?, cover_image_alt = ?,
           hero_position = ?, body_html = ?, status = ?, seo_description = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .bind(...postColumns(input), id)
      .run();
  });

export const deletePost = (id: number) =>
  run('deletePost', async () => {
    await db().prepare(`DELETE FROM posts WHERE id = ?`).bind(id).run();
  });

// ---------- Enquiries ----------

export const createEnquiry = (input: EnquiryInput) =>
  run('createEnquiry', async () => {
    await db()
      .prepare(
        `INSERT INTO enquiries (tour_id, purpose, name, email, phone, country, preferred_dates, travellers, message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(input.tour_id, input.purpose, input.name, input.email, input.phone, input.country, input.preferred_dates, input.travellers, input.message)
      .run();
  });

const enquirySelect = `SELECT e.id, e.tour_id, t.title AS tour_title, t.slug AS tour_slug, e.purpose, e.name, e.email, e.phone,
  e.country, e.preferred_dates, e.travellers, e.message, e.is_read, e.created_at
  FROM enquiries e LEFT JOIN tours t ON t.id = e.tour_id`;

export const listEnquiries = (limit = 100) =>
  run('listEnquiries', async () => {
    const { results } = await db()
      .prepare(`${enquirySelect} ORDER BY e.created_at DESC, e.id DESC LIMIT ?`)
      .bind(limit)
      .all<EnquiryRow>();
    return results.map(toEnquiry);
  });

export const getEnquiry = (id: number) =>
  run('getEnquiry', async () => {
    const row = await db().prepare(`${enquirySelect} WHERE e.id = ?`).bind(id).first<EnquiryRow>();
    return row ? toEnquiry(row) : null;
  });

export const markEnquiryRead = (id: number) =>
  run('markEnquiryRead', async () => {
    await db().prepare(`UPDATE enquiries SET is_read = 1 WHERE id = ?`).bind(id).run();
  });

// ---------- Admin: dashboard ----------

export const getDashboardCounts = () =>
  run('getDashboardCounts', async () => {
    const row = await db()
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM tours WHERE status = 'published') AS published,
           (SELECT COUNT(*) FROM tours WHERE status = 'draft') AS drafts,
           (SELECT COUNT(*) FROM posts WHERE status = 'published') AS posts,
           (SELECT COUNT(*) FROM enquiries WHERE is_read = 0) AS unread`,
      )
      .first<{ published: number; drafts: number; posts: number; unread: number }>();
    return row ?? { published: 0, drafts: 0, posts: 0, unread: 0 };
  });
