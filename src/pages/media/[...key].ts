import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

// Serves uploaded tour photos from R2. Only files under uploads/ are public.
export const GET: APIRoute = async ({ params }) => {
  const key = params.key ?? '';
  if (!/^uploads\/[a-f0-9-]+\.(jpg|png|webp|avif)$/.test(key)) return new Response('Not found', { status: 404 });

  const object = await env.MEDIA.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      // File names are random and never reused, so they can be cached forever.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ETag: object.httpEtag,
    },
  });
};
