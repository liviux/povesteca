// Writes dist/sitemap.xml after the build: every story, recording, person, source and collection.
// Run by `npm run build`; crawlers use it to find pages that the single-page app handles on the client.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const base = process.env.SITE_URL || 'https://povesteca.vercel.app';
const load = (n) => JSON.parse(readFileSync(new URL(`../catalog/${n}.json`, import.meta.url), 'utf8'));
const [stories, versions, sources, collections, wiki] = ['stories', 'versions', 'sources', 'collections', 'wiki'].map(load);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const url = (path, lastmod) =>
  `  <url><loc>${esc(base + path)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
const storyDate = new Map(stories.filter((s) => s.addedAt).map((s) => [s.id, s.addedAt]));

const entries = [
  ['/', null],
  ['/explorare', null],
  ['/surse', null],
  ...stories.map((s) => [`/poveste/${encodeURIComponent(s.id)}`, s.addedAt || null]),
  ...versions.map((v) => [`/inregistrare/${encodeURIComponent(v.id)}`, v.addedAt || storyDate.get(v.storyId) || null]),
  ...Object.keys(wiki.people).map((n) => [`/persoana/${encodeURIComponent(n)}`, null]),
  ...sources.map((s) => [`/sursa/${encodeURIComponent(s.id)}`, null]),
  ...collections.map((c) => [`/colectie/${encodeURIComponent(c.id)}`, null]),
];

const seen = new Set();
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  entries.filter(([u]) => !seen.has(u) && seen.add(u)).map(([u, d]) => url(u, d)).join('\n') +
  '\n</urlset>\n';

mkdirSync(fileURLToPath(new URL('../dist', import.meta.url)), { recursive: true });
writeFileSync(fileURLToPath(new URL('../dist/sitemap.xml', import.meta.url)), xml);
console.log(`sitemap: ${seen.size} URLs`);
