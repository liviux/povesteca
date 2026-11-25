// the catalog without its long texts; see vite.config.js
import urls from 'virtual:catalog-urls';
import { label, ENUMS } from './i18n.js';
import { set, state } from './store.js';

let catalog = { stories: [], versions: [], sources: [], collections: [] };
export let loadError = null;
try {
  const response = await fetch(urls.main);
  if (!response.ok) throw new Error(`catalog ${response.status}`);
  catalog = await response.json();
} catch (e) {
  loadError = e;
  console.error('catalog:', e);
}

export const { sources, collections } = catalog;
// the whole catalogue; `stories` and `versions` below hold only what fits the age chosen in Settings
export const allStories = catalog.stories;
export const allVersions = catalog.versions;
export const REPO = 'https://github.com/liviux/povesteca';

// Mood filters run before rendering, so keep missing values list-shaped too.
for (const v of allVersions) v.moods ??= [];

const map = (list) => new Map(list.map((x) => [x.id, x]));
// by id: everything, so a saved or shared link still finds its story; pages check fits() before showing it
export const storyById = map(allStories);
export const versionById = map(allVersions);
export const sourceById = map(sources);
export const collectionById = map(collections);

// The long texts (summaries in the current language, credits, characters, themes, the "≈" marks,
// people's photos and links) come in separate files, a moment after the page. Until then
// story.summary, v.credits, v.estimated and personInfo() are empty. Calling again after a failure retries.
let wiki = { people: {}, stories: {} };
// sorted filter lists computed at build time (authors, characters, crew, counts), so Explore doesn't sort them
export let catalogFilters = null;
let commonPromise;
const langPromises = {};
let commonLoaded = false;
let detailsChanged = false;
const loadedLangs = new Set();

const loadJson = (url) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
});

// the sorted filter lists are only needed by Explore; story pages and Home don't download them
let browsePromise;
export function loadBrowse() {
  return browsePromise ||= loadJson(urls.browse).then((d) => {
    catalogFilters = d.filters || null;
    set({ filtersReady: true });
  }).catch((e) => {
    browsePromise = null;
    throw e;
  });
}

function mergeCommon(d) {
  for (const [id, x] of Object.entries(d.stories || {})) Object.assign(storyById.get(id) || {}, x);
  for (const [id, x] of Object.entries(d.versions || {})) Object.assign(versionById.get(id) || {}, x);
  if (d.wiki) wiki = d.wiki;
  refreshPeople();
  commonLoaded = true;
  detailsChanged = true;
}
function mergeLanguage(lang, d) {
  for (const [id, x] of Object.entries(d.stories || {})) {
    const s = storyById.get(id);
    if (s) s.summary = { ...(s.summary || {}), ...(x.summary || {}) };
  }
  loadedLangs.add(lang);
  detailsChanged = true;
}

export function loadDetails(lang = 'ro') {
  const code = lang === 'en' ? 'en' : 'ro';
  const p = Promise.all([
    commonPromise ||= loadJson(urls.common).then(mergeCommon),
    langPromises[code] ||= loadJson(urls[code]).then((d) => mergeLanguage(code, d)),
  ]).then(() => {
    if (detailsChanged) {
      detailsChanged = false;
      prepareSearch(); // again, with the summaries and credits
    }
  });
  return p.catch((e) => {
    // a failed file must be tried again next time; a successful one stays loaded
    if (!commonLoaded) commonPromise = null;
    if (!loadedLangs.has(code)) langPromises[code] = null;
    throw e;
  });
}

const group = (list, key) => {
  const m = new Map();
  for (const x of list) (m.get(x[key]) || m.set(x[key], []).get(x[key])).push(x);
  return m;
};
export const allVersionsByStory = group(allVersions, 'storyId');
export const allVersionsBySource = group(allVersions, 'sourceId');
// `author` is one name, or a list when a story has several authors
export const authorsOf = (s) => [].concat(s?.author || []);

// --- the age chosen in Settings ("Vârsta maximă"): a recording for older children doesn't show anywhere,
// and a story shows only while one of its recordings fits. 0 = every age.
export const fits = (v) => !state.maxAge || (v.age || 0) <= state.maxAge;
export const storyFits = (s) => (allVersionsByStory.get(s.id) || []).some(fits);
export const stories = [], versions = [];
export const versionsByStory = new Map(), versionsBySource = new Map(), storiesByAuthor = new Map();
// the lists are refilled in place, so every page that imported them sees the new age
function refit() {
  versions.splice(0, Infinity, ...allVersions.filter(fits));
  stories.splice(0, Infinity, ...allStories.filter(storyFits));
  for (const [m, k] of [[versionsByStory, 'storyId'], [versionsBySource, 'sourceId']]) {
    m.clear();
    for (const [id, list] of group(versions, k)) m.set(id, list);
  }
  storiesByAuthor.clear();
  for (const s of stories) for (const a of authorsOf(s)) (storiesByAuthor.get(a) || storiesByAuthor.set(a, []).get(a)).push(s);
}
refit();
export function setMaxAge(n) {
  state.maxAge = n;
  refit();
  set({ maxAge: n });
}
// "(3 ascunse de vârsta aleasă)": how many of a list don't fit the age
export const hiddenCount = (list) => (limited() ? (list || []).filter((v) => !fits(v)).length : 0);
// true while the age hides something
export const limited = () => versions.length < allVersions.length;
export const collectionOf = new Map();
for (const c of collections) c.items.forEach((id, i) => collectionOf.set(id, { c, i }));

// Only the covers whose originals are often 1-3 MB go through the resizing service. YouTube and
// Internet Archive already serve small images and are faster directly; people's photos use Wikimedia's
// own thumbnails. The service keeps its own cache; Povesteca stores nothing.
const PROXY = 'https://wsrv.nl/';
const HEAVY = /(^|\.)(discogs\.com|eteatru\.ro|libsyn\.com|cloudfront\.net|radiomoldova\.md|srr\.ro|radiomures\.ro|minipovesti\.ro|povestilecristinei\.ro)$/i;
export function resized(url, size = 180, format = 'webp', fit = 'cover') {
  if (!url || !/^https?:\/\//i.test(url)) return url;
  let host;
  try { host = new URL(url).hostname; } catch { return url; }
  if (!HEAVY.test(host)) return url;
  const px = Math.max(32, Math.round(size * 2));
  return `${PROXY}?url=${encodeURIComponent(url)}&w=${px}&h=${px}&fit=${fit}&output=${format}&q=80`;
}
// Wikimedia already has every thumbnail size; use its own 64/320 px files instead of a proxy.
export function portrait(url, size = 160) {
  if (!url || !/wikimedia\.org\//i.test(url)) return url;
  const px = Math.max(32, Math.round(size * 2));
  return url.replace(/\/\d+px-/, `/${px}px-`);
}
function sourceCover(v) {
  if (!v || v.cover === false) return null;
  if (typeof v.cover === 'string') return v.cover;
  for (const l of v.links || []) {
    if (l.type === 'archive') return `https://archive.org/services/img/${l.id}`;
    if (l.type === 'youtube') return `https://i.ytimg.com/vi/${l.id}/mqdefault.jpg`;
  }
  return null;
}
export function cover(v, size = 180, format = 'webp') {
  const src = sourceCover(v);
  return src ? resized(src, size, format) : null;
}
export const storyCover = (s, size = 180) => cover(bestVersion(s.id), size);

export function linkUrl(l) {
  if (l.type === 'archive') return `https://archive.org/details/${l.id}`;
  if (l.type === 'youtube') return `https://www.youtube.com/watch?v=${l.id}`;
  if (l.type === 'audio') return l.page || l.url;
  return l.url;
}
// with the recording's links, two links with the same name are numbered: "Internet Archive 1", "Internet Archive 2"
export function linkLabel(l, src, links) {
  if (!l) return '';
  const name = (x) => {
    const host = x.type === 'youtube' ? 'YouTube' : x.type === 'archive' ? 'Internet Archive' : (x.via || src?.name || 'Audio');
    return host + (x.via && x.via !== host ? ` · ${x.via}` : '');
  };
  const same = (links || []).filter((x) => name(x) === name(l));
  return same.length > 1 ? `${name(l)} ${same.indexOf(l) + 1}` : name(l);
}
export const audioUrl = (l) => (l.type === 'archive' ? `https://archive.org/download/${l.id}/${encodeURIComponent(l.file)}` : l.url);

export const splitNames = (x) => (x ? x.split(/; |, | si | și /) : []);
// photo, Wikipedia and Goodreads for a person or a story, from scripts/wiki.js
export const personInfo = (name) => wiki.people[name];
export const storyLinks = (id) => wiki.stories[id];
export const personUrl = (name) => `/persoana/${encodeURIComponent(name)}`;
// the roles (keys of t.credits) a person has in one recording
export function rolesIn(v, name) {
  const c = v.credits || {};
  return [
    c.narrator?.includes(name) && 'narrator', c.cast?.some((x) => x.name === name) && 'cast',
    ...['director', 'adaptation', 'music', 'songs', 'soundDesign'].map((k) => splitNames(c[k]).includes(name) && k),
  ].filter(Boolean);
}
export const people = (v) => {
  const c = v.credits || {};
  return [...(c.narrator || []), ...(c.cast || []).map((x) => x.name), ...[c.director, c.adaptation, c.music, c.songs, c.soundDesign].flatMap(splitNames)];
};
// everyone credited on each recording, once, for filters, people pages and search
export const peopleByVersion = new Map();
export function refreshPeople() {
  for (const v of allVersions) peopleByVersion.set(v.id, people(v));
}

// --- ratings live outside the catalog; this is only the math
export function score(r) {
  // Bayesian average: one 5-star vote does not beat many 4-star ones
  const [sum, n] = r || [0, 0];
  return (3 * 3.5 + sum) / (3 + n);
}

export function bestVersion(storyId, ratings = {}, all = false) {
  const vs = (all ? allVersionsByStory : versionsByStory).get(storyId) || [];
  return [...vs].sort(byRecommended(ratings))[0];
}
const linkRank = (v) => ({ audio: 0, youtube: 1, archive: 2 }[v.links[0].type] ?? 3);
export const byRecommended = (ratings) => (a, b) =>
  ((ratings[b.id]?.[1] || 0) >= 3 ? score(ratings[b.id]) : 0) - ((ratings[a.id]?.[1] || 0) >= 3 ? score(ratings[a.id]) : 0) ||
  (b.quality || 0) - (a.quality || 0) ||
  linkRank(a) - linkRank(b);

// --- search: no AI, no service. Diacritics, case and one-letter typos don't matter.
export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// sorting thousands of names with a collator made once is much faster than localeCompare per pair
const roCollator = new Intl.Collator('ro');
export const compareRo = (a, b) => roCollator.compare(String(a || ''), String(b || ''));
const STOP = new Set('si cu de la pe in o un una a al ale ai despre pentru care din ce mai sau the of and with about for to an'.split(' '));
const words = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

// The search index. vocab: every word of the catalogue once; index: { v, fields: [[weight, numbers of its
// words in vocab]] }; seen: what each query word matched, kept while typing. Reading the whole catalogue
// takes a moment, so it isn't done when the app starts: prepareSearch() does it in small steps once the
// details are in, and a search that comes before it's done finishes it.
let index, vocab, seen, job, buckets;
let searchCache = new Map();
function* indexer() {
  const ids = new Map(), voc = [], list = [];
  const id = (x) => {
    let i = ids.get(x);
    if (i === undefined) {
      ids.set(x, (i = voc.length));
      voc.push(x);
    }
    return i;
  };
  // texts that repeat (a summary shared by a story's recordings, a mood, a genre) are read once
  const once = new Map();
  const cached = (key, text) => once.get(key) || once.set(key, words(text()).map(id)).get(key);
  const en = (k, val) => cached(k + ':' + val, () => [label(k, val, 'ro'), label(k, val, 'en'), ...(ENUMS[k]?.[val]?.kw || [])].join(' '));
  for (const v of allVersions) {
    const s = storyById.get(v.storyId);
    const col = collectionOf.get(v.id)?.c;
    list.push({
      v,
      fields: [
        [10, words([s.title, ...(s.altTitles || []), v.title].join(' ')).map(id)],
        [6, words([...authorsOf(s), ...(s.characters || []), ...(peopleByVersion.get(v.id) || [])].join(' ')).map(id)],
        [4, words([sourceById.get(v.sourceId)?.name, col?.title, col?.code, s.year, v.year, label('origin', s.origin, 'ro'), label('origin', s.origin, 'en')].join(' ')).map(id)],
        [2, [...cached(s.id, () => [s.summary?.ro, s.summary?.en].join(' ')), ...(s.themes || []).flatMap((t) => en('themes', t)), ...(v.moods || []).flatMap((m) => en('moods', m)),
          ...en('kind', v.kind), ...en('voices', v.voices), ...en('sfx', v.sfx), ...en('music', v.music), ...en('genre', s.genre)]],
      ],
    });
    yield;
  }
  const byChar = new Map();
  voc.forEach((x, i) => {
    for (const c of new Set([x[0], x[1]])) {
      if (!c) continue;
      (byChar.get(c) || byChar.set(c, []).get(c)).push(i);
    }
  });
  [index, vocab, seen, job, buckets] = [list, voc, new Map(), null, byChar];
  searchCache = new Map();
}
function prepareSearch() {
  set({ searchReady: false });
  const own = (job = indexer());
  // about 10 ms at a time, between the browser's other work, so a tap or a scroll never waits for it
  const step = () => {
    for (const end = performance.now() + 10; job === own && performance.now() < end;) {
      if (own.next().done) return set({ searchReady: true });
    }
    if (job === own) setTimeout(step);
  };
  setTimeout(step);
}

// edit distance <= 1 (or 2 for long words) between a and the first n letters of b;
// it runs for many words of the catalogue, so it reuses two rows instead of making new ones
const rowA = [], rowB = [];
function near(a, b, n = b.length) {
  n = Math.min(n, b.length);
  if (Math.abs(a.length - n) > 2) return false;
  const max = a.length >= 7 ? 2 : 1;
  let prev = rowA, cur = rowB;
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const c = a.charCodeAt(i - 1);
    let rowMin = cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (c === b.charCodeAt(j - 1) ? 0 : 1));
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return false;
    [prev, cur] = [cur, prev];
  }
  return prev[n] <= max;
}

// for each word of the catalogue: 2 if it starts with w, 1 if it matches w with a typo (w of 4 letters or more).
// Only words starting with w's first or second letter are compared: most of the vocabulary is skipped.
function matches(w) {
  let hit = seen.get(w);
  if (hit) return hit;
  hit = new Uint8Array(vocab.length);
  const cand = new Set();
  for (const c of w.length > 1 ? [w[0], w[1]] : [w[0]]) {
    const list = buckets?.get(c);
    if (list) for (const i of list) cand.add(i);
  }
  for (const i of cand) {
    const x = vocab[i];
    if (x.startsWith(w)) hit[i] = 2;
    else if (w.length >= 4 && (near(w, x, w.length + 1) || near(w, x))) hit[i] = 1;
  }
  if (seen.size > 50) seen.clear();
  seen.set(w, hit);
  return hit;
}

/** Returns Map(versionId -> score). Every query word must match something. */
export function search(q) {
  const qs = words(q).filter((w) => !STOP.has(w));
  if (!qs.length) return null;
  const key = qs.join(' ');
  const cached = searchCache.get(key);
  if (cached) return new Map(cached);
  if (job || !index) return null; // still indexing; Explore shows "loading" until searchReady
  // each query word is compared once with each word of the catalogue, not once per recording that has it
  const hits = qs.map(matches);
  const out = new Map();
  for (const { v, fields } of index) {
    let total = 0;
    for (const hit of hits) {
      let best = 0;
      for (const [weight, ws] of fields) {
        if (weight <= best) continue;
        let m = 0;
        for (const i of ws) if (hit[i] > m && (m = hit[i]) === 2) break;
        if (m) best = m === 2 ? weight : weight * 0.6;
      }
      if (!best) { total = 0; break; }
      total += best;
    }
    if (total) out.set(v.id, total);
  }
  if (out.size) {
    searchCache.set(key, out);
    if (searchCache.size > 20) searchCache.delete(searchCache.keys().next().value);
  }
  return out;
}

// --- filters shared by Explore and "Surprinde-mă"
export const DURATIONS = { mic: [0, 360], scurt: [360, 900], mediu: [900, 1800], lung: [1800, 3600], foarte: [3600, 1e9] };
export function applyFilters(list, f, ratings = {}) {
  return list.filter((v) => {
    const s = storyById.get(v.storyId);
    if (f.kind && v.kind !== f.kind) return false;
    if (f.voices && v.voices !== f.voices) return false;
    if (f.sfx && v.sfx !== f.sfx) return false;
    if (f.music && v.music !== f.music) return false;
    if (f.mood && !f.mood.split(',').every((m) => v.moods.includes(m))) return false;
    if (f.age && v.age > +f.age) return false;
    if (f.dur) { const [a, b] = DURATIONS[f.dur] || [0, 1e9]; if (v.duration < a || v.duration >= b) return false; }
    if (f.genre && s.genre !== f.genre) return false;
    if (f.origin && s.origin !== f.origin) return false;
    if (f.author && !authorsOf(s).includes(f.author)) return false;
    if (f.char && !s.characters?.includes(f.char)) return false;
    if (f.source && v.sourceId !== f.source) return false;
    if (f.col && !collectionById.get(f.col)?.items.includes(v.id)) return false;
    if (f.person && !(peopleByVersion.get(v.id) || []).includes(f.person)) return false;
    return true;
  });
}
// show: povesti | inregistrari (empty: both, stories first); only Explore reads it
export const FILTER_KEYS = ['show', 'kind', 'voices', 'sfx', 'music', 'mood', 'age', 'dur', 'genre', 'origin', 'author', 'char', 'source', 'col', 'person'];

export function sortVersions(list, sort, ratings = {}, rel) {
  const by = {
    relevanta: (a, b) => (rel?.get(b.id) || 0) - (rel?.get(a.id) || 0),
    aleator: (a, b) => randomRank.get(a.id) - randomRank.get(b.id),
    recomandate: byRecommended(ratings),
    rating: (a, b) => score(ratings[b.id]) - score(ratings[a.id]),
    scurte: (a, b) => a.duration - b.duration,
    lungi: (a, b) => b.duration - a.duration,
    titlu: (a, b) => compareRo(storyById.get(a.storyId).title, storyById.get(b.storyId).title),
    recente: (a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''),
  }[sort] || byRecommended(ratings);
  return [...list].sort((a, b) => by(a, b) || compareRo(storyById.get(a.storyId).title, storyById.get(b.storyId).title));
}

export const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
// a new random order on every visit, kept while browsing so "show more" and Back don't reshuffle
const randomRank = new Map(shuffle(allVersions).map((v, i) => [v.id, i]));

const ORIGINAL_MODERN = new Set([
  'afostodata', 'oameni-mici-si-mari',
  'teatrul-puck', 'teatrul-gong', 'somnorosi', 'yt-teatrul-ion-creanga', 'yt-opera-comica',
  'yt-minireactor', 'yt-teatrul-colibri', 'cutiuta-cu-povesti', 'pippin-cel-curios',
  'radio-moldova',
]);
const creditSet = (v) => new Set((peopleByVersion.get(v.id) || []).map((n) => norm(n)).filter((n) => n.length >= 4));

/** Finds separate Version entries under the same story that are likely cross-source duplicates. */
export function duplicateMap(vs) {
  const out = new Map();
  const seen = [];
  for (const v of vs) {
    const cV = creditSet(v);
    for (const { u, cU } of seen) {
      if (u.sourceId === v.sourceId) continue;
      if (ORIGINAL_MODERN.has(u.sourceId) || ORIGINAL_MODERN.has(v.sourceId)) continue;
      const durDiff = Math.abs((u.duration || 0) - (v.duration || 0));
      let shared = 0;
      for (const p of cV) if (cU.has(p)) shared++;
      const sameYear = Boolean(u.year && v.year && u.year === v.year);
      const sameVoice = u.voices === v.voices || (u.voices !== 'narator' && v.voices !== 'narator');
      if (
        (shared >= 2 && durDiff <= 180) ||
        (sameYear && sameVoice && durDiff <= 90) ||
        (sameVoice && Math.min(u.duration || 0, v.duration || 0) >= 180 && durDiff <= 20)
      ) {
        out.set(v.id, u);
        break;
      }
    }
    seen.push({ u: v, cU: cV });
  }
  return out;
}
