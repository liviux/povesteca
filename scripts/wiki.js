// Photos and links for the people and books in the catalog, from Wikidata, Wikimedia Commons and catalog/wiki-manual.json.
// Writes catalog/wiki.json. Run after adding stories or credits: node scripts/wiki.js (needs network, about a minute).
//
// Rules, so nothing is guessed:
// - a name matches only when Wikidata has exactly one fitting person (or a curated QID in catalog/wiki-manual.json):
//   the occupation must fit the role (an actor for the cast, a director for directing, a writer for an author), and
//   people in the credits must be Romanian (except curated international composers/adaptors); names checked by hand
//   and found to be someone else go in WRONG / wiki-manual.json wrong;
// - a story matches only a work by the same author (on Wikidata) whose title is the same, or a verified entry in wiki-manual.json;
// - photos are under a license that allows reuse with credit in a non-commercial project (public domain, CC0,
//   CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA or Wikimedia Commons Attribution; never ND or all-rights-reserved);
//   the app shows their author, license and source at the bottom of the person's page;
// - Wikipedia: the Romanian article for Romanians and Romanian stories, the English one for everyone else, falling back to the other.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const load = (n) => JSON.parse(readFileSync(new URL(`../catalog/${n}.json`, import.meta.url)));
const stories = load('stories'), versions = load('versions');
const manualPath = new URL('../catalog/wiki-manual.json', import.meta.url);
const manual = existsSync(manualPath) ? JSON.parse(readFileSync(manualPath, 'utf8')) : { wrong: {}, people: {}, stories: {} };

const UA = 'catalog-enricher/1.0 (batch lookup of public data)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const qid = (uri) => uri.split('/').pop();
const lit = (s) => JSON.stringify(s); // a JSON string is a valid SPARQL string literal

async function sparql(query) {
  for (let i = 1; i <= 4; i++) {
    try {
      const r = await fetch('https://query.wikidata.org/sparql', {
        method: 'POST', body: new URLSearchParams({ query }),
        headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' },
        signal: AbortSignal.timeout(35000),
      });
      if (r.ok) return (await r.json()).results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
      console.warn(`Wikidata answered ${r.status}, retrying`);
    } catch (e) {
      console.warn(`Wikidata error (${e.message}), retrying`);
    }
    await sleep(5000 * i);
  }
  throw new Error('Wikidata query failed');
}

// Names that look right on Wikidata but are someone else, checked by hand ("name": "Wikidata id").
const WRONG = {
  'Gheorghe Popovici': 'Q12729207', // the 19th-century poet and politician didn't write the modern lullaby in the catalog
  'Dan Bălan': 'Q314206', // the O-Zone pop singer is not the Radio România musical director
  'Oana Stancu': 'Q18548093', // the TV journalist (Oana Zamfir) is not the Teatrul Colibri Craiova actress
  'Dumitru Petrescu': 'Q12726713', // poet Dimitrie Stelaru (born Dumitru Petrescu) is not the 1966 Electrecord cast actor
  'Alexandru Minculescu': 'Q20970222', // rapper Cabron is not the A Fost Odată narrator
  ...(manual.wrong || {}),
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
  for (const k of ['director', 'adaptation', 'music', 'songs', 'soundDesign']) split(c[k]).forEach((n) => add(n, k));
}
const allNames = [...roles.keys()];
const authorNames = allNames.filter((n) => roles.get(n).has('author'));
const storyIds = new Set(stories.map((s) => s.id));

// 1. every Wikidata item whose label or alias (ro, en, mul) is exactly the name
const found = new Map();
const manualPeople = manual.people || {};
const toLookup = allNames.filter((n) => !manualPeople[n]?.wikidata);
for (const part of chunks(toLookup, 60)) {
  const values = part.flatMap((n) => ['ro', 'en', 'mul'].map((l) => `${lit(n)}@${l}`)).join(' ');
  for (const r of await sparql(`SELECT DISTINCT ?lbl ?item WHERE { VALUES ?lbl { ${values} } { ?item rdfs:label ?lbl } UNION { ?item skos:altLabel ?lbl } }`)) {
    if (!found.has(r.lbl)) found.set(r.lbl, new Set());
    found.get(r.lbl).add(qid(r.item));
  }
  await sleep(400);
}
for (const [name, m] of Object.entries(manualPeople)) {
  if (roles.has(name) && m.wikidata) found.set(name, new Set([m.wikidata]));
}

// 2. what each candidate is
const info = new Map();
for (const part of chunks([...new Set([...found.values()].flatMap((s) => [...s]))], 80)) {
  const rows = await sparql(`SELECT ?item (GROUP_CONCAT(DISTINCT ?instL; separator='|') AS ?inst) (GROUP_CONCAT(DISTINCT ?occL; separator='|') AS ?occ)
    (GROUP_CONCAT(DISTINCT ?citL; separator='|') AS ?cit) (GROUP_CONCAT(DISTINCT ?ctryL; separator='|') AS ?ctry) (GROUP_CONCAT(DISTINCT ?langL; separator='|') AS ?lang)
    (SAMPLE(?img) AS ?image) (SAMPLE(?gr) AS ?goodreads) (SAMPLE(?ro) AS ?roWiki) (SAMPLE(?en) AS ?enWiki) WHERE {
    VALUES ?item { ${part.map((x) => 'wd:' + x).join(' ')} }
    OPTIONAL { ?item wdt:P31/rdfs:label ?instL FILTER(lang(?instL) = 'en') }
    OPTIONAL { ?item wdt:P106/rdfs:label ?occL FILTER(lang(?occL) = 'en') }
    OPTIONAL { ?item wdt:P27/rdfs:label ?citL FILTER(lang(?citL) = 'en') }
    OPTIONAL { ?item wdt:P17/rdfs:label ?ctryL FILTER(lang(?ctryL) = 'en') }
    OPTIONAL { ?item wdt:P1412/rdfs:label ?langL FILTER(lang(?langL) = 'en') }
    OPTIONAL { ?item wdt:P18 ?img }
    OPTIONAL { ?item wdt:P2963 ?gr }
    OPTIONAL { ?ro schema:about ?item; schema:isPartOf <https://ro.wikipedia.org/> }
    OPTIONAL { ?en schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> }
  } GROUP BY ?item`);
  for (const r of rows) info.set(qid(r.item), r);
  await sleep(400);
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
  soundDesign: /sound designer|sound engineer|audio engineer|recording engineer|sound editor|sound technician|mixing engineer|audio producer/i,
};
const GROUP = /duo|siblings|brothers|sisters|group of humans|collective/i;
const romanian = (d) => /Romania|Moldova|Moldavia|Wallachia/i.test(`${d.cit || ''}|${d.ctry || ''}`) || /Romanian/i.test(d.lang || '');

function pick(name) {
  if (manualPeople[name]?.wikidata) return info.get(manualPeople[name].wikidata) || null;
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
const strip = (h) => (h || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || null;
// reuse with credit in a non-commercial project: public domain, CC0, CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA, or Commons Attribution
const FREE = /^(pd|cc0|cc-zero|cc-by(-nc)?(-sa)?-\d|attribution$)/i;
const FREE_SHORT = /^(public domain|cc0|cc by(-nc)?(-sa)?( \d|$)|attribution$)/i;
const photos = new Map();
const files = [...new Set(Object.values(people).map((d) => d.image && decodeURIComponent(d.image.split('/').pop()).replace(/_/g, ' ')).filter(Boolean))];
for (const part of chunks(files, 40)) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '320',
    iiextmetadatafilter: 'License|LicenseShortName|UsageTerms|Artist|Credit|Attribution|NonFree', titles: part.map((f) => 'File:' + f).join('|'),
  });
  const j = await (await fetch(url, { headers: { 'User-Agent': UA } })).json();
  for (const p of Object.values(j.query?.pages || {})) {
    const ii = p.imageinfo?.[0], m = ii?.extmetadata || {};
    if (!ii || String(m.NonFree?.value || '').toLowerCase() === 'true') continue;
    const lic = m.License?.value || '', short = m.LicenseShortName?.value || '', terms = m.UsageTerms?.value || '';
    if (/-nd\b|\bnd\b|no\s*deriv|non-free/i.test(`${lic} ${short} ${terms}`)) continue;
    if (!(FREE.test(lic) || FREE_SHORT.test(short))) continue;
    let by = strip(m.Artist?.value);
    if (by && by.length % 2 === 1 && by.slice(0, by.length >> 1) === by.slice((by.length >> 1) + 1)) by = by.slice(0, by.length >> 1); // "X X"
    if (/^(unknown( author)?|anonymous(\s*\([^)]*\))?(\s+unknown\s+author)?|necunoscut|autor necunoscut|transferred from\b.*)$/i.test(by || '')) by = null;
    if (!by) {
      const attr = strip(m.Attribution?.value) || strip(m.Credit?.value);
      if (attr && !/^https?:\/\//i.test(attr) && !/^(own work|transferred from\b)/i.test(attr)) by = attr;
    }
    const license = /^public domain$|^pd/i.test(short || lic) ? 'Public domain' : /^cc0|^cc-zero/i.test(short || lic) ? 'CC0' : /^attribution$/i.test(short || lic) ? 'Attribution' : (short || 'Public domain');
    // the thumbnail address without Wikimedia's tracking parameters
    photos.set(p.title.replace(/^File:/, '').replace(/_/g, ' '), { src: ii.thumburl.split('?')[0], page: ii.descriptionurl, license, by });
  }
  await sleep(400);
}

const wikipedia = (d, ro) => (ro ? d.roWiki || d.enWiki : d.enWiki || d.roWiki) || undefined;
const out = { people: {}, stories: {} };
for (const name of allNames) {
  const d = people[name];
  const m = manualPeople[name] || {};
  const autoPhoto = d?.image ? photos.get(decodeURIComponent(d.image.split('/').pop()).replace(/_/g, ' ')) : undefined;
  const e = {
    wikidata: m.wikidata || (d && qid(d.item)) || undefined,
    photo: m.photo === false ? undefined : (m.photo || autoPhoto || undefined),
    wikipedia: m.wikipedia === false ? undefined : (m.wikipedia || (d && wikipedia(d, romanian(d))) || undefined),
    goodreads: m.goodreads === false ? undefined : (m.goodreads || (d?.goodreads ? `https://www.goodreads.com/author/show/${d.goodreads}` : undefined)),
  };
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
  await sleep(400);
}
const manualStories = manual.stories || {};
for (const s of stories) {
  let w = null;
  for (const title of [s.title, ...(s.altTitles || [])]) {
    const m = works.get(s.author + '\n' + norm(title));
    if (m && m.size === 1) { w = [...m.values()][0]; break; }
  }
  const ms = manualStories[s.id] || {};
  const autoWiki = w ? wikipedia(w, romanian(people[s.author] || {})) : undefined;
  const autoGr = w?.grWork ? `https://www.goodreads.com/work/editions/${w.grWork}` : w?.grBook ? `https://www.goodreads.com/book/show/${w.grBook}` : undefined;
  const e = {
    wikidata: ms.wikidata || (w && qid(w.work)) || undefined,
    wikipedia: ms.wikipedia === false ? undefined : (ms.wikipedia || autoWiki || undefined),
    goodreads: ms.goodreads === false ? undefined : (ms.goodreads || autoGr || undefined),
  };
  if (e.wikipedia || e.goodreads) out.stories[s.id] = e;
}
// Warn if manual file has keys no longer in catalog
for (const k of Object.keys(manualPeople)) if (!roles.has(k)) console.warn(`wiki-manual: unknown person "${k}"`);
for (const k of Object.keys(manualStories)) if (!storyIds.has(k)) console.warn(`wiki-manual: unknown story "${k}"`);

const sorted = (o) => Object.fromEntries(Object.keys(o).sort((a, b) => a.localeCompare(b, 'ro')).map((k) => [k, o[k]]));
writeFileSync(new URL('../catalog/wiki.json', import.meta.url), JSON.stringify({ people: sorted(out.people), stories: sorted(out.stories) }, null, 1) + '\n');
const ppl = Object.values(out.people);
const sts = Object.values(out.stories);
console.log(`wiki: ${ppl.length} of ${allNames.length} names matched (${ppl.filter((p) => p.wikipedia).length} Wikipedia, ${ppl.filter((p) => p.goodreads).length} Goodreads, ${ppl.filter((p) => p.photo).length} photo); ${sts.length} of ${stories.length} stories (${sts.filter((s) => s.wikipedia).length} Wikipedia, ${sts.filter((s) => s.goodreads).length} Goodreads)`);
