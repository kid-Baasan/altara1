import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Work out the real image type from the file's first bytes, never from the name or declared type. */
function sniff(bytes: Uint8Array): { type: string; ext: string } | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return { type: 'image/png', ext: 'png' };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { type: 'image/webp', ext: 'webp' };
  if (ascii(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 12))) return { type: 'image/avif', ext: 'avif' };
  return null;
}

const json = (body: Record<string, string>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Only reachable when logged in: the middleware protects every /admin route.
export const POST: APIRoute = async ({ request }) => {
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get('file');
  } catch {
    return json({ error: 'Could not read the upload.' }, 400);
  }
  if (!(file instanceof File) || file.size === 0) return json({ error: 'Choose an image to upload.' }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'That image is larger than 5 MB.' }, 413);

  const buffer = await file.arrayBuffer();
  const kind = sniff(new Uint8Array(buffer.slice(0, 16)));
  if (!kind) return json({ error: 'Use a JPG, PNG, WebP or AVIF image.' }, 415);

  const name = `${crypto.randomUUID()}.${kind.ext}`;
  try {
    await env.MEDIA.put(`uploads/${name}`, buffer, { httpMetadata: { contentType: kind.type } });
  } catch (error) {
    console.error('[upload] failed:', error);
    return json({ error: 'Upload failed. Please try again.' }, 500);
  }
  return json({ url: `/media/uploads/${name}` });
};
