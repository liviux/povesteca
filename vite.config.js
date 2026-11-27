import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { label } from './src/i18n.js';

// The catalog ships apart from the code, as plain JSON the browser parses off the main thread and keeps
// in its own cache. The first file has what lists, cards, filters and the player need; the long texts,
// credits and photos come in separate files, so new stories don't resend the code and an app update
// doesn't resend the catalog:
//  - main: stories and recordings without summaries, credits, characters or themes.
//  - common: the credits, characters, themes, "≈" marks and people/photos, shared by both languages.
//  - browse: the sorted filter lists, needed only by Explore.
//  - ro/en: the summaries, only for the language being read.
// catalog/*.json stays the one source; this plugin splits it for the browser.
const FILES = ['stories', 'versions', 'sources', 'collections', 'wiki'];
const REMOVE = {
  stories: ['summary', 'characters', 'themes', 'age', 'addedAt'],
  versions: ['estimated', 'credits', 'disc', 'audioVerified'],
};
const COMMON = {
  stories: ['characters', 'themes'],
  versions: ['estimated', 'credits'],
};
const DEV_URLS = {
  main: '/__catalog/main.json',
  common: '/__catalog/common.json',
  browse: '/__catalog/browse.json',
  ro: '/__catalog/ro.json',
  en: '/__catalog/en.json',
};
const catalogPath = (n) => fileURLToPath(new URL(`./catalog/${n}.json`, import.meta.url));
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 8);
const pick = (x, keys, keep) => Object.fromEntries(Object.entries(x).filter(([k]) => keys.includes(k) === keep));
const authorsOf = (s) => [].concat(s.author || []);
const splitNames = (x) => (x ? x.split(/; |, | si | și /).filter(Boolean) : []);
const peopleOf = (v) => {
  const c = v.credits || {};
  return [...(c.narrator || []), ...(c.cast || []).map((x) => x.name), ...[c.director, c.adaptation, c.music, c.songs, c.soundDesign].flatMap(splitNames)];
};

function readCatalog() {
  return Object.fromEntries(FILES.map((n) => [n, JSON.parse(readFileSync(catalogPath(n), 'utf8'))]));
}

function buildData() {
  const c = readCatalog();
  const main = {
    stories: c.stories.map((x) => pick(x, REMOVE.stories, false)),
    versions: c.versions.map((x) => ({ ...pick(x, REMOVE.versions, false), castCount: x.credits?.cast?.length || 0 })),
    sources: c.sources,
    collections: c.collections,
  };
  // The long lists in Explore's filters: sorted once here, so no phone has to sort 2,000 names.
  const byRo = (a, b) => a.localeCompare(b, 'ro');
  const storiesWithChar = {};
  const storiesFrom = {};
  const recsWith = {};
  for (const s of c.stories) {
    for (const ch of s.characters || []) storiesWithChar[ch] = (storiesWithChar[ch] || 0) + 1;
    if (s.origin) storiesFrom[s.origin] = (storiesFrom[s.origin] || 0) + 1;
  }
  for (const v of c.versions) for (const n of new Set(peopleOf(v))) recsWith[n] = (recsWith[n] || 0) + 1;
  const filters = {
    authors: [...new Set(c.stories.flatMap(authorsOf))].filter(Boolean).sort(byRo),
    characters: Object.keys(storiesWithChar).sort(byRo),
    crew: Object.keys(recsWith).sort(byRo),
    origins: Object.keys(storiesFrom).sort((a, b) => byRo(label('origin', a, 'ro'), label('origin', b, 'ro'))),
    storiesWithChar, storiesFrom, recsWith,
  };
  const common = {
    stories: Object.fromEntries(c.stories.map((s) => [s.id, pick(s, COMMON.stories, true)]).filter(([, x]) => Object.keys(x).length)),
    versions: Object.fromEntries(c.versions.map((v) => [v.id, pick(v, COMMON.versions, true)]).filter(([, x]) => Object.keys(x).length)),
    wiki: c.wiki,
  };
  const lang = (l) => ({
    stories: Object.fromEntries(c.stories.map((s) => [s.id, { summary: { [l]: s.summary?.[l] ?? '' } }])),
  });
  return { main, common, browse: { filters }, ro: lang('ro'), en: lang('en') };
}

function catalog() {
  let dev = false;
  let urls;
  return {
    name: 'catalog',
    configResolved(config) {
      dev = config.command === 'serve';
      if (dev) urls = DEV_URLS;
    },
    buildStart() {
      if (dev) return;
      const data = buildData();
      urls = {};
      for (const [name, value] of Object.entries(data)) {
        const source = JSON.stringify(value);
        const fileName = `assets/catalog-${name}-${hash(source)}.json`;
        this.emitFile({ type: 'asset', fileName, source });
        urls[name] = '/' + fileName;
      }
    },
    resolveId: (id) => (id === 'virtual:catalog-urls' ? '\0' + id : null),
    load(id) {
      if (id !== '\0virtual:catalog-urls') return;
      FILES.forEach((n) => this.addWatchFile(catalogPath(n)));
      return `export default ${JSON.stringify(urls || DEV_URLS)};`;
    },
    // the JSON addresses, for the preload in index.html
    transformIndexHtml: {
      order: 'post',
      handler: (html) => {
        const u = urls || DEV_URLS;
        const head = `<script>window.__CATALOG_URLS__=${JSON.stringify(u)}</script>
    <link rel="preload" as="fetch" crossorigin href="${u.main}">`;
        return html.replace('__CATALOG_HEAD__', head);
      },
    },
    // `npm run dev` serves the JSON files from the catalog sources, with the Vercel function
    configureServer(server) {
      FILES.forEach((n) => server.watcher.add(catalogPath(n)));
      server.middlewares.use('/__catalog', (req, res, next) => {
        const name = (req.url || '').replace(/^\//, '').replace(/\.json.*$/, '');
        if (!['main', 'common', 'browse', 'ro', 'en'].includes(name)) return next();
        try {
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.setHeader('cache-control', 'no-store');
          res.end(JSON.stringify(buildData()[name]));
        } catch (e) {
          next(e);
        }
      });
    },
  };
}

// How many commits the app has, for "What's new (53 changes)". From the full git history when there is one;
// Vercel builds from a shallow clone (git clone --depth=10, vercel.com/docs/builds/configure-a-build), so there
// the number comes from GitHub's API, once per build: visitors never contact GitHub. Unknown: null, nothing shown.
async function commitCount() {
  const git = (args) => execSync('git ' + args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  let sha = process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    if (git('rev-parse --is-shallow-repository') === 'false') return +git('rev-list --count HEAD');
    sha = git('rev-parse HEAD');
  } catch {}
  if (!sha) return null;
  try {
    // one commit per page: the number of the last page is the number of commits
    const r = await fetch(`https://api.github.com/repos/liviux/povesteca/commits?per_page=1&sha=${sha}`, { signal: AbortSignal.timeout(8000) });
    return r.ok ? +(r.headers.get('link')?.match(/[?&]page=(\d+)>; rel="last"/)?.[1] || 1) : null;
  } catch {
    return null;
  }
}

export default defineConfig(async () => ({
  define: { __COMMITS__: JSON.stringify(await commitCount()) },
  plugins: [
    preact(),
    catalog(),
    {
      // Vite's 500 kB warning, for code only: the catalog is data and grows with the catalog, and hls.js
      // loads only when a stream needs it. The app's own code is around 100 kB.
      name: 'code-size',
      apply: 'build',
      generateBundle(_, bundle) {
        for (const c of Object.values(bundle)) {
          if (c.type === 'chunk' && !/^(_virtual_)?(catalog|hls)/.test(c.name) && c.code.length > 500e3) this.warn(`${c.fileName}: ${Math.round(c.code.length / 1e3)} kB of code, more than 500 kB`);
        }
      },
    },
    {
      // `npm run dev` serves the Vercel function too, with an in-memory store
      name: 'local-api',
      configureServer(server) {
        server.middlewares.use('/api/ratings', async (req, res) => {
          const mod = await server.ssrLoadModule('/api/ratings.js');
          mod.default(req, res);
        });
      },
    },
  ],
  build: {
    chunkSizeWarningLimit: Infinity, // replaced by the code-size plugin above
  },
}));
