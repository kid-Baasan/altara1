import type { AstroGlobal } from 'astro';

/** Edge-cache public, database-driven pages for 5 minutes (browsers always revalidate). */
export const PUBLIC_CACHE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=600';

/** Mark a page as cacheable. Only plain GETs: form posts are never cached. */
export function cachePublic(Astro: AstroGlobal) {
  if (Astro.request.method === 'GET') Astro.response.headers.set('Cache-Control', PUBLIC_CACHE);
}
