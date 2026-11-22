import stories from '../catalog/stories.json';
import versions from '../catalog/versions.json';
import sources from '../catalog/sources.json';
import collections from '../catalog/collections.json';
import { label, ENUMS } from './i18n.js';

export { stories, versions, sources, collections };

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
export const collectionOf = new Map();
for (const c of collections) c.items.forEach((id, i) => collectionOf.set(id, { c, i }));

export const authors = [...new Set(stories.map((s) => s.author))].sort((a, b) => a.localeCompare(b, 'ro'));

export function cover(v) {
  const l = v?.links?.[0];
  if (!l) return null;
  return l.type === 'archive' ? `https://archive.org/services/img/${l.id}` : l.type === 'youtube' ? `https://i.ytimg.com/vi/${l.id}/mqdefault.jpg` : null;
}
export const storyCover = (s) => cover(bestVersion(s.id));

export function linkUrl(l) {
  if (l.type === 'archive') return `https://archive.org/details/${l.id}`;
  if (l.type === 'youtube') return `https://www.youtube.com/watch?v=${l.id}`;
  return l.url;
}
export const audioUrl = (l) => `https://archive.org/download/${l.id}/${encodeURIComponent(l.file)}`;

export const splitNames = (x) => (x ? x.split(/; |, | si | și /) : []);
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
export const byRecommended = (ratings) => (a, b) =>
  ((ratings[b.id]?.[1] || 0) >= 3 ? score(ratings[b.id]) : 0) - ((ratings[a.id]?.[1] || 0) >= 3 ? score(ratings[a.id]) : 0) ||
  (b.quality || 0) - (a.quality || 0) ||
  (a.links[0].type === 'archive' ? -1 : 0) - (b.links[0].type === 'archive' ? -1 : 0);

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
      [6, [s.author, ...s.characters, ...people(v)].join(' ')],
      [4, [sourceById.get(v.sourceId)?.name, col?.title, col?.code, v.year].join(' ')],
      [2, [s.summary.ro, s.summary.en, ...s.themes.map((t) => enumText('themes', t)), ...v.moods.map((m) => enumText('moods', m)),
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
    if (f.author && s.author !== f.author) return false;
    if (f.source && v.sourceId !== f.source) return false;
    if (f.col && !collectionById.get(f.col)?.items.includes(v.id)) return false;
    if (f.person && !people(v).includes(f.person)) return false;
    if (f.quality && !((v.quality || 0) >= +f.quality)) return false;
    return true;
  });
}
export const FILTER_KEYS = ['kind', 'voices', 'sfx', 'music', 'mood', 'age', 'dur', 'author', 'source', 'col', 'person', 'quality'];

export function sortVersions(list, sort, ratings = {}, rel) {
  const by = {
    relevanta: (a, b) => (rel?.get(b.id) || 0) - (rel?.get(a.id) || 0),
    recomandate: byRecommended(ratings),
    rating: (a, b) => score(ratings[b.id]) - score(ratings[a.id]),
    scurte: (a, b) => a.duration - b.duration,
    lungi: (a, b) => b.duration - a.duration,
    calitate: (a, b) => (b.quality || 0) - (a.quality || 0),
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
