// Photos and links for the people and books in the catalog, from Wikidata and Wikimedia Commons.
// Writes catalog/wiki.json. Run after adding stories or credits: node scripts/wiki.js (needs network, about a minute).
//
// Rules, so nothing is guessed:
// - a name matches only when Wikidata has exactly one fitting person: the occupation must fit the role
//   (an actor for the cast, a director for directing, a writer for an author), and people in the credits must be
//   Romanian; names checked by hand and found to be someone else go in WRONG;
// - a story matches only a work by the same author (on Wikidata) whose title is the same;
// - photos are the person's own Wikidata image, hosted on Wikimedia Commons, only under a license that allows
//   reuse with credit in a non-commercial project; the app shows their author, license and source;
// - Wikipedia: the Romanian article for Romanians, the English one for everyone else, falling back to the other.
import { readFileSync, writeFileSync } from 'node:fs';

const load = (n) => JSON.parse(readFileSync(new URL(`../catalog/${n}.json`, import.meta.url)));
const stories = load('stories'), versions = load('versions');
const UA = 'catalog-enricher/1.0 (batch lookup of public data)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const qid = (uri) => uri.split('/').pop();
const lit = (s) => JSON.stringify(s); // a JSON string is a valid SPARQL string literal

async function sparql(query) {
  for (let i = 1; i <= 4; i++) {
    const r = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST', body: new URLSearchParams({ query }),
      headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' },
    });
    if (r.ok) return (await r.json()).results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
    console.warn(`Wikidata answered ${r.status}, retrying`);
    await sleep(5000 * i);
  }
  throw new Error('Wikidata query failed');
}

// Names that look right on Wikidata but are someone else, checked by hand ("name": "Wikidata id").
const WRONG = {
  'Gheorghe Popovici': 'Q12729207', // the 19th-century poet and politician didn't write the modern lullaby in the catalog
  'Dan Bălan': 'Q314206', // the O-Zone pop singer is not the Radio România musical director
  'Oana Stancu': 'Q18548093', // the TV journalist (Oana Zamfir) is not the Teatrul Colibri Craiova actress
};

// every name with the roles it has in the catalog (the same split as splitNames() in src/data.js)
const split = (x) => (x ? x.split(/; |, | si | și /) : []);
const roles = new Map();
const add = (n, r) => { n = n?.trim(); if (n) { if (!roles.has(n)) roles.set(n, new Set()); roles.get(n).add(r); } };
for (const s of stories) add(s.author, 'author');
for (const v of versions) {
  const c = v.credits || {};
  (c.narrator || []).forEach((n) => add(n, 'narrator'));
  (c.cast || []).forEach((x) => add(x.name, 'cast'));
  for (const k of ['director', 'adaptation', 'music', 'songs']) split(c[k]).forEach((n) => add(n, k));
}
const allNames = [...roles.keys()];
const authorNames = allNames.filter((n) => roles.get(n).has('author'));

// 1. every Wikidata item whose label or alias (ro, en, mul) is exactly the name
const found = new Map();
for (const part of chunks(allNames, 60)) {
  const values = part.flatMap((n) => ['ro', 'en', 'mul'].map((l) => `${lit(n)}@${l}`)).join(' ');
  for (const r of await sparql(`SELECT DISTINCT ?lbl ?item WHERE { VALUES ?lbl { ${values} } { ?item rdfs:label ?lbl } UNION { ?item skos:altLabel ?lbl } }`)) {
    if (!found.has(r.lbl)) found.set(r.lbl, new Set());
    found.get(r.lbl).add(qid(r.item));
  }
  await sleep(500);
}

// 2. what each candidate is
const info = new Map();
for (const part of chunks([...new Set([...found.values()].flatMap((s) => [...s]))], 80)) {
  const rows = await sparql(`SELECT ?item (GROUP_CONCAT(DISTINCT ?instL; separator='|') AS ?inst) (GROUP_CONCAT(DISTINCT ?occL; separator='|') AS ?occ)
    (GROUP_CONCAT(DISTINCT ?citL; separator='|') AS ?cit) (GROUP_CONCAT(DISTINCT ?langL; separator='|') AS ?lang)
    (SAMPLE(?img) AS ?image) (SAMPLE(?gr) AS ?goodreads) (SAMPLE(?ro) AS ?roWiki) (SAMPLE(?en) AS ?enWiki) WHERE {
    VALUES ?item { ${part.map((x) => 'wd:' + x).join(' ')} }
    OPTIONAL { ?item wdt:P31/rdfs:label ?instL FILTER(lang(?instL) = 'en') }
    OPTIONAL { ?item wdt:P106/rdfs:label ?occL FILTER(lang(?occL) = 'en') }
    OPTIONAL { ?item wdt:P27/rdfs:label ?citL FILTER(lang(?citL) = 'en') }
    OPTIONAL { ?item wdt:P1412/rdfs:label ?langL FILTER(lang(?langL) = 'en') }
    OPTIONAL { ?item wdt:P18 ?img }
    OPTIONAL { ?item wdt:P2963 ?gr }
    OPTIONAL { ?ro schema:about ?item; schema:isPartOf <https://ro.wikipedia.org/> }
    OPTIONAL { ?en schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> }
  } GROUP BY ?item`);
  for (const r of rows) info.set(qid(r.item), r);
  await sleep(500);
}

// the occupation a person needs on Wikidata for each role they have in the catalog
const PERFORMER = /\bact(or|ress)\b|voice actor|comedian|puppeteer|presenter|announcer|narrator|entertainer/i;
const FITS = {
  author: /writer|poet|novelist|playwright|author|folklorist|storyteller|essayist|translator|composer|librettist|fabulist|screenwriter/i,
  cast: PERFORMER, narrator: PERFORMER,
  director: /director/i,
  adaptation: /writer|poet|novelist|playwright|screenwriter|translator|dramaturge|director/i,
  music: /composer|musician|conductor|singer|pianist|violinist|instrumentalist|songwriter/i,
  songs: /composer|lyricist|songwriter|poet|singer/i,
};
const GROUP = /duo|siblings|brothers|sisters|group of humans|collective/i;
const romanian = (d) => /Romania|Moldova|Moldavia|Wallachia/i.test(d.cit || '') || /Romanian/i.test(d.lang || '');

function pick(name) {
  const rs = [...roles.get(name)];
  let c = [...(found.get(name) || [])].map((id) => info.get(id)).filter((d) => {
    if (!d || WRONG[name] === qid(d.item)) return false;
    if (rs.includes('author') && GROUP.test(d.inst || '') && (d.roWiki || d.enWiki)) return true;
    // authors come from everywhere; the people in the credits are Romanian, since the productions are
    return /\bhuman\b/.test(d.inst || '') && rs.some((r) => FITS[r].test(d.occ || '') && (r === 'author' || romanian(d)));
  });
  if (c.length > 1) { const ro = c.filter(romanian); if (ro.length) c = ro; }
  return c.length === 1 ? c[0] : null; // none, or several that fit equally: leave it out
}

const people = {};
for (const name of allNames) { const d = pick(name); if (d) people[name] = d; }

// 3. photos: only freely licensed files, with author and license
const strip = (h) => (h || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim().slice(0, 120) || null;
// reuse with credit in a non-commercial project: public domain, CC0, CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA
const FREE = /^(pd|cc0|cc-by(-nc)?(-sa)?-\d)/i;
const photos = new Map();
const files = [...new Set(Object.values(people).map((d) => d.image && decodeURIComponent(d.image.split('/').pop())).filter(Boolean))];
for (const part of chunks(files, 40)) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '320',
    iiextmetadatafilter: 'License|LicenseShortName|Artist', titles: part.map((f) => 'File:' + f).join('|'),
  });
  const j = await (await fetch(url, { headers: { 'User-Agent': UA } })).json();
  for (const p of Object.values(j.query?.pages || {})) {
    const ii = p.imageinfo?.[0], m = ii?.extmetadata || {};
    const short = m.LicenseShortName?.value || '';
    if (!ii || !(FREE.test(m.License?.value || '') || /^public domain$/i.test(short))) continue;
    let by = strip(m.Artist?.value);
    if (by && by.length % 2 === 1 && by.slice(0, by.length >> 1) === by.slice((by.length >> 1) + 1)) by = by.slice(0, by.length >> 1); // "X X"
    if (/^unknown( author)?$/i.test(by || '')) by = null;
    // the thumbnail address without Wikimedia's tracking parameters
    photos.set(p.title.replace(/^File:/, ''), { src: ii.thumburl.split('?')[0], page: ii.descriptionurl, license: short || 'Public domain', by });
  }
  await sleep(500);
}

const wikipedia = (d, ro) => (ro ? d.roWiki || d.enWiki : d.enWiki || d.roWiki) || undefined;
const out = { people: {}, stories: {} };
for (const [name, d] of Object.entries(people)) {
  const photo = d.image && photos.get(decodeURIComponent(d.image.split('/').pop()));
  const e = { wikidata: qid(d.item), photo, wikipedia: wikipedia(d, romanian(d)), goodreads: d.goodreads && `https://www.goodreads.com/author/show/${d.goodreads}` };
  if (e.photo || e.wikipedia || e.goodreads) out.people[name] = e;
}

// 4. books: works by the same author (or by a member of an author group) with the same title
const norm = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const authorItems = Object.fromEntries(authorNames.filter((n) => people[n]).map((n) => [qid(people[n].item), n]));
const works = new Map();
for (const part of chunks(Object.keys(authorItems), 40)) {
  const rows = await sparql(`SELECT ?a ?work ?lbl (SAMPLE(?ro) AS ?roWiki) (SAMPLE(?en) AS ?enWiki) (SAMPLE(?gw) AS ?grWork) (SAMPLE(?gb) AS ?grBook) WHERE {
    VALUES ?a { ${part.map((x) => 'wd:' + x).join(' ')} }
    { ?work wdt:P50 ?a } UNION { ?a wdt:P527 ?m . ?work wdt:P50 ?m }
    { ?work rdfs:label ?lbl } UNION { ?work skos:altLabel ?lbl } FILTER(lang(?lbl) IN ('ro', 'en', 'mul'))
    OPTIONAL { ?ro schema:about ?work; schema:isPartOf <https://ro.wikipedia.org/> }
    OPTIONAL { ?en schema:about ?work; schema:isPartOf <https://en.wikipedia.org/> }
    OPTIONAL { ?work wdt:P8383 ?gw } OPTIONAL { ?work wdt:P2969 ?gb }
  } GROUP BY ?a ?work ?lbl`);
  for (const r of rows) {
    const key = authorItems[qid(r.a)] + '\n' + norm(r.lbl);
    if (!works.has(key)) works.set(key, new Map());
    works.get(key).set(qid(r.work), r);
  }
  await sleep(500);
}
for (const s of stories) {
  const m = works.get(s.author + '\n' + norm(s.title));
  if (!m || m.size !== 1) continue;
  const w = [...m.values()][0];
  const e = {
    wikidata: qid(w.work), wikipedia: wikipedia(w, romanian(people[s.author])),
    goodreads: w.grWork ? `https://www.goodreads.com/work/editions/${w.grWork}` : w.grBook ? `https://www.goodreads.com/book/show/${w.grBook}` : undefined,
  };
  if (e.wikipedia || e.goodreads) out.stories[s.id] = e;
}

const sorted = (o) => Object.fromEntries(Object.keys(o).sort((a, b) => a.localeCompare(b, 'ro')).map((k) => [k, o[k]]));
writeFileSync(new URL('../catalog/wiki.json', import.meta.url), JSON.stringify({ people: sorted(out.people), stories: sorted(out.stories) }, null, 1) + '\n');
const ppl = Object.values(out.people);
console.log(`wiki: ${ppl.length} of ${allNames.length} names matched, ${ppl.filter((p) => p.photo).length} with a photo, ${Object.keys(out.stories).length} of ${stories.length} stories with links`);
