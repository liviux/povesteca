// Validates catalog/*.json before every build: references, enums, duplicates.
// Run: npm run check
import { readFileSync } from 'node:fs';

const load = (n) => JSON.parse(readFileSync(new URL(`../catalog/${n}.json`, import.meta.url)));
const [stories, versions, sources, collections] = ['stories', 'versions', 'sources', 'collections'].map(load);
const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);

const ENUM = {
  kind: ['teatru-radiofonic', 'dramatizare', 'narata', 'muzicala', 'educativa'],
  voices: ['narator', 'mai-multe', 'distributie'],
  sfx: ['fara', 'discrete', 'bogate'],
  music: ['fara', 'ambientala', 'importanta'],
  moods: ['linistitoare', 'amuzanta', 'aventuroasa', 'magica', 'misterioasa', 'educativa', 'somn', 'intensa'],
  genre: ['basm', 'poveste', 'roman', 'poveste-muzicala', 'legenda', 'biografie'],
  estimated: ['kind', 'voices', 'sfx', 'music', 'moods', 'age', 'quality'],
};
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function ids(list, name) {
  const seen = new Set();
  for (const x of list) {
    if (!x.id || !SLUG.test(x.id)) err(`${name}: bad id "${x.id}"`);
    if (seen.has(x.id)) err(`${name}: duplicate id "${x.id}"`);
    seen.add(x.id);
  }
  return seen;
}
const S = ids(stories, 'stories'), V = ids(versions, 'versions'), SRC = ids(sources, 'sources');
ids(collections, 'collections');

// catalog/wiki.json comes from scripts/wiki.js (+ catalog/wiki-manual.json): freely licensed photos with source & credit, plus verified Wikipedia and Goodreads links
const wiki = load('wiki');
const PHOTO_LIC = /^(public domain|cc0( \d(\.\d)?)?|cc by(-nc)?(-sa)?( \d(\.\d)?( [a-z]{2})?)?|attribution)$/i;
for (const [name, p] of Object.entries(wiki.people)) {
  if (p.wikipedia && !/^https:\/\/[a-z-]+\.wikipedia\.org\/wiki\/.+/.test(p.wikipedia)) err(`wiki ${name}: bad Wikipedia URL "${p.wikipedia}"`);
  if (p.goodreads && !/^https:\/\/www\.goodreads\.com\/author\/show\/\d+/.test(p.goodreads)) err(`wiki ${name}: bad Goodreads author URL "${p.goodreads}"`);
  if (!p.photo) continue;
  if (!/^https:\/\/.+/.test(p.photo.src || '') || !/^https:\/\/.+/.test(p.photo.page || '')) err(`wiki ${name}: photo needs an HTTPS image address and source page`);
  if (!PHOTO_LIC.test(p.photo.license || '')) err(`wiki ${name}: photo license "${p.photo.license}" is not one the project can use`);
}
for (const [id, s] of Object.entries(wiki.stories)) {
  if (s.wikipedia && !/^https:\/\/[a-z-]+\.wikipedia\.org\/wiki\/.+/.test(s.wikipedia)) err(`wiki story ${id}: bad Wikipedia URL "${s.wikipedia}"`);
  if (s.goodreads && !/^https:\/\/www\.goodreads\.com\/(book\/show|work\/editions)\/\d+/.test(s.goodreads)) err(`wiki story ${id}: bad Goodreads book URL "${s.goodreads}"`);
}

for (const s of stories) {
  if (!s.title || !s.author) err(`story ${s.id}: title and author are required`);
  // an empty summary is allowed: what can't be found from a source stays empty (AGENTS.md)
  if (typeof s.summary?.ro !== 'string' || typeof s.summary?.en !== 'string') err(`story ${s.id}: summary.ro and summary.en must be text (empty when unknown)`);
  if (s.year != null && (!Number.isInteger(s.year) || s.year < 0 || s.year > 2100)) err(`story ${s.id}: bad year "${s.year}"`);
  if (s.genre && !ENUM.genre.includes(s.genre)) err(`story ${s.id}: genre "${s.genre}"`);
  if (!versions.some((v) => v.storyId === s.id)) warn(`story ${s.id} has no recordings`);
}

const LINK_RANK = { audio: 0, youtube: 1, archive: 2, link: 3 };
const linkOwner = new Map();
for (const v of versions) {
  const at = `version ${v.id}`;
  if (!S.has(v.storyId)) err(`${at}: unknown storyId "${v.storyId}"`);
  if (!SRC.has(v.sourceId)) err(`${at}: unknown sourceId "${v.sourceId}"`);
  if (!v.title) err(`${at}: title is required`);
  if (!Number.isInteger(v.duration) || v.duration <= 0) err(`${at}: duration must be seconds (integer > 0)`);
  if (v.year != null && (!Number.isInteger(v.year) || v.year < 1900 || v.year > 2100)) err(`${at}: bad year "${v.year}"`);
  for (const k of ['kind', 'voices', 'sfx', 'music']) if (v[k] != null && !ENUM[k].includes(v[k])) err(`${at}: ${k} "${v[k]}"`);
  for (const m of v.moods || []) if (!ENUM.moods.includes(m)) err(`${at}: mood "${m}"`);
  for (const e of v.estimated || []) if (!ENUM.estimated.includes(e)) err(`${at}: estimated "${e}"`);
  if (v.age != null && !(Number.isInteger(v.age) && v.age >= 0 && v.age <= 18)) err(`${at}: age`);
  if (v.quality != null && !(Number.isInteger(v.quality) && v.quality >= 1 && v.quality <= 5)) err(`${at}: quality must be 1-5`);
  if (v.start != null && v.end != null && v.end <= v.start) err(`${at}: end before start`);
  if ('cover' in v && v.cover !== false && (typeof v.cover !== 'string' || !/^https?:\/\//.test(v.cover))) err(`${at}: cover can only be false or an image URL`);
  if (!v.links?.length) err(`${at}: needs at least one link`);
  let prevRank = -1;
  let orderWarned = false;
  for (const l of v.links || []) {
    const r = LINK_RANK[l.type];
    if (r != null) {
      if (r < prevRank && !orderWarned) {
        warn(`${at}: links should be ordered audio -> youtube -> archive -> link`);
        orderWarned = true;
      }
      prevRank = Math.max(prevRank, r);
    }
    const s = l.start ?? v.start, e = l.end ?? v.end;
    if (s != null && e != null && e <= s) err(`${at}: end before start`);
    const span = s != null || e != null ? `#${s || 0}-${e || ''}` : '';
    const key = (l.type === 'archive' ? `archive:${l.id}/${l.file}` : l.type === 'youtube' ? `youtube:${l.id}` : l.type === 'audio' ? `audio:${l.url}` : `url:${l.url}`) + span;
    if (l.type === 'archive' && (!l.id || !l.file)) err(`${at}: archive link needs id and file`);
    if (l.type === 'audio' && (!l.url || !/^https?:\/\//.test(l.url))) err(`${at}: audio link needs url`);
    if (l.type === 'link' && !/^https?:\/\/.+/.test(l.url || '')) err(`${at}: external link needs an HTTP(S) URL`);
    if (l.type === 'youtube' && !/^[\w-]{11}$/.test(l.id || '')) err(`${at}: bad YouTube id "${l.id}"`);
    if (!['archive', 'audio', 'youtube', 'link'].includes(l.type)) err(`${at}: link type "${l.type}"`);
    // the same file or video in two versions means one production was entered twice
    if (linkOwner.has(key) && linkOwner.get(key) !== v.id) err(`${at}: ${key} is already used by ${linkOwner.get(key)} (merge them as one recording with several links)`);
    linkOwner.set(key, v.id);
  }
}

const inCol = new Map();
for (const c of collections) {
  if (!SRC.has(c.sourceId)) err(`collection ${c.id}: unknown sourceId`);
  for (const id of c.items) {
    if (!V.has(id)) err(`collection ${c.id}: unknown version "${id}"`);
    if (inCol.has(id)) warn(`version ${id} is in two collections (${inCol.get(id)}, ${c.id}); the site shows the first`);
    inCol.set(id, c.id);
  }
}

warnings.forEach((w) => console.warn('warn:', w));
errors.forEach((e) => console.error('error:', e));
console.log(`catalog: ${stories.length} stories, ${versions.length} recordings, ${sources.length} sources, ${collections.length} collections, ${errors.length} errors`);
process.exit(errors.length ? 1 : 0);
