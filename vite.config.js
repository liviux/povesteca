import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// The catalog ships apart from the code, in two files the browser keeps separately, so an app update
// doesn't make anyone download the catalog again (and new stories don't resend the code):
//  - virtual:catalog: what lists, cards, filters and the player need; it loads together with the code.
//  - virtual:catalog-details: the long texts, loaded right after the first page is on screen (src/data.js).
// catalog/*.json stays the one source; these fields move to the second file:
const DETAILS = { stories: ['summary'], versions: ['estimated'] };
const FILES = ['stories', 'versions', 'sources', 'collections', 'wiki'];

function catalog() {
  const path = (n) => fileURLToPath(new URL(`./catalog/${n}.json`, import.meta.url));
  const pick = (x, keys, keep) => Object.fromEntries(Object.entries(x).filter(([k]) => keys.includes(k) === keep));
  return {
    name: 'catalog',
    resolveId: (id) => (id === 'virtual:catalog' || id === 'virtual:catalog-details' ? '\0' + id : null),
    load(id) {
      if (id !== '\0virtual:catalog' && id !== '\0virtual:catalog-details') return;
      FILES.forEach((n) => this.addWatchFile(path(n)));
      const c = Object.fromEntries(FILES.map((n) => [n, JSON.parse(readFileSync(path(n), 'utf8'))]));
      const per = (fn) => Object.fromEntries(Object.entries(DETAILS).map(([n, keys]) => [n, fn(c[n], keys)]));
      const data = id.endsWith('-details')
        // { stories: { id: { summary } }, versions: { id: { estimated } }, wiki }
        ? { ...per((list, keys) => Object.fromEntries(list.map((x) => [x.id, pick(x, keys, true)]).filter(([, x]) => Object.keys(x).length))), wiki: c.wiki }
        : { ...per((list, keys) => list.map((x) => pick(x, keys, false))), sources: c.sources, collections: c.collections };
      // JSON.parse of a string is read faster than the same data written as code (v8.dev/blog/cost-of-javascript-2019)
      return `export default JSON.parse('${JSON.stringify(data).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}');`;
    },
    // the details file's address, for the early download in index.html
    transformIndexHtml: {
      order: 'post',
      handler: (html, { bundle }) => html.replace('__CATALOG_DETAILS__', bundle
        ? '/' + Object.values(bundle).find((c) => c.facadeModuleId === '\0virtual:catalog-details').fileName
        : '/@id/__x00__virtual:catalog-details'),
    },
  };
}

export default defineConfig({
  plugins: [
    preact(),
    catalog(),
    {
      // Vite's 500 kB warning, for code only: the two catalog files are data and grow with the catalog,
      // and hls.js loads only when a stream needs it. The app's own code is around 100 kB.
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
    rolldownOptions: {
      output: {
        // the catalog in a file of its own; the details get one anyway, being loaded later
        codeSplitting: { groups: [{ name: 'catalog', test: (id) => id === '\0virtual:catalog' }] },
      },
    },
  },
});
