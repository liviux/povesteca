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
  genre: ['basm', 'poveste', 'roman', 'poveste-muzicala'],
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

for (const s of stories) {
  if (!s.title || !s.author) err(`story ${s.id}: title and author are required`);
  if (!s.summary?.ro) err(`story ${s.id}: summary.ro is required`);
  if (s.genre && !ENUM.genre.includes(s.genre)) err(`story ${s.id}: genre "${s.genre}"`);
  if (!versions.some((v) => v.storyId === s.id)) warn(`story ${s.id} has no recordings`);
}

const linkOwner = new Map();
for (const v of versions) {
  const at = `version ${v.id}`;
  if (!S.has(v.storyId)) err(`${at}: unknown storyId "${v.storyId}"`);
  if (!SRC.has(v.sourceId)) err(`${at}: unknown sourceId "${v.sourceId}"`);
  if (!v.title) err(`${at}: title is required`);
  if (!Number.isInteger(v.duration) || v.duration <= 0) err(`${at}: duration must be seconds (integer > 0)`);
  for (const k of ['kind', 'voices', 'sfx', 'music']) if (v[k] != null && !ENUM[k].includes(v[k])) err(`${at}: ${k} "${v[k]}"`);
  for (const m of v.moods || []) if (!ENUM.moods.includes(m)) err(`${at}: mood "${m}"`);
  for (const e of v.estimated || []) if (!ENUM.estimated.includes(e)) err(`${at}: estimated "${e}"`);
  if (v.age != null && !(Number.isInteger(v.age) && v.age >= 0 && v.age <= 18)) err(`${at}: age`);
  if (v.quality != null && !(Number.isInteger(v.quality) && v.quality >= 1 && v.quality <= 5)) err(`${at}: quality must be 1-5`);
  if (v.start != null && v.end != null && v.end <= v.start) err(`${at}: end before start`);
  if (!v.links?.length) err(`${at}: needs at least one link`);
  for (const l of v.links || []) {
    const key = l.type === 'archive' ? `archive:${l.id}/${l.file}` : l.type === 'youtube' ? `youtube:${l.id}` : `url:${l.url}`;
    if (l.type === 'archive' && (!l.id || !l.file)) err(`${at}: archive link needs id and file`);
    if (l.type === 'youtube' && !/^[\w-]{11}$/.test(l.id || '')) err(`${at}: bad YouTube id "${l.id}"`);
    if (!['archive', 'youtube', 'link'].includes(l.type)) err(`${at}: link type "${l.type}"`);
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
