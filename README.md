# Altara

Luxury, private-journey travel brand built around the Kingdom of Bhutan. Astro + Cloudflare (D1 database, R2 uploads),
with a public site and a private `/admin` dashboard.

## 👀 View the design preview

**https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPO-NAME/**

This is a static, front-end-only copy of the site for design review. Every public page is included (tours, gallery,
blog, videos, tariff, about, enquire, partners). Forms and the admin are switched off in the preview, and a small bar at
the bottom of each page says so.

### How the preview is published

1. Push this repository to GitHub (branch `main`).
2. In the repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` runs on every push and publishes the site. The address appears in
   the **Actions** tab and at the top of Settings → Pages (a minute or two after the first push).
4. Optional: put the link in the repository's **About** box (the cog next to it) under *Website*.

### Refreshing the preview after content or design changes

The preview is a snapshot of your local site, stored in `static-preview/`. After changing pages, tours or photos:

```
npm run build
npx astro preview --port 4322      # leave running in one terminal
npm run export:static              # in a second terminal
git add -A && git commit -m "Update preview" && git push
```

## Run the real site locally

```
npm install
cp .dev.vars.example .dev.vars        # then set AUTH_SECRET
npm run db:migrate:local && npm run db:seed:local
npm run create-admin
npm run dev                           # http://localhost:4321  ·  admin at /admin
```

More detail (extra seed files, deploying to Cloudflare, project rules) is in `CLAUDE.md`.
