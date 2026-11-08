// Pulls videos from a YouTube channel link (or a single video link) without an API key, using YouTube's public
// channel RSS feed (latest ~15 uploads) and oEmbed. We only ever request youtube.com URLs that we build ourselves
// from validated ids, so a pasted link can never make the server fetch an arbitrary address.
import type { VideoInput } from './videos-db';

const CHANNEL_ID = /^UC[\w-]{22}$/;
const VIDEO_ID = /^[\w-]{11}$/;
const HANDLE = /^[A-Za-z0-9._-]{1,60}$/;
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; AltaraBot/1.0)', 'Accept-Language': 'en', Cookie: 'CONSENT=YES+1' };

/** A problem we can show to the admin as-is. */
export class YouTubeError extends Error {}

type Target = { kind: 'video'; id: string } | { kind: 'channel'; id: string } | { kind: 'handle'; path: string };

/** Work out what a pasted link points at. */
export function parseYouTubeInput(raw: string): Target {
  const text = raw.trim();
  if (CHANNEL_ID.test(text)) return { kind: 'channel', id: text };
  if (/^@[A-Za-z0-9._-]{1,60}$/.test(text)) return { kind: 'handle', path: text };

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    throw new YouTubeError('That does not look like a YouTube link.');
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  if (host !== 'youtube.com' && host !== 'youtu.be') throw new YouTubeError('Please paste a youtube.com or youtu.be link.');

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    if (VIDEO_ID.test(id)) return { kind: 'video', id };
  }
  const v = url.searchParams.get('v');
  if (v && VIDEO_ID.test(v)) return { kind: 'video', id: v };
  const parts = url.pathname.split('/').filter(Boolean);
  if (['shorts', 'embed', 'live'].includes(parts[0]) && VIDEO_ID.test(parts[1] ?? '')) return { kind: 'video', id: parts[1] };
  if (parts[0] === 'channel' && CHANNEL_ID.test(parts[1] ?? '')) return { kind: 'channel', id: parts[1] };
  if (parts[0]?.startsWith('@') && HANDLE.test(parts[0].slice(1))) return { kind: 'handle', path: parts[0] };
  if ((parts[0] === 'c' || parts[0] === 'user') && HANDLE.test(parts[1] ?? '')) return { kind: 'handle', path: `${parts[0]}/${parts[1]}` };
  throw new YouTubeError('Could not find a channel or video in that link.');
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new YouTubeError(`YouTube answered with an error (${res.status}). Check the link and try again.`);
  return res.text();
}

async function channelIdFromHandle(path: string): Promise<string> {
  const html = await fetchText(`https://www.youtube.com/${path}`);
  const match = html.match(/"(?:channelId|externalId)":"(UC[\w-]{22})"/) ?? html.match(/channel\/(UC[\w-]{22})/);
  if (!match) throw new YouTubeError("Could not find that channel. Try the channel's youtube.com/channel/UC… link instead.");
  return match[1];
}

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();

async function channelVideos(channelId: string): Promise<VideoInput[]> {
  const xml = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  const channelTitle = decode(xml.match(/<author>\s*<name>([\s\S]*?)<\/name>/)?.[1] ?? '');
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].flatMap((e) => {
    const id = e[1].match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
    const title = decode(e[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
    const published = e[1].match(/<published>([^<]+)<\/published>/)?.[1] ?? '';
    return id && title
      ? [{ youtube_id: id, title: title.slice(0, 200), channel_title: channelTitle.slice(0, 100), published_at: published.slice(0, 10) }]
      : [];
  });
}

async function singleVideo(id: string): Promise<VideoInput[]> {
  const watch = `https://www.youtube.com/watch?v=${id}`;
  const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`, { headers: HEADERS });
  if (!res.ok) throw new YouTubeError('Could not read that video. It may be private or removed.');
  const data = (await res.json()) as { title?: string; author_name?: string };
  return [
    {
      youtube_id: id,
      title: (data.title ?? 'Untitled video').slice(0, 200),
      channel_title: (data.author_name ?? '').slice(0, 100),
      published_at: new Date().toISOString().slice(0, 10),
    },
  ];
}

/** Resolve a pasted link to the videos it points at. */
export async function fetchVideosFromLink(raw: string): Promise<VideoInput[]> {
  const target = parseYouTubeInput(raw);
  if (target.kind === 'video') return singleVideo(target.id);
  const channelId = target.kind === 'channel' ? target.id : await channelIdFromHandle(target.path);
  const videos = await channelVideos(channelId);
  if (videos.length === 0) throw new YouTubeError('That channel has no public videos to import.');
  return videos;
}
