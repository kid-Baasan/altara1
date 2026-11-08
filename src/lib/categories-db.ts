// Tour categories (managed in the admin). Prepared statements only.
import { db, run } from './db';

export interface TourCategory {
  id: number;
  slug: string;
  label: string;
  heading: string;
  lede: string;
  description: string;
  hero_image: string;
  hero_position: string;
  cta_image: string;
  cta_text: string;
  related_lede: string;
  enquire_noun: string;
  sort_order: number;
}

export type TourCategoryInput = Omit<TourCategory, 'id'>;

/** Where a category's listing page lives. The original three keep their own short URLs. */
export const categoryPath = (slug: string) =>
  ['cultural', 'trekking', 'luxury'].includes(slug) ? `/${slug}-tours` : `/tours/category/${slug}`;

export const listCategories = () =>
  run('listCategories', async () => {
    const { results } = await db().prepare(`SELECT * FROM tour_categories ORDER BY sort_order, id`).all<TourCategory>();
    return results;
  });

export const getCategoryBySlug = (slug: string) =>
  run('getCategoryBySlug', async () => db().prepare(`SELECT * FROM tour_categories WHERE slug = ?`).bind(slug).first<TourCategory>());

export const getCategoryById = (id: number) =>
  run('getCategoryById', async () => db().prepare(`SELECT * FROM tour_categories WHERE id = ?`).bind(id).first<TourCategory>());

export const isCategorySlugTaken = (slug: string, exceptId?: number) =>
  run('isCategorySlugTaken', async () => {
    const row = await db().prepare(`SELECT id FROM tour_categories WHERE slug = ? AND id != ?`).bind(slug, exceptId ?? 0).first();
    return row !== null;
  });

const columns = (c: TourCategoryInput) => [
  c.slug, c.label, c.heading, c.lede, c.description, c.hero_image, c.hero_position, c.cta_image, c.cta_text,
  c.related_lede, c.enquire_noun, c.sort_order,
];

export const createCategory = (input: TourCategoryInput) =>
  run('createCategory', async () => {
    const row = await db()
      .prepare(
        `INSERT INTO tour_categories (slug, label, heading, lede, description, hero_image, hero_position, cta_image, cta_text,
           related_lede, enquire_noun, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      )
      .bind(...columns(input))
      .first<{ id: number }>();
    if (!row) throw new Error('Insert returned no row');
    return row.id;
  });

/** Renaming the slug also moves the category's tours, in one batch. */
export const updateCategory = (id: number, oldSlug: string, input: TourCategoryInput) =>
  run('updateCategory', async () => {
    await db().batch([
      db()
        .prepare(
          `UPDATE tour_categories SET slug = ?, label = ?, heading = ?, lede = ?, description = ?, hero_image = ?, hero_position = ?,
             cta_image = ?, cta_text = ?, related_lede = ?, enquire_noun = ?, sort_order = ? WHERE id = ?`,
        )
        .bind(...columns(input), id),
      db().prepare(`UPDATE tours SET category = ? WHERE category = ?`).bind(input.slug, oldSlug),
    ]);
  });

export const countToursInCategory = (slug: string) =>
  run('countToursInCategory', async () => {
    const row = await db().prepare(`SELECT COUNT(*) AS n FROM tours WHERE category = ?`).bind(slug).first<{ n: number }>();
    return row?.n ?? 0;
  });

/** Only empty categories are deleted, so no tour is ever left without a category. */
export const deleteCategory = (id: number) =>
  run('deleteCategory', async () => {
    await db()
      .prepare(`DELETE FROM tour_categories WHERE id = ? AND NOT EXISTS (SELECT 1 FROM tours WHERE category = tour_categories.slug)`)
      .bind(id)
      .run();
  });
