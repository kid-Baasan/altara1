// Filtering + sorting for the public "All Tours" page. Driven by URL query params, validated against whitelists.
import type { Tour } from './db';

export const DURATIONS = [
  { value: 'short', label: 'Up to 5 days', test: (d: number) => d <= 5 },
  { value: 'medium', label: '6 – 9 days', test: (d: number) => d >= 6 && d <= 9 },
  { value: 'long', label: '10+ days', test: (d: number) => d >= 10 },
] as const;

export const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'shortest', label: 'Shortest first' },
  { value: 'longest', label: 'Longest first' },
  { value: 'az', label: 'A – Z' },
] as const;

export interface TourFilters {
  category: string; // '' = all
  duration: string; // '' = any
  q: string;
  sort: string;
}

/** Read and sanitise the filters from a URL. Unknown values fall back to "no filter". */
export function readFilters(url: URL, categorySlugs: string[]): TourFilters {
  const p = url.searchParams;
  const category = p.get('category') ?? '';
  const duration = p.get('duration') ?? '';
  const sort = p.get('sort') ?? '';
  return {
    category: categorySlugs.includes(category) ? category : '',
    duration: DURATIONS.some((d) => d.value === duration) ? duration : '',
    q: (p.get('q') ?? '').trim().slice(0, 80),
    sort: SORTS.some((s) => s.value === sort) ? sort : 'featured',
  };
}

export function applyFilters(tours: Tour[], f: TourFilters): Tour[] {
  const q = f.q.toLowerCase();
  const dur = DURATIONS.find((d) => d.value === f.duration);
  const out = tours.filter(
    (t) =>
      (!f.category || t.category === f.category) &&
      (!dur || dur.test(t.duration_days)) &&
      (!q || `${t.title} ${t.summary} ${t.districts.join(' ')}`.toLowerCase().includes(q)),
  );
  if (f.sort === 'shortest') out.sort((a, b) => a.duration_days - b.duration_days);
  else if (f.sort === 'longest') out.sort((a, b) => b.duration_days - a.duration_days);
  else if (f.sort === 'az') out.sort((a, b) => a.title.localeCompare(b.title));
  return out;
}

/** A link to /tours with some filters changed; defaults are left out to keep URLs clean. */
export function filterHref(current: TourFilters, change: Partial<TourFilters>): string {
  const f = { ...current, ...change };
  const p = new URLSearchParams();
  if (f.category) p.set('category', f.category);
  if (f.duration) p.set('duration', f.duration);
  if (f.q) p.set('q', f.q);
  if (f.sort && f.sort !== 'featured') p.set('sort', f.sort);
  const qs = p.toString();
  return qs ? `/tours?${qs}` : '/tours';
}
