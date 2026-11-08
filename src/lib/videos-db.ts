// Videos imported from YouTube. Prepared statements only.
import { db, run } from './db';

export interface Video {
  id: number;
  youtube_id: string;
  title: string;
  channel_title: string;
  published_at: string;
  is_visible: boolean;
  created_at: string;
}

export interface VideoInput {
  youtube_id: string;
  title: string;
  channel_title: string;
  published_at: string;
}

type VideoRow = Omit<Video, 'is_visible'> & { is_visible: number };
const toVideo = (r: VideoRow): Video => ({ ...r, is_visible: r.is_visible === 1 });

export const getVisibleVideos = () =>
  run('getVisibleVideos', async () => {
    const { results } = await db().prepare(`SELECT * FROM videos WHERE is_visible = 1 ORDER BY published_at DESC, id DESC`).all<VideoRow>();
    return results.map(toVideo);
  });

export const listAdminVideos = () =>
  run('listAdminVideos', async () => {
    const { results } = await db().prepare(`SELECT * FROM videos ORDER BY published_at DESC, id DESC`).all<VideoRow>();
    return results.map(toVideo);
  });

/** Adds videos that are not stored yet (existing ones are left alone). Returns how many were new. */
export const importVideos = (videos: VideoInput[]) =>
  run('importVideos', async () => {
    if (videos.length === 0) return 0;
    const count = async () => (await db().prepare(`SELECT COUNT(*) AS n FROM videos`).first<{ n: number }>())?.n ?? 0;
    const before = await count();
    await db().batch(
      videos.map((v) =>
        db()
          .prepare(`INSERT OR IGNORE INTO videos (youtube_id, title, channel_title, published_at) VALUES (?, ?, ?, ?)`)
          .bind(v.youtube_id, v.title, v.channel_title, v.published_at),
      ),
    );
    return (await count()) - before;
  });

export const setVideoVisible = (id: number, visible: boolean) =>
  run('setVideoVisible', async () => {
    await db().prepare(`UPDATE videos SET is_visible = ? WHERE id = ?`).bind(visible ? 1 : 0, id).run();
  });

export const deleteVideo = (id: number) =>
  run('deleteVideo', async () => {
    await db().prepare(`DELETE FROM videos WHERE id = ?`).bind(id).run();
  });
