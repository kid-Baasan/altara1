// Prefixes root-absolute URLs (/assets/..., /about, url(/x)) with a base path so the exported site works under
// https://<user>.github.io/<repo>/.   Usage: node scripts/rewrite-base.mjs <folder> <base>   (base like "/altara", or "" for none)
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const [dir, rawBase = ''] = process.argv.slice(2);
if (!dir) throw new Error('Usage: node scripts/rewrite-base.mjs <folder> <base>');
const base = rawBase.replace(/\/+$/, '');
if (!base) {
  console.log('No base path - nothing to rewrite.');
  process.exit(0);
}

// Top-level names that exist in the site (folders, files, page routes). Only URLs starting with one of these are touched.
const names = new Set();
for (const entry of readdirSync(dir)) names.add(entry.replace(/\.[a-z0-9]+$/i, '') === entry ? entry : entry);
const alt = [...names].filter((n) => n !== 'index.html' && n !== '404.html').map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

// (quote, "(" or "=") + "/" + known-name + (end of URL)
const rx = new RegExp(`(["'(=,\\s])\\/(?=(?:${alt})(?:[/"'?#)\\s,]|$))`, 'g');
const rxHome = /(href=["'])\/(?=["'#?])/g; // href="/" , href="/#journeys"
const rxHash = /(["'(])\/(?=[#?])/g; // "/#journeys"

const TEXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.xml']);
let files = 0;
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (TEXT.has(extname(p).toLowerCase())) {
      const before = readFileSync(p, 'utf8');
      let after = before.replace(rx, `$1${base}/`).replace(rxHash, `$1${base}/`);
      if (extname(p) === '.html') after = after.replace(rxHome, `$1${base}/`);
      if (after !== before) {
        writeFileSync(p, after);
        files++;
      }
    }
  }
})(dir);
console.log(`Rewrote ${files} files with base "${base}"`);
