import type { APIRoute } from 'astro';
import { getPublishedPosts, getPublishedTours } from '../lib/db';

export const prerender = false;

// Tour and journal pages come from the database, so they get their own sitemap (listed in robots.txt).
export const GET: APIRoute = async ({ site }) => {
  const [tours, posts] = await Promise.all([getPublishedTours(), getPublishedPosts(500)]);
  const latest = tours.map((t) => t.updated_at).sort().at(-1);
  const urls = [
    // The All Tours listing (its filtered views are variations of this one URL, so only the base is listed).
    { path: '/tours', lastmod: latest ?? new Date().toISOString() },
    { path: '/gallery', lastmod: latest ?? new Date().toISOString() },
    ...tours.filter((t) => t.has_page).map((t) => ({ path: `/tours/${t.slug}`, lastmod: t.updated_at })),
    ...posts.filter((p) => p.body_html).map((p) => ({ path: `/blog/${p.slug}`, lastmod: p.updated_at })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${new URL(u.path, site)}</loc><lastmod>${u.lastmod.slice(0, 10)}</lastmod></url>`).join('\n')}
</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=0, s-maxage=3600' } });
};
