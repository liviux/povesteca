// Validates catalog/*.json before every build: references, enums, duplicates.
// Run: npm run check
import { existsSync, readFileSync } from 'node:fs';

const load = (n) => JSON.parse(readFileSync(new URL(`../catalog/${n}.json`, import.meta.url)));
const [stories, versions, sources, collections] = ['stories', 'versions', 'sources', 'collections'].map(load);
const rejectedUrl = new URL('../catalog/rejected.json', import.meta.url);
const rejected = existsSync(rejectedUrl) ? JSON.parse(readFileSync(rejectedUrl, 'utf8')) : { sources: [], stories: [], recordings: [] };
const rejectedSourceIds = new Set((rejected.sources || []).map((x) => x.id));
const rejectedSourceUrls = new Set((rejected.sources || []).map((x) => x.url).filter(Boolean));
const rejectedLinks = new Set((rejected.recordings || []).flatMap((x) => x.links || []));
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
const PHOTO_LIC = /^(public domain( mark( \d(\.\d)?)?)?|cc0( \d(\.\d)?)?|cc by(-nc)?(-sa)?( \d(\.\d)?( [a-z]{2})?)?|attribution|gfdl( \d(\.\d)?)?|free art license( \d(\.\d)?)?|fal( \d(\.\d)?)?|open government licence( \d(\.\d)?)?|ogl( \d(\.\d)?)?|copyrighted free use|no known copyright restrictions)$/i;
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
  // co-authors are a list of names, not one text with "și" or commas, so each gets a page of their own
  if (Array.isArray(s.author) ? s.author.length < 2 || !s.author.every((a) => typeof a === 'string' && a) : typeof s.author !== 'string') err(`story ${s.id}: author must be a name or a list of 2+ names`);
  if (typeof s.author === 'string' && /, /.test(s.author)) err(`story ${s.id}: author "${s.author}" looks like several names; use a list`);
  // every story must have a short plot summary in both Romanian and English (AGENTS.md)
  if (typeof s.summary?.ro !== 'string' || typeof s.summary?.en !== 'string' || !s.summary.ro.trim() || !s.summary.en.trim()) {
    err(`story ${s.id}: summary.ro and summary.en are required and cannot be empty`);
  }
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
  if (v.addedAt != null && !/^\d{4}-\d{2}-\d{2}$/.test(v.addedAt)) err(`${at}: bad addedAt "${v.addedAt}"`);
  if (v.audioVerified != null && !/^\d{4}-\d{2}-\d{2}$/.test(v.audioVerified)) err(`${at}: bad audioVerified "${v.audioVerified}"`);
  for (const k of ['kind', 'voices', 'sfx', 'music']) if (v[k] != null && !ENUM[k].includes(v[k])) err(`${at}: ${k} "${v[k]}"`);
  const moods = Array.isArray(v.moods) ? v.moods : [];
  if (!Array.isArray(v.moods)) err(`${at}: moods must be an array (use [] when unknown)`);
  for (const m of moods) if (!ENUM.moods.includes(m)) err(`${at}: mood "${m}"`);
  if (v.estimated != null && !Array.isArray(v.estimated)) err(`${at}: estimated must be an array`);
  for (const e of Array.isArray(v.estimated) ? v.estimated : []) if (!ENUM.estimated.includes(e)) err(`${at}: estimated "${e}"`);
  if (moods.length && !v.estimated?.includes('moods')) err(`${at}: mood judgements must be marked estimated`);
  // the catalog is for children up to 10 (AGENTS.md)
  if (v.age != null && !(Number.isInteger(v.age) && v.age >= 0 && v.age <= 10)) err(`${at}: age must be 0-10`);
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
    const baseKey = l.type === 'archive' ? `archive:${l.id}/${l.file}` : l.type === 'youtube' ? `youtube:${l.id}` : l.type === 'audio' ? `audio:${l.url}` : `url:${l.url}`;
    const key = baseKey + span;
    if (l.type === 'archive' && (!l.id || !l.file)) err(`${at}: archive link needs id and file`);
    if (l.type === 'audio' && (!l.url || !/^https?:\/\//.test(l.url))) err(`${at}: audio link needs url`);
    if (l.type === 'link' && !/^https?:\/\/.+/.test(l.url || '')) err(`${at}: external link needs an HTTP(S) URL`);
    if (l.type === 'youtube' && !/^[\w-]{11}$/.test(l.id || '')) err(`${at}: bad YouTube id "${l.id}"`);
    if (!['archive', 'audio', 'youtube', 'link'].includes(l.type)) err(`${at}: link type "${l.type}"`);
    // the same file or video in two versions means one production was entered twice
    if (linkOwner.has(key) && linkOwner.get(key) !== v.id) err(`${at}: ${key} is already used by ${linkOwner.get(key)} (merge them as one recording with several links)`);
    linkOwner.set(key, v.id);
    if (rejectedLinks.has(baseKey) || rejectedLinks.has(key)) err(`${at}: link ${key} is in catalog/rejected.json`);
  }
}

for (const src of rejected.sources || []) {
  if (!src.id || !src.reason) err(`rejected.sources: entry missing id or reason`);
  if (SRC.has(src.id)) err(`source ${src.id} is in catalog/rejected.json`);
}
for (const src of sources) {
  if (src.url && rejectedSourceUrls.has(src.url)) err(`source ${src.id}: URL ${src.url} is in catalog/rejected.json`);
}
for (const s of rejected.stories || []) {
  if (!s.id || !s.reason) err(`rejected.stories: entry missing id or reason`);
  if (S.has(s.id)) err(`story ${s.id} is in catalog/rejected.json`);
}
for (const r of rejected.recordings || []) {
  if (!r.id || !r.reason) err(`rejected.recordings: entry missing id or reason`);
  if (V.has(r.id)) err(`version ${r.id} is in catalog/rejected.json`);
}
for (const v of versions) {
  if (rejectedSourceIds.has(v.sourceId)) err(`version ${v.id}: sourceId "${v.sourceId}" is in catalog/rejected.json`);
}

// a source with fewer than 5 recordings is removed completely (AGENTS.md)
for (const src of sources) {
  const n = versions.filter((v) => v.sourceId === src.id).length;
  if (n < 5) err(`source ${src.id}: only ${n} recordings (a source needs at least 5)`);
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
