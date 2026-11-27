import { useEffect, useState } from 'preact/hooks';
import { DICT } from './i18n.js';

// --- tiny global store: everything personal lives in localStorage, nothing leaves the browser
const KEY = 'povesteca:v1';
const DEFAULTS = { lang: 'ro', theme: 'clasic', favStories: [], favVersions: [], favPeople: [], favSources: [], favCols: [], history: [], pos: {}, votes: {}, lastVoteAt: 0, rate: 1, maxAge: 10, ageAsked: false };
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}

export const state = {
  ...DEFAULTS, ...saved,
  // not persisted
  ratings: {}, ratingsOk: null,
  details: false, // the catalog's long texts have arrived (loadDetails in data.js)
  searchReady: false, // the search index is built (prepareSearch in data.js)
  filtersReady: false, // the sorted filter lists have arrived (loadBrowse in data.js)
  player: { id: null, status: 'idle', time: 0, duration: 0, sleepAt: 0, sleepEnd: false, night: false, link: 0 },
};
// the oldest age shown, 3 to 10; 10 shows everything (every story is for 10 or younger). 0 was "every age" before 1.32.5
if (!(state.maxAge >= 3 && state.maxAge <= 10)) state.maxAge = 10;
// returning visitors who already picked a younger age in Settings don't need to be asked again
if (saved.ageAsked === undefined && saved.maxAge >= 3 && saved.maxAge < 10) state.ageAsked = true;
const subs = new Set();
const PERSIST = Object.keys(DEFAULTS);
let saveTimer;

function save() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(PERSIST.map((k) => [k, state[k]])))); } catch {}
}
// writes are batched; a change made just before the tab closes or reloads is still saved.
// Only a pending change: an idle tab must not overwrite what another tab saved meanwhile.
addEventListener('pagehide', () => saveTimer && save());

export function set(patch) {
  if (typeof patch === 'function') patch = patch(state);
  Object.assign(state, patch);
  subs.forEach((f) => f());
  if (!Object.keys(patch).some((k) => PERSIST.includes(k))) return; // ratings, player: nothing to save
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 300);
}
export const setPlayer = (patch) => set({ player: { ...state.player, ...patch } });

export function useStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    subs.add(f);
    return () => subs.delete(f);
  }, []);
  return state;
}

export function useT() {
  const s = useStore();
  return [DICT[s.lang] || DICT.ro, s.lang];
}

export const toggleIn = (key, id) =>
  set({ [key]: state[key].includes(id) ? state[key].filter((x) => x !== id) : [id, ...state[key]] });

export function addHistory(id) {
  set({ history: [{ id, at: Date.now() }, ...state.history.filter((h) => h.id !== id)].slice(0, 40) });
}

// --- router: plain history API, internal links are normal <a href="/...">
export function navigate(url, replace = false) {
  if (url === location.pathname + location.search) return;
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  window.dispatchEvent(new Event('popstate'));
  if (!replace) window.scrollTo(0, 0);
}
export function useRoute() {
  const [url, setUrl] = useState(location.pathname + location.search);
  useEffect(() => {
    const onPop = () => setUrl(location.pathname + location.search);
    const onClick = (e) => {
      const a = e.target.closest?.('a[href]');
      if (!a || a.target || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      const href = a.getAttribute('href');
      if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/api/')) return;
      e.preventDefault();
      navigate(href);
    };
    addEventListener('popstate', onPop);
    document.addEventListener('click', onClick);
    return () => { removeEventListener('popstate', onPop); document.removeEventListener('click', onClick); };
  }, []);
  return url;
}

// --- shared ratings (see api/ratings.js). The rest of the app works without them.
export async function loadRatings() {
  try {
    const r = await fetch('/api/ratings');
    if (!r.ok) throw 0;
    set({ ratings: await r.json(), ratingsOk: true });
  } catch { set({ ratingsOk: false }); }
}

const DAY = 864e5, GAP = 20 * 60e3;
export function voteBlock(id) {
  const mine = state.votes[id];
  if (mine && Date.now() - mine.at < DAY) return { reason: 'today' };
  const wait = state.lastVoteAt + GAP - Date.now();
  if (wait > 0) return { reason: 'wait', minutes: Math.ceil(wait / 60e3) };
  return null;
}
export async function vote(id, stars) {
  const r = await fetch('/api/ratings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, stars }) });
  const body = await r.json().catch(() => ({}));
  if (r.ok) {
    set({ ratings: { ...state.ratings, [id]: body.rating }, votes: { ...state.votes, [id]: { stars, at: Date.now() } }, lastVoteAt: Date.now() });
    return { ok: true };
  }
  if (body.error === 'wait') set({ lastVoteAt: Date.now() - GAP + (body.retryAfter || 60) * 1e3 });
  return { ok: false, error: body.error || 'off', minutes: Math.ceil((body.retryAfter || 60) / 60) };
}
