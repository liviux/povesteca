import { useEffect, useRef, useState } from 'preact/hooks';
import { versionById, storyById, sourceById, cover, audioUrl, linkUrl, linkLabel, versions, shuffle } from './data.js';
import { fmtTime } from './i18n.js';
import { state, set, setPlayer, useStore, useT, addHistory } from './store.js';
import { Icon, Cover } from './ui.jsx';

/*
 * Two engines, one set of controls:
 *  - archive: plain <audio> on a direct file. Everything works: seek, saved position, lock screen, timer.
 *  - youtube: official IFrame API. Play/pause/seek/position/timer work; the video must stay visible,
 *    and phones stop it when the screen locks. We say so instead of pretending.
 * A recording with several links falls back to the next one if a link fails.
 */
let audio, yt, ytHost, ytApi, poll, sleepTimer, lastSave = 0;

// time changes every second; keep it out of the main store so pages don't re-render
const clock = { time: 0, duration: 0 };
const clockSubs = new Set();
function tick(time, duration) {
  clock.time = time; clock.duration = duration || clock.duration;
  clockSubs.forEach((f) => f());
  const p = state.player, v = versionById.get(p.id);
  if (v?.end && time >= v.end) return finish();
  if (Date.now() - lastSave > 5000 && time > 5) { lastSave = Date.now(); set({ pos: { ...state.pos, [p.id]: Math.floor(time) } }); }
  if (p.sleepAt && audio && isAudio(engineType())) audio.volume = Math.max(0, Math.min(1, (p.sleepAt - Date.now()) / 10000));
}
export function useClock() {
  const [, f] = useState(0);
  useEffect(() => { const g = () => f((n) => n + 1); clockSubs.add(g); return () => clockSubs.delete(g); }, []);
  return clock;
}

const isAudio = (t) => t === 'archive' || t === 'audio';
const engineType = () => versionById.get(state.player.id)?.links[state.player.link]?.type;

export function play(id, from, linkIdx = 0) {
  const v = versionById.get(id);
  if (!v) return;
  stopEngines();
  const saved = state.pos[id] || 0;
  const start = from === 'start' ? v.start || 0 : typeof from === 'number' ? from
    : saved > 10 && saved < v.duration - 20 ? saved : v.start || 0;
  const idx = Math.max(0, Math.min(linkIdx, (v.links?.length || 1) - 1));
  setPlayer({ id, status: 'loading', link: idx, error: false });
  tick(start, v.duration);
  addHistory(id);
  startLink(v, idx, start);
}
export function switchLink(idx) {
  const v = versionById.get(state.player.id);
  if (!v || v.links.length < 2) return;
  const next = typeof idx === 'number' ? idx : (state.player.link + 1) % v.links.length;
  const at = clock.time;
  stopEngines();
  setPlayer({ status: 'loading', link: next, error: false });
  tick(at, v.duration);
  startLink(v, next, at);
}

function startLink(v, i, at) {
  const l = v.links[i];
  if (!l || !['archive', 'audio', 'youtube'].includes(l.type)) return setPlayer({ status: 'error' });
  setPlayer({ link: i, status: 'loading' });
  (isAudio(l.type) ? startAudio : startYouTube)(v, l, at);
  mediaSession(v);
}
function nextLink() {
  const v = versionById.get(state.player.id);
  stopEngines();
  if (v) startLink(v, state.player.link + 1, clock.time);
}

function startAudio(v, l, at) {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('timeupdate', () => tick(audio.currentTime, audio.duration));
    audio.addEventListener('playing', () => setPlayer({ status: 'playing' }));
    audio.addEventListener('waiting', () => setPlayer({ status: 'loading' }));
    audio.addEventListener('pause', () => { if (!audio.ended && state.player.status !== 'ended') { setPlayer({ status: 'paused' }); savePos(); } });
    audio.addEventListener('ended', finish);
    audio.addEventListener('error', () => audio.getAttribute('src') && nextLink());
  }
  audio.volume = 1;
  audio.src = audioUrl(l) + (at ? `#t=${Math.floor(at)}` : '');
  audio.defaultPlaybackRate = audio.playbackRate = state.rate; // a new src resets playbackRate to the default
  audio.play().catch(() => setPlayer({ status: 'paused' }));
}

function loadYT() {
  return (ytApi ||= new Promise((res) => {
    window.onYouTubeIframeAPIReady = res;
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.append(s);
  }));
}
async function startYouTube(v, l, at) {
  await loadYT();
  if (state.player.id !== v.id || !ytHost) return;
  const el = document.createElement('div');
  ytHost.replaceChildren(el);
  yt = new window.YT.Player(el, {
    host: 'https://www.youtube-nocookie.com', videoId: l.id, width: '100%', height: '100%',
    playerVars: { start: Math.floor(at), ...(v.end ? { end: v.end } : {}), autoplay: 1, playsinline: 1, rel: 0 },
    events: {
      onReady: (e) => { e.target.setPlaybackRate(state.rate); e.target.playVideo(); },
      onPlaybackRateChange: (e) => set({ rate: e.data }), // changed from YouTube's own settings menu
      onStateChange: (e) => {
        const S = window.YT.PlayerState;
        if (e.data === S.PLAYING) setPlayer({ status: 'playing' });
        if (e.data === S.PAUSED) { setPlayer({ status: 'paused' }); savePos(); }
        if (e.data === S.BUFFERING) setPlayer({ status: 'loading' });
        if (e.data === S.ENDED) finish();
      },
      onError: nextLink,
    },
  });
  clearInterval(poll);
  poll = setInterval(() => yt?.getCurrentTime && tick(yt.getCurrentTime(), yt.getDuration()), 1000);
}

function savePos() {
  const { id } = state.player;
  if (id && clock.time > 5) set({ pos: { ...state.pos, [id]: Math.floor(clock.time) } });
}
function finish() {
  const { id } = state.player;
  pauseEngines();
  const pos = { ...state.pos }; delete pos[id];
  set({ pos, player: { ...state.player, status: 'ended', sleepAt: 0, sleepEnd: false } });
}
function stopEngines() {
  clearInterval(poll);
  if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  if (yt) { try { yt.destroy(); } catch {} yt = null; }
  ytHost?.replaceChildren();
}
function pauseEngines() {
  audio?.getAttribute('src') && audio.pause();
  yt?.pauseVideo?.();
}

export function toggle() {
  const p = state.player;
  if (p.status === 'error') return;
  if (p.status === 'ended') return play(p.id, 'start');
  if (p.status === 'playing' || p.status === 'loading') return pauseEngines();
  if (isAudio(engineType())) { audio.volume = 1; audio.play().catch(() => {}); } else yt?.playVideo?.();
}
export function seekTo(t) {
  if (isAudio(engineType()) && audio) audio.currentTime = t; else yt?.seekTo?.(t, true);
  tick(t);
}
export const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
export function setRate(r) {
  set({ rate: r });
  if (audio) audio.defaultPlaybackRate = audio.playbackRate = r;
  yt?.setPlaybackRate?.(r);
}
export const seekBy = (d) => seekTo(Math.max(0, Math.min(clock.duration || 1e9, clock.time + d)));
export function closePlayer() {
  savePos(); stopEngines(); clearTimeout(sleepTimer);
  setPlayer({ id: null, status: 'idle', sleepAt: 0, sleepEnd: false, night: false });
}

export function setSleep(min) {
  clearTimeout(sleepTimer);
  if (audio) audio.volume = 1;
  if (min === 'end') return setPlayer({ sleepAt: 0, sleepMin: 0, sleepEnd: true });
  if (!min) return setPlayer({ sleepAt: 0, sleepMin: 0, sleepEnd: false });
  const at = Date.now() + min * 60e3;
  sleepTimer = setTimeout(() => { pauseEngines(); setPlayer({ sleepAt: 0 }); }, min * 60e3);
  setPlayer({ sleepAt: at, sleepMin: min, sleepEnd: false });
}

function mediaSession(v) {
  if (!('mediaSession' in navigator)) return;
  const s = storyById.get(v.storyId);
  const pic = cover(v);
  navigator.mediaSession.metadata = new MediaMetadata({ title: s.title, artist: v.title, album: 'Povesteca', artwork: pic ? [{ src: pic, sizes: '180x180', type: 'image/jpeg' }] : [] });
  const h = { play: toggle, pause: toggle, seekbackward: () => seekBy(-15), seekforward: () => seekBy(30), stop: closePlayer };
  for (const k in h) try { navigator.mediaSession.setActionHandler(k, h[k]); } catch {}
}

// ---------- UI ----------
function Progress({ big }) {
  const c = useClock();
  const [t] = useT();
  // seconds under the finger or mouse while the bar is held: the whole bar responds, not only the handle
  // (iOS Safari ignores taps on the track), and the seek happens on release so playback doesn't pull the handle back
  const [drag, setDrag] = useState(null);
  const max = Math.max(1, Math.floor(c.duration));
  const at = (e) => { const r = e.currentTarget.getBoundingClientRect(); return Math.round(max * Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))); };
  const shown = drag ?? Math.min(max, c.time);
  return (
    <div class={'progress-row' + (big ? ' big' : '')}>
      <span class="time">{fmtTime(shown)}</span>
      <input type="range" min="0" max={max} step="1" value={Math.floor(shown)} aria-label={t.seek}
        style={{ '--p': `${(100 * shown) / max}%` }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(at(e)); }}
        onPointerMove={(e) => drag != null && setDrag(at(e))}
        onPointerUp={(e) => { if (drag != null) seekTo(at(e)); setDrag(null); }}
        onPointerCancel={() => setDrag(null)}
        onInput={(e) => drag == null && seekTo(+e.currentTarget.value)} />
      <span class="time">{fmtTime(c.duration)}</span>
    </div>
  );
}

function Controls({ big }) {
  const s = useStore();
  const [t] = useT();
  const p = s.player;
  const busy = p.status === 'playing' || p.status === 'loading';
  return (
    <div class={'controls' + (big ? ' big' : '')}>
      <button type="button" class="icon-btn skip" aria-label={t.back15} onClick={() => seekBy(-15)}><Icon n="back" /><small>15</small></button>
      <button type="button" class={'main-play' + (p.status === 'loading' ? ' loading' : '')} aria-label={busy ? t.pause : t.play} onClick={toggle}>
        <Icon n={busy ? 'pause' : 'play'} size={big ? 34 : 26} />
      </button>
      <button type="button" class="icon-btn skip" aria-label={t.fwd30} onClick={() => seekBy(30)}><Icon n="fwd" /><small>30</small></button>
    </div>
  );
}

function SleepChip() {
  const s = useStore();
  useClock(); // re-render each second for the countdown
  const [t] = useT();
  if (!s.player.sleepAt && !s.player.sleepEnd) return null;
  return (
    <span class="sleep-chip"><Icon n="moon" size={14} />
      {s.player.sleepEnd ? t.atEnd : fmtTime((s.player.sleepAt - Date.now()) / 1000)}
    </span>
  );
}

export function Dock() {
  const s = useStore();
  const [t] = useT();
  const p = s.player;
  const v = versionById.get(p.id);
  const link = v?.links[p.link];
  const mirrorName = link && v.links.length > 1 ? linkLabel(link, sourceById.get(v.sourceId), v.links) : null;
  return (
    <div class={'dock' + (v ? ' open' : '') + (link?.type === 'youtube' ? ' has-video' : '')} aria-hidden={!v}>
      <div class="yt-frame" ref={(el) => { ytHost = el; }} />
      {v && (
        <div class="dock-bar" role="region" aria-label={t.nowPlaying}>
          <a class="dock-info" href={`/inregistrare/${v.id}`}>
            <Cover src={cover(v)} title={storyById.get(v.storyId).title} size={56} />
            <span class="dock-text">
              <strong>{storyById.get(v.storyId).title}</strong>
              <small>{p.status === 'loading' ? t.loading : p.status === 'error' ? t.playErr : mirrorName ? `${v.title} · ${mirrorName}` : v.title}</small>
            </span>
          </a>
          {p.status === 'error'
            ? (
              <div class="dock-err-actions">
                {v.links.length > 1 && <button type="button" class="btn primary small" onClick={() => switchLink()}>{`${t.switchSource} (${((p.link + 1) % v.links.length) + 1}/${v.links.length})`}</button>}
                <a class="btn ghost small" href={linkUrl(link || v.links[0])} target="_blank" rel="noopener">{t.openAt}<Icon n="ext" size={16} /></a>
              </div>
            )
            : <div class="dock-main"><Controls /><Progress /></div>}
          <div class="dock-side">
            {v.links.length > 1 && (
              <button type="button" class="dock-switch" title={`${t.switchSource} (${mirrorName})`} aria-label={`${t.switchSource} (${p.link + 1}/${v.links.length})`} onClick={() => switchLink()}>
                {`${p.link + 1}/${v.links.length} · ${t.switchShort}`}
              </button>
            )}
            <SleepChip />
            <select class={'dock-rate' + (s.rate !== 1 ? ' on' : '')} aria-label={t.speed} title={t.speed} value={s.rate} onChange={(e) => setRate(+e.currentTarget.value)}>
              {RATES.map((r) => <option value={r}>{r.toLocaleString(s.lang) + '×'}</option>)}
            </select>
            <button type="button" class="icon-btn" aria-label={t.night} onClick={() => setPlayer({ night: true })}><Icon n="moon" /></button>
            <button type="button" class="icon-btn" aria-label={t.closePlayer} onClick={closePlayer}><Icon n="close" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Night() {
  const s = useStore();
  const [t] = useT();
  const p = s.player;
  const v = versionById.get(p.id);
  const ref = useRef();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setPlayer({ night: false });
    addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    // modal: the page behind can't be tabbed into; the dock stays live because a YouTube video
    // has to remain visible (it shows above this screen, see .night in the CSS)
    const behind = [...ref.current.parentNode.children].filter((el) => !el.matches('.night, .dock'));
    behind.forEach((el) => { el.inert = true; });
    const back = document.activeElement;
    ref.current.querySelector('button')?.focus();
    return () => {
      removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll');
      behind.forEach((el) => { el.inert = false; });
      back?.focus?.();
    };
  }, []);
  const last = s.history.find((h) => versionById.has(h.id) && h.id !== p.id);
  const sleepy = [
    ...s.favVersions.map((id) => versionById.get(id)).filter((x) => x && (x.moods.includes('somn') || x.moods.includes('linistitoare'))),
    ...versions.filter((x) => x.moods.includes('somn')),
  ].filter((x, i, a) => x.id !== p.id && a.indexOf(x) === i);
  const [picks] = useState(() => shuffle(sleepy).slice(0, 4));
  const controllable = v && ['archive', 'audio', 'youtube'].includes(v.links[p.link]?.type) && p.status !== 'error';
  const timers = [10, 20, 30];
  return (
    <div class="night" ref={ref} role="dialog" aria-modal="true" aria-label={t.nightH}>
      <div class="night-inner">
        <header class="night-head">
          <h2><Icon n="moon" /> {t.nightH}</h2>
          <button type="button" class="icon-btn" aria-label={t.close} onClick={() => setPlayer({ night: false })}><Icon n="close" /></button>
        </header>
        {v ? (
          <section class="night-now">
            <Cover src={cover(v)} title={storyById.get(v.storyId).title} />
            <h3>{storyById.get(v.storyId).title}</h3>
            <p class="muted">{v.title}</p>
            {v.links.length > 1 && (
              <p class="night-source">
                <span>{linkLabel(v.links[p.link], sourceById.get(v.sourceId), v.links)}</span>
                <button type="button" class="chip" onClick={() => switchLink()}>{`${t.switchShort} (${p.link + 1}/${v.links.length})`}</button>
              </p>
            )}
            {p.status !== 'error' && <><Controls big /><Progress big /></>}
            <div class="night-timer">
              <p class="label">{t.stopAfter}</p>
              {controllable ? (
                <div class="chips" role="group" aria-label={t.stopAfter}>
                  {timers.map((m) => <button type="button" class="chip" aria-pressed={!!p.sleepAt && p.sleepMin === m} onClick={() => setSleep(m)}>{m} min</button>)}
                  <button type="button" class="chip" aria-pressed={p.sleepEnd} onClick={() => setSleep('end')}>{t.atEnd}</button>
                  <button type="button" class="chip" aria-pressed={!p.sleepAt && !p.sleepEnd} onClick={() => setSleep(0)}>{t.noTimer}</button>
                </div>
              ) : <p class="muted">{t.noControl}</p>}
              <p class="muted small" aria-live="polite">{p.sleepEnd ? t.stopsAtEnd : p.sleepAt ? <SleepLine /> : ''}</p>
            </div>
          </section>
        ) : (
          <section class="night-now">
            <p class="muted">{t.nothingPlaying}</p>
            {last && <button type="button" class="btn primary" onClick={() => play(last.id)}><Icon n="play" />{t.resumeLast}: {storyById.get(versionById.get(last.id).storyId).title}</button>}
          </section>
        )}
        {picks.length > 0 && (
          <section class="night-picks">
            <h3>{v ? t.forSleep : t.pickCalm}</h3>
            <ul>
              {picks.map((x) => (
                <li><button type="button" onClick={() => play(x.id)}>
                  <Cover src={cover(x)} title={storyById.get(x.storyId).title} size={56} />
                  <span>{storyById.get(x.storyId).title}<small>{Math.round(x.duration / 60)} min</small></span>
                </button></li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
function SleepLine() {
  const s = useStore(); useClock();
  const [t] = useT();
  return t.stopsIn(fmtTime((s.player.sleepAt - Date.now()) / 1000));
}
