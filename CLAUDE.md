# CLAUDE.md

## Project

**Altara** — a luxury, private-journey travel brand built around the Kingdom of Bhutan. This is the Astro rebuild of the
original plain HTML/CSS/JS site in `D:\webfiles\website\Altara`. It uses **Astro** with the **Cloudflare adapter**,
a **D1** database and an **R2** bucket for admin uploads. It has a public site and a private `/admin` dashboard.

The design is the original's, unchanged: `public/style.css` and `public/script.js` are byte-copies of the HTML site's files,
and every page uses the original class names and markup. Do not restyle pages; change `public/style.css` only when the
design itself changes. Tailwind is used **only** by the admin (`src/styles/global.css`).

The design *has* been extended on request since the rebuild (see "Changes since the rebuild" below): the All Tours and
Gallery pages, the tour-page section bar and side card, the enquiry form calendar. Those additions live in clearly
commented blocks of `public/style.css`; the original pages are otherwise unchanged.

## Structure

- `public/` — original `style.css`, `script.js`, `assets/` (images, logos, hero video, PDF), `backend.css` (the few
  styles for form notices), `altara-brand-guidelines.html` (standalone brand reference, not linked from the nav).
- `src/layouts/SiteLayout.astro` — head (fonts, SEO, JSON-LD) + `SiteHeader` + `SiteFooter` + `script.js`.
- `src/pages/` — static pages (`index`, `about`, `about-bhutan`, `why-bhutan`, `tariff`, `faq`, `festival-tours`) and
  database-driven ones (below).
- `src/lib/db.ts` — the whole data layer (prepared statements only). `auth.ts` / `auth-crypto.ts` — admin sessions.
- `src/actions/index.ts` — `submitEnquiry` (server-side validation → `enquiries` table).
- `migrations/` — schema (`0001` init, `0002` auth, `0003` categories + videos, `0004` gallery, `0005` itinerary details).
  `seed.sql` — content extracted from the original HTML (18 tours, 6 journal posts).
- Extra seed files (all idempotent, content written for the tour pages; see below): `seed-gallery.sql`,
  `seed-cultural-pages.sql`, `seed-trekking-pages.sql`, `seed-luxury-pages.sql`.
- `src/lib/gallery-db.ts` (gallery), `tour-filter.ts` (All Tours filtering/sorting), `videos-db.ts`, `categories-db.ts`.

## Database-driven content

| Public URL | Source |
| --- | --- |
| `/cultural-tours`, `/trekking-tours`, `/luxury-tours` | `tours` by category (cards) |
| `/tours` | **All Tours**: every published tour, filter by style / length / search / sort (see below) |
| `/gallery` | `gallery_images` (masonry grid, group filter chips, lightbox); managed in `/admin/gallery` |
| `/tours/[slug]` | one tour + `itinerary_days`; sections with no data are hidden |
| `/blog`, home page "Notes From The Kingdom" slider, `/blog/[slug]` | `posts` |
| `/enquire`, the form on every tour page | writes `enquiries`; read in `/admin/enquiries` |
| `/tours/category/[slug]` | categories added in the admin (`tour_categories`); the original three keep `/cultural-tours` etc. |
| `/videos` | `videos` table, imported from YouTube in the admin |
| `/sitemap-tours.xml` | published tours with a page + posts with an article |

A tour with `has_page = 0` is card-only: its card links to `#enquire` (that is how most of the original cards behaved).
Every cultural, trekking and luxury tour now has `has_page = 1` and a full page (see the seed files); only a tour a
user adds in the admin without a page stays card-only. Prices are deliberately absent — Altara quotes by enquiry.

Festival Tours, About, Why Bhutan, About Bhutan, Tariff and FAQ are static Astro pages (content lives in the page file).
Static pages are `prerender = true`; anything reading D1 is `prerender = false` and edge-cached 5 minutes via `cachePublic()`.

## Admin (`/admin`)

Login-protected by `src/middleware.ts`. Tours (category tab bar; "Add tour" preselects the active category via
`?category=slug`; full editor: facts, overview, highlights, itinerary, packing, districts, three include/exclude lists, FAQs,
cost), Categories (add/edit/delete; only empty ones can be deleted), Videos (paste a YouTube channel or video link —
`src/lib/youtube.ts` reads the public channel RSS feed, no API key, latest ~15 uploads; hide/show/delete), Journal posts
(HTML body), Gallery (add by path/URL/upload with a caption and optional group; edit, hide/show, delete), Enquiries inbox.
Photos can be a path under `/assets/images/image/`, an https URL, or an upload (stored in R2, served from `/media/uploads/…`).
Each itinerary day has: title, driving duration, elevation, description, attractions (one per line) and overnight.

## Gotchas

- `public/script.js` must use **absolute** asset paths (`/assets/...`): pages live at `/tours/x` and `/blog/x`, where relative
  paths break (this made the header logo vanish on scroll once).
- SVG `<path title>` is allowed via a type shim in `src/env.d.ts` (the original map script reads it).
- Categories are rows, not an enum: never hard-code the three slugs in new code (use `categories-db.ts`).
- Admin password rules: `npm run create-admin` enforces 12+ characters; the local dev admin was set directly in the DB.
- **Page-level `<script>` tags typecheck against the Cloudflare worker types**, which shadow some DOM typings
  (`HTMLSelectElement`, `Element.append`). Cast via `unknown` or use `appendChild` (see `src/pages/tours/index.astro`).
- **The dev server can crash** with `ENOENT … [slug].astro.tmp…` when a route file is rewritten while it runs (file-watcher
  race). Not a code bug: restart `npm run dev`.
- Walking days in an itinerary: put `Trek:` at the start of the "driving" value (for example `Trek: 5 to 6 hrs / 12 km`);
  the tour page then labels it "Trek Duration" instead of "Driving Duration".
- `Number Of Travelers` etc.: the enquiry action requires phone, nationality/country, travelers, a message of 10+ characters,
  and arrival + departure dates (tour form) or preferred dates (general form). Arrival and departure are combined into the
  existing `preferred_dates` column ("10 April 2027 – 16 April 2027"), so no extra columns exist.
- The brand names in the luxury tours (Amankora, Six Senses, COMO Uma) are real hotels; confirm the relationship before
  publishing. Distances, drive times, elevations and trek stages in the seed content are approximate, written from general
  knowledge, and need checking by someone who runs the routes.

## Rules

### Framework and tooling
- Use the latest stable Astro and official Astro integrations. **Check the current docs before using an API**.
- Use TypeScript everywhere. Keep components small and reusable.

### Performance
- Ship **zero JavaScript by default**; the public site's JS is the original `script.js` plus a few small page-scoped
  enhancements that all work without JavaScript first: `/tours` (instant filtering), `/gallery` (filter + lightbox), the tour
  page section bar (sticky offset + active link) and the enquiry form calendar popover. Keep any new script that small.

### Public pages
- Mobile-first and accessible; unique `<title>` and meta description per page, one `<h1>`, JSON-LD where relevant.

### Admin and security
- **All `/admin` routes require login.** Never expose admin data or database errors publicly.
- Validate **every form on the server**. Use **prepared statements** for all queries — never concatenate SQL.
- Journal `body_html` is rendered unescaped: only admins can write it. Everything else is escaped.

### Database (D1)
- All schema changes go through **migration files**; never delete existing data in a migration.

### Workflow
- After each task, say **how to test it on localhost**.

## Local development

```
npm install
cp .dev.vars.example .dev.vars        # then set AUTH_SECRET (see the file)
npm run db:migrate:local && npm run db:seed:local
npm run create-admin                  # prompts for email + password (12+ chars)
npm run dev                           # http://localhost:4321  ·  admin at /admin
```

Extra content (run once after `db:migrate:local` + `db:seed:local`):

```
npm run db:gallery-seed:local         # 33 starter gallery photos
npm run db:cultural-pages:local       # full pages for the 5 card-only cultural tours
npm run db:trekking-pages:local       # full pages for 5 treks + trek details for the Druk Path days
npm run db:luxury-pages:local         # full pages for the 6 luxury tours
```

On the live database run the same files with `wrangler d1 execute altara-db --remote --file=<file>` after
`npm run db:migrate:remote` (which applies migrations `0004` and `0005`).

`npm run db:reset:local` wipes the local DB and re-applies migrations + seed (not the extra seed files above). Before deploying: create the D1 database and
R2 bucket (`wrangler d1 create altara-db`, `wrangler r2 bucket create altara-media`), paste the `database_id` into
`wrangler.jsonc`, set the real `site` in `astro.config.mjs`, and `wrangler secret put AUTH_SECRET`.

## Changes since the rebuild

Summary of the work done in the long working session after the rebuild (newest ideas last):

- **Upgrades and tidying**: Astro 7.3.5 → 7.4.5 and `@astrojs/cloudflare` 14.4.4. Removed a duplicate 22 MB hero video,
  renamed `logo-white.png`, `site-icon.png`, `bhutan-believe-brand-film.mp4` (no spaces), resized oversized photos in place
  (paths unchanged; originals backed up outside the project), `CONVERSATION-LOG.md` is git-ignored.
- **Header**: Gallery link added after Blog; "All Tours" first in the Experiences dropdown (desktop + mobile). While the
  header has no background (top of page) the dropdown panels are frosted white glass; once scrolled they are solid white.
- **All Tours (`/tours`)**: server-rendered from the URL (works without JS); a small script filters instantly with no reload and
  keeps the URL in sync. Filters: style (categories from the DB), length (≤5, 6–9, 10+ days), search, sort (custom dropdown).
  Search results are `noindex` and not edge-cached. `/tours` and `/gallery` are listed in `sitemap-tours.xml`.
- **Gallery (`/gallery`, `/admin/gallery`)**: masonry grid, group chips with square corners, lightbox with square buttons.
- **Tour pages (`/tours/[slug]`)**: removed the hero summary line (`hero-tour-sub`); sticky section bar under the hero
  (Overview, Highlights, Itinerary, What to Pack, Map, Inclusions, FAQ, Cost, Enquire; only sections the tour has); right-hand
  sticky card with Duration, Destinations, a Book button and the email link; the Related Tours slider stays at the bottom.
  Itinerary days show driving/trek duration, elevation, description, attractions and the overnight stay.
- **Enquiry form (tour pages)**: underline style as before, with Nationality, Arrival/Departure dates (custom square
  calendar popover, replacing the browser date picker), Number Of Travelers, faded example text in every field, all fields
  required (checked on the server too), and no generic "check the highlighted fields" banner. `/enquire` keeps its older layout.
- **Luxury cards** (`/luxury-tours`) show the altitude without the trailing "m" (`bareAltitude` on `TourCard`).
- **Content**: unique pages with itineraries for all cultural, trekking and luxury tours (seed files above). The test tour
  "Test 1" was deleted from the local database.

- **WebP + SVG logo**: every photo and partner logo under `public/assets/images/` is now `.webp` (no jpg/png left, originals
  backed up in `D:\webfiles\website\Altara1-originals-backup`). The Altara logos are traced vector files:
  `logo/logo.svg`, `logo-white.svg`, `site-icon.svg` (favicon). Existing database rows were updated with `webp-paths.sql`
  (run it on the live DB too: `wrangler d1 execute altara-db --remote --file=webp-paths.sql`). Admin uploads still keep their own type.
