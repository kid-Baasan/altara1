// Exports a static front-end snapshot of the whole site (including the database-driven pages) into ./static-preview.
// It crawls a running production preview, so the HTML is exactly what visitors see.
//
//   npm run build
//   npx astro preview --port 4322        (leave it running)
//   node scripts/export-static.mjs       (or: npm run export:static)
//
// Only HTML and the built /_astro bundles are written here; /assets, style.css etc. come from ./public when the
// GitHub Pages workflow assembles the site, so nothing is stored twice.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ORIGIN = process.env.PREVIEW_URL ?? 'http://localhost:4322';
const OUT = 'static-preview';
const SKIP = /^\/(admin|_actions|media|api|cdn-cgi)(\/|$)/;

const PREVIEW_NOTICE = `
<style>
  .preview-bar{position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#16302A;color:#fff;font:400 12px/1.4 'Josefin Sans',Arial,sans-serif;letter-spacing:.08em;text-align:center;padding:9px 14px}
  .preview-bar b{color:#D9B56E;font-weight:400;letter-spacing:.16em;text-transform:uppercase;margin-right:8px}
  .preview-toast{position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:99999;background:#fff;color:#16302A;border:1px solid #B08D57;padding:14px 22px;font:400 14px/1.4 'Josefin Sans',Arial,sans-serif;box-shadow:0 18px 40px rgba(0,0,0,.2)}
</style>
<div class="preview-bar"><b>Design preview</b>Front end only &mdash; forms and the admin are switched off in this version.</div>
<script>
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = document.createElement('div');
    t.className = 'preview-toast';
    t.textContent = 'This is a design preview \\u2014 forms are not connected here.';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }, true);
</script>
`;

const seen = new Set();
const queue = ['/', '/404'];
const seed = [
  '/about', '/about-bhutan', '/why-bhutan', '/tariff', '/faq', '/festival-tours', '/cultural-tours', '/trekking-tours',
  '/luxury-tours', '/tours', '/gallery', '/blog', '/videos', '/enquire', '/partners',
];
queue.push(...seed);

try {
  const xml = await (await fetch(`${ORIGIN}/sitemap-tours.xml`)).text();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) queue.push(new URL(m[1]).pathname);
} catch {
  console.warn('Could not read sitemap-tours.xml; relying on links found in pages.');
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let saved = 0;
while (queue.length) {
  const path = queue.shift().replace(/\/+$/, '') || '/';
  if (seen.has(path) || SKIP.test(path) || /\.[a-z0-9]{2,5}$/i.test(path)) continue;
  seen.add(path);

  const res = await fetch(ORIGIN + path, { redirect: 'follow' });
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('text/html')) continue;
  if (!res.ok && path !== '/404') {
    console.warn(`  skipped ${path} (${res.status})`);
    continue;
  }
  let html = await res.text();

  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) if (!m[1].startsWith('//')) queue.push(m[1]);

  html = html.replace('</body>', `${PREVIEW_NOTICE}</body>`);
  const file = path === '/404' ? join(OUT, '404.html') : join(OUT, path === '/' ? '' : path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  saved++;
}

if (existsSync('dist/client/_astro')) cpSync('dist/client/_astro', join(OUT, '_astro'), { recursive: true });
else console.warn('dist/client/_astro not found - run `npm run build` first.');

console.log(`Exported ${saved} pages to ./${OUT}`);
