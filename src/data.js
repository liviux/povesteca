import stories from '../catalog/stories.json';
import versions from '../catalog/versions.json';
import sources from '../catalog/sources.json';
import collections from '../catalog/collections.json';
import wiki from '../catalog/wiki.json';
import { label, ENUMS } from './i18n.js';

export { stories, versions, sources, collections };
export const REPO = 'https://github.com/liviux/povesteca';

const map = (list) => new Map(list.map((x) => [x.id, x]));
export const storyById = map(stories);
export const versionById = map(versions);
export const sourceById = map(sources);
export const collectionById = map(collections);

const group = (list, key) => {
  const m = new Map();
  for (const x of list) m.set(x[key], [...(m.get(x[key]) || []), x]);
  return m;
};
export const versionsByStory = group(versions, 'storyId');
export const versionsBySource = group(versions, 'sourceId');
export const storiesByAuthor = group(stories, 'author');
export const collectionOf = new Map();
for (const c of collections) c.items.forEach((id, i) => collectionOf.set(id, { c, i }));

export const authors = [...new Set(stories.map((s) => s.author).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ro'));
export const characters = [...new Set(stories.flatMap((s) => s.characters || []))].sort((a, b) => a.localeCompare(b, 'ro'));
export const origins = [...new Set(stories.map((s) => s.origin).filter(Boolean))].sort((a, b) => label('origin', a, 'ro').localeCompare(label('origin', b, 'ro'), 'ro'));

export function cover(v) {
  if (!v || v.cover === false) return null;
  if (typeof v.cover === 'string') return v.cover;
  for (const l of v.links || []) {
    if (l.type === 'archive') return `https://archive.org/services/img/${l.id}`;
    if (l.type === 'youtube') return `https://i.ytimg.com/vi/${l.id}/mqdefault.jpg`;
  }
  return null;
}
export const storyCover = (s) => cover(bestVersion(s.id));

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
    ...['director', 'adaptation', 'music', 'songs'].map((k) => splitNames(c[k]).includes(name) && k),
  ].filter(Boolean);
}
export const people = (v) => {
  const c = v.credits || {};
  return [...(c.narrator || []), ...(c.cast || []).map((x) => x.name), ...[c.director, c.adaptation, c.music, c.songs].flatMap(splitNames)];
};

// --- ratings live outside the catalog; this is only the math
export function score(r) {
  // Bayesian average: one 5-star vote does not beat many 4-star ones
  const [sum, n] = r || [0, 0];
  return (3 * 3.5 + sum) / (3 + n);
}

export function bestVersion(storyId, ratings = {}) {
  const vs = versionsByStory.get(storyId) || [];
  return [...vs].sort(byRecommended(ratings))[0];
}
const isDirect = (v) => (v.links[0].type === 'archive' || v.links[0].type === 'audio' ? -1 : 0);
export const byRecommended = (ratings) => (a, b) =>
  ((ratings[b.id]?.[1] || 0) >= 3 ? score(ratings[b.id]) : 0) - ((ratings[a.id]?.[1] || 0) >= 3 ? score(ratings[a.id]) : 0) ||
  (b.quality || 0) - (a.quality || 0) ||
  isDirect(a) - isDirect(b);

// --- search: no AI, no service. Diacritics, case and one-letter typos don't matter.
export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const STOP = new Set('si cu de la pe in o un una a al ale ai despre pentru care din ce mai sau the of and with about for to an'.split(' '));
const words = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

const index = versions.map((v) => {
  const s = storyById.get(v.storyId);
  const enumText = (k, val) => [label(k, val, 'ro'), label(k, val, 'en'), ...(ENUMS[k]?.[val]?.kw || [])].join(' ');
  const col = collectionOf.get(v.id)?.c;
  return {
    v,
    fields: [
      [10, [s.title, ...(s.altTitles || []), v.title].join(' ')],
      [6, [s.author, ...(s.characters || []), ...people(v)].join(' ')],
      [4, [sourceById.get(v.sourceId)?.name, col?.title, col?.code, s.year, v.year, label('origin', s.origin, 'ro'), label('origin', s.origin, 'en')].join(' ')],
      [2, [s.summary.ro, s.summary.en, ...(s.themes || []).map((t) => enumText('themes', t)), ...(v.moods || []).map((m) => enumText('moods', m)),
        enumText('kind', v.kind), enumText('voices', v.voices), enumText('sfx', v.sfx), enumText('music', v.music), enumText('genre', s.genre)].join(' ')],
    ].map(([w, t]) => [w, words(t)]),
  };
});

function near(a, b) {
  // edit distance <= 1 (or 2 for long words), cheap enough for a few thousand words
  if (Math.abs(a.length - b.length) > 2) return false;
  const max = a.length >= 7 ? 2 : 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

/** Returns Map(versionId -> score). Every query word must match something. */
export function search(q) {
  const qs = words(q).filter((w) => !STOP.has(w));
  const out = new Map();
  if (!qs.length) return null;
  for (const { v, fields } of index) {
    let total = 0;
    for (const w of qs) {
      let best = 0;
      for (const [weight, ws] of fields) {
        if (weight <= best) continue;
        if (ws.some((x) => x.startsWith(w))) best = weight;
        else if (w.length >= 4 && ws.some((x) => near(w, x.slice(0, w.length + 1)) || near(w, x))) best = weight * 0.6;
      }
      if (!best) { total = 0; break; }
      total += best;
    }
    if (total) out.set(v.id, total);
  }
  return out;
}

// --- filters shared by Explore and "Surprinde-mă"
export const DURATIONS = { scurt: [0, 900], mediu: [900, 1800], lung: [1800, 3600], foarte: [3600, 1e9] };
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
    if (f.author && s.author !== f.author) return false;
    if (f.char && !s.characters?.includes(f.char)) return false;
    if (f.source && v.sourceId !== f.source) return false;
    if (f.col && !collectionById.get(f.col)?.items.includes(v.id)) return false;
    if (f.person && !people(v).includes(f.person)) return false;
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
    titlu: (a, b) => storyById.get(a.storyId).title.localeCompare(storyById.get(b.storyId).title, 'ro'),
    recente: (a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''),
  }[sort] || byRecommended(ratings);
  return [...list].sort((a, b) => by(a, b) || storyById.get(a.storyId).title.localeCompare(storyById.get(b.storyId).title, 'ro'));
}

export const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
// a new random order on every visit, kept while browsing so "show more" and Back don't reshuffle
const randomRank = new Map(shuffle(versions).map((v, i) => [v.id, i]));

const ORIGINAL_MODERN = new Set([
  'afostodata', 'oameni-mici-si-mari',
  'teatrul-puck', 'teatrul-gong', 'somnorosi', 'yt-teatrul-ion-creanga', 'yt-opera-comica',
]);
const creditSet = (v) => new Set(people(v).map((n) => norm(n)).filter((n) => n.length >= 4));

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
