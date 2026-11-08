// Photo gallery (managed in the admin). Prepared statements only.
import { db, run } from './db';

export interface GalleryImage {
  id: number;
  image_url: string;
  alt: string;
  tag: string;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
}

export interface GalleryInput {
  image_url: string;
  alt: string;
  tag: string;
}

type Row = Omit<GalleryImage, 'is_visible'> & { is_visible: number };
const toImage = (r: Row): GalleryImage => ({ ...r, is_visible: r.is_visible === 1 });

export const getVisibleGalleryImages = () =>
  run('getVisibleGalleryImages', async () => {
    const { results } = await db().prepare(`SELECT * FROM gallery_images WHERE is_visible = 1 ORDER BY sort_order, id`).all<Row>();
    return results.map(toImage);
  });

export const listAdminGalleryImages = () =>
  run('listAdminGalleryImages', async () => {
    const { results } = await db().prepare(`SELECT * FROM gallery_images ORDER BY sort_order, id`).all<Row>();
    return results.map(toImage);
  });

/** New images go to the front of the gallery (lowest sort_order). */
export const addGalleryImage = (input: GalleryInput) =>
  run('addGalleryImage', async () => {
    await db()
      .prepare(
        `INSERT INTO gallery_images (image_url, alt, tag, sort_order)
         VALUES (?, ?, ?, COALESCE((SELECT MIN(sort_order) FROM gallery_images), 1) - 1)`,
      )
      .bind(input.image_url, input.alt, input.tag)
      .run();
  });

export const updateGalleryImage = (id: number, alt: string, tag: string) =>
  run('updateGalleryImage', async () => {
    await db().prepare(`UPDATE gallery_images SET alt = ?, tag = ? WHERE id = ?`).bind(alt, tag, id).run();
  });

export const setGalleryImageVisible = (id: number, visible: boolean) =>
  run('setGalleryImageVisible', async () => {
    await db().prepare(`UPDATE gallery_images SET is_visible = ? WHERE id = ?`).bind(visible ? 1 : 0, id).run();
  });

export const deleteGalleryImage = (id: number) =>
  run('deleteGalleryImage', async () => {
    await db().prepare(`DELETE FROM gallery_images WHERE id = ?`).bind(id).run();
  });
