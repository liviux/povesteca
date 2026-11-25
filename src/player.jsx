import { useEffect, useRef, useState } from 'preact/hooks';
import { versionById, storyById, sourceById, cover, audioUrl, linkUrl, linkLabel, versions, shuffle } from './data.js';
import { fmtTime } from './i18n.js';
import { state, set, setPlayer, useStore, useT, addHistory, navigate } from './store.js';
import { Icon, Cover, Pick } from './ui.jsx';

/*
 * Two engines, one set of controls:
 *  - archive / audio: plain <audio> on a direct file, or hls.js (native on Safari) for .m3u8 streams.
 *    Everything works: seek, saved position, lock screen, timer.
 *  - youtube: official IFrame API. Play/pause/seek/position/timer work; the video must stay visible,
 *    and phones stop it when the screen locks. We say so instead of pretending.
 * A recording with several links falls back to the next one if a link fails.
 */
let audio, hls, yt, ytHost, ytApi, poll, sleepTimer, lastSave = 0;
let audioActive = false, pendingSeek = null, loadSeq = 0;

// time changes every second; keep it out of the main store so pages don't re-render
const clock = { time: 0, duration: 0 };
const clockSubs = new Set();
const spanOf = (v, i = state.player.link) => {
  const l = v?.links?.[i];
  return { start: l?.start ?? v?.start ?? 0, end: l?.end ?? v?.end ?? 0 };
};
const spanEnd = (v, i = state.player.link, dur = clock.duration) => {
  const { start, end } = spanOf(v, i);
  return end || (dur > start ? dur : start + (v?.duration || 0));
};
export function savedOffset(v, raw = state.pos[v?.id]) {
  if (!v || !raw) return 0;
  return Math.max(0, raw - spanOf(v, 0).start);
}
function saveTime(v, linkIdx, time) {
  const { start } = spanOf(v, linkIdx);
  const rel = Math.max(0, time - start);
  if (rel <= 5) return;
  const canonical = spanOf(v, 0).start + Math.floor(rel);
  set({ pos: { ...state.pos, [v.id]: canonical } });
}
function tick(time, duration) {
  clock.time = time;
  if (duration > 0 && Number.isFinite(duration)) clock.duration = duration;
  clockSubs.forEach((f) => f());
  const p = state.player, v = versionById.get(p.id), { start, end } = spanOf(v, p.link);
  if (end && time >= end) return finish();
  if (v && Date.now() - lastSave > 15000 && time > start + 5) { lastSave = Date.now(); saveTime(v, p.link, time); }
  if (p.sleepAt && audio && isAudio(engineType())) audio.volume = Math.max(0, Math.min(1, (p.sleepAt - Date.now()) / 10000));
}
export function useClock() {
  const [, f] = useState(0);
  useEffect(() => { const g = () => f((n) => n + 1); clockSubs.add(g); return () => clockSubs.delete(g); }, []);
  return clock;
}

const isAudio = (t) => t === 'archive' || t === 'audio';
const isHls = (url) => /\.m3u8(\?|$)/i.test(url || '');
const engineType = () => versionById.get(state.player.id)?.links[state.player.link]?.type;

export function play(id, from, linkIdx = 0) {
  const v = versionById.get(id);
  if (!v) return;
  const idx = Math.max(0, Math.min(linkIdx, (v.links?.length || 1) - 1));
  const link = v.links[idx];
  if (link?.type === 'link') {
    closePlayer();
    window.open(linkUrl(link), '_blank', 'noopener');
    return;
  }
  stopEngines();
  const { start: s0, end: e0 } = spanOf(v, idx);
  const savedRel = savedOffset(v, state.pos[id]);
  const lim = e0 || (s0 + v.duration);
  const start = from === 'start' ? s0 : typeof from === 'number' ? from
    : savedRel > 10 && savedRel < v.duration - 20 ? s0 + savedRel : s0;
  setPlayer({ id, status: 'loading', link: idx, error: false });
  clock.duration = lim;
  tick(start, lim);
  addHistory(id);
  startLink(v, idx, start);
}
// Every story has the same chance, however many recordings it has. No story comes back until all the
// others in the list have had their turn, and stories in the history come last.
const surprised = new Set();
export function surprise(list = versions) {
  const pool = list.length ? list : versions;
  const ids = [...new Set(pool.map((v) => v.storyId))];
  const heard = new Set(state.history.map((h) => versionById.get(h.id)?.storyId));
  const now = versionById.get(state.player.id)?.storyId;
  let fresh = ids.filter((id) => !surprised.has(id) && !heard.has(id));
  if (!fresh.length) fresh = ids.filter((id) => !surprised.has(id));
  if (!fresh.length) { ids.forEach((id) => surprised.delete(id)); fresh = ids.filter((id) => id !== now); }
  const sid = shuffle(fresh.length ? fresh : ids)[0];
  if (!sid) return;
  surprised.add(sid);
  const v = shuffle(pool.filter((x) => x.storyId === sid))[0];
  play(v.id);
  navigate(`/inregistrare/${v.id}`);
}
export function switchLink(idx) {
  const v = versionById.get(state.player.id);
  if (!v || v.links.length < 2) return;
  const next = typeof idx === 'number' ? idx : (state.player.link + 1) % v.links.length;
  const { start: sNext, end: eNext } = spanOf(v, next);
  const at = sNext + Math.max(0, clock.time - spanOf(v, state.player.link).start);
  stopEngines();
  setPlayer({ status: 'loading', link: next, error: false });
  const lim = eNext || (sNext + v.duration);
  clock.duration = lim;
  tick(at, lim);
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
  if (v) {
    const next = state.player.link + 1;
    const { start: sNext, end: eNext } = spanOf(v, next);
    const at = sNext + Math.max(0, clock.time - spanOf(v, state.player.link).start);
    clock.duration = eNext || (sNext + v.duration);
    startLink(v, next, at);
  }
}

function applyPendingSeek() {
  if (!audioActive || pendingSeek == null) return;
  const target = pendingSeek;
  pendingSeek = null;
  if (target > 0 && Math.abs(audio.currentTime - target) > 1) {
    try { audio.currentTime = target; } catch {}
  }
}
function ensureAudio() {
  if (audio) return;
  audio = new Audio();
  audio.preload = 'auto';
  audio.addEventListener('loadedmetadata', () => {
    if (!audioActive) return;
    applyPendingSeek();
    audio.defaultPlaybackRate = audio.playbackRate = state.rate;
    const v = versionById.get(state.player.id), { start } = spanOf(v);
    tick(Math.max(audio.currentTime, start), audio.duration);
  });
  audio.addEventListener('timeupdate', () => {
    if (!audioActive || pendingSeek != null) return;
    tick(audio.currentTime, audio.duration);
  });
  audio.addEventListener('playing', () => {
    if (!audioActive) return;
    applyPendingSeek();
    setPlayer({ status: 'playing' });
  });
  audio.addEventListener('waiting', () => audioActive && setPlayer({ status: 'loading' }));
  audio.addEventListener('pause', () => {
    if (audioActive && !audio.ended && state.player.status !== 'ended') { setPlayer({ status: 'paused' }); savePos(); }
  });
  audio.addEventListener('ended', () => audioActive && finish());
  audio.addEventListener('error', () => { if (audioActive && !hls) nextLink(); });
}

async function startAudio(v, l, at) {
  const seq = ++loadSeq;
  ensureAudio();
  audioActive = true;
  audio.volume = 1;
  const url = audioUrl(l);
  if (isHls(url)) {
    let Hls;
    try {
      ({ default: Hls } = await import('hls.js/light'));
    } catch {
      return nextLink();
    }
    if (seq !== loadSeq || !audioActive) return;
    if (Hls.isSupported()) {
      pendingSeek = null;
      let recovered = false;
      const h = new Hls({ startPosition: at > 0 ? at : -1 });
      hls = h;
      h.on(Hls.Events.MEDIA_ATTACHED, () => seq === loadSeq && h.loadSource(url));
      h.on(Hls.Events.MANIFEST_PARSED, () => {
        if (seq !== loadSeq) return;
        audio.defaultPlaybackRate = audio.playbackRate = state.rate;
        audio.play().catch(() => setPlayer({ status: 'paused' }));
      });
      h.on(Hls.Events.ERROR, (_, data) => {
        if (seq !== loadSeq || !data?.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recovered) {
          recovered = true;
          h.recoverMediaError();
          return;
        }
        nextLink();
      });
      h.attachMedia(audio);
      return;
    }
    if (!audio.canPlayType('application/vnd.apple.mpegurl')) return nextLink();
    pendingSeek = at > 0 ? at : null;
    audio.src = url;
    audio.defaultPlaybackRate = audio.playbackRate = state.rate;
    audio.play().catch(() => setPlayer({ status: 'paused' }));
    return;
  }
  pendingSeek = at > 0 ? at : null;
  audio.src = url + (at > 0 ? `#t=${Math.floor(at)}` : '');
  audio.defaultPlaybackRate = audio.playbackRate = state.rate; // a new src resets playbackRate to the default
  audio.play().catch(() => setPlayer({ status: 'paused' }));
}

function loadYT() {
  return (ytApi ||= new Promise((res) => {
    let done = false;
    const finish = () => { if (!done) { done = true; res(); } };
    window.onYouTubeIframeAPIReady = finish;
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = finish;
    document.head.append(s);
    // a blocked script must not leave the player on "loading" forever
    setTimeout(finish, 8000);
  }));
}
async function startYouTube(v, l, at) {
  const seq = ++loadSeq;
  await loadYT();
  if (seq !== loadSeq || state.player.id !== v.id || !ytHost) return;
  if (!window.YT?.Player) return setPlayer({ status: 'error' });
  const el = document.createElement('div');
  ytHost.replaceChildren(el);
  const { end } = spanOf(v, state.player.link);
  let checkedStart = !(at > 0);
  try {
    yt = new window.YT.Player(el, {
      host: 'https://www.youtube-nocookie.com', videoId: l.id, width: '100%', height: '100%',
      playerVars: { start: Math.floor(at), ...(end ? { end } : {}), autoplay: 1, playsinline: 1, rel: 0 },
      events: {
        onReady: (e) => { if (seq !== loadSeq) return; e.target.setPlaybackRate(state.rate); e.target.playVideo(); },
        onPlaybackRateChange: (e) => set({ rate: e.data }), // changed from YouTube's own settings menu
        onStateChange: (e) => {
          if (seq !== loadSeq) return;
          const S = window.YT.PlayerState;
          if (e.data === S.PLAYING) {
            if (!checkedStart) {
              checkedStart = true;
              if ((e.target.getCurrentTime?.() || 0) < at - 5) e.target.seekTo(at, true);
            }
            setPlayer({ status: 'playing' });
          }
          if (e.data === S.PAUSED) { setPlayer({ status: 'paused' }); savePos(); }
          if (e.data === S.BUFFERING) setPlayer({ status: 'loading' });
          if (e.data === S.ENDED) finish();
        },
        onError: () => seq === loadSeq && nextLink(),
      },
    });
  } catch {
    return setPlayer({ status: 'error' });
  }
  clearInterval(poll);
  poll = setInterval(() => {
    if (!yt?.getCurrentTime) return;
    const t = yt.getCurrentTime();
    if (at > 0 && t < 1 && yt.getPlayerState?.() !== window.YT.PlayerState.PLAYING) return;
    tick(t, yt.getDuration());
  }, 1000);
}

function savePos() {
  const { id, link } = state.player;
  const v = versionById.get(id);
  if (v) saveTime(v, link, clock.time);
}
function finish() {
  const { id } = state.player;
  pauseEngines();
  const pos = { ...state.pos }; delete pos[id];
  set({ pos, player: { ...state.player, status: 'ended', sleepAt: 0, sleepEnd: false } });
}
function stopEngines() {
  loadSeq++;
  audioActive = false;
  pendingSeek = null;
  clearInterval(poll);
  if (hls) { try { hls.destroy(); } catch {} hls = null; }
  if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  if (yt) { try { yt.destroy(); } catch {} yt = null; }
  ytHost?.replaceChildren();
}
function pauseEngines() {
  if (audioActive && audio) audio.pause();
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
  pendingSeek = null;
  if (isAudio(engineType()) && audio) audio.currentTime = t; else yt?.seekTo?.(t, true);
  tick(t);
}
export const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
export function setRate(r) {
  set({ rate: r });
  if (audio) audio.defaultPlaybackRate = audio.playbackRate = r;
  yt?.setPlaybackRate?.(r);
}
export const seekBy = (d) => {
  const v = versionById.get(state.player.id), { start } = spanOf(v);
  seekTo(Math.max(start, Math.min(spanEnd(v) || 1e9, clock.time + d)));
};
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
  const pic = cover(v, 180, 'jpg');
  navigator.mediaSession.metadata = new MediaMetadata({ title: s.title, artist: v.title, album: 'Povesteca', artwork: pic ? [{ src: pic, sizes: '360x360', type: 'image/jpeg' }] : [] });
  const h = { play: toggle, pause: toggle, seekbackward: () => seekBy(-15), seekforward: () => seekBy(30), stop: closePlayer };
  for (const k in h) try { navigator.mediaSession.setActionHandler(k, h[k]); } catch {}
}

// "Desktop site" on a phone, or a page zoomed in with two fingers: the browser keeps fixed bars at the bottom of
// the zoomed-out page, often off screen. Then the player goes to the bottom of what is on screen, at its phone size.
const vv = window.visualViewport;
function pinDock() {
  const el = document.querySelector('.dock');
  if (!el || !vv) return;
  const z = Math.abs(vv.scale - 1) > 0.01 || Math.abs(vv.width - document.documentElement.clientWidth) > 1;
  Object.assign(el.style, z
    ? { top: `${vv.offsetTop + vv.height}px`, bottom: 'auto', left: `${vv.offsetLeft}px`, width: `${vv.width * vv.scale}px`, transform: `scale(${1 / vv.scale}) translateY(-100%)` }
    : { top: '', bottom: '', left: '', width: '', transform: '' });
  // room at the end of the page, so the player doesn't cover it: its real height, which changes with the
  // theme and the width (one row or two); the CSS values only count until the player has been measured
  document.body.style.setProperty('--dock-h', el.offsetHeight ? `${el.offsetHeight / (z ? vv.scale : 1)}px` : '');
}
vv?.addEventListener('resize', pinDock);
addEventListener('resize', pinDock);
vv?.addEventListener('scroll', pinDock);

// ---------- UI ----------
function Progress({ big }) {
  const c = useClock();
  const [t] = useT();
  // seconds under the finger or mouse while the bar is held: the whole bar responds, not only the handle
  // (iOS Safari ignores taps on the track), and the seek happens on release so playback doesn't pull the handle back
  const [drag, setDrag] = useState(null);
  const v = versionById.get(state.player.id), { start } = spanOf(v);
  const max = Math.max(1, Math.floor(spanEnd(v, state.player.link, c.duration) - start));
  const at = (e) => { const r = e.currentTarget.getBoundingClientRect(); return Math.round(max * Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))); };
  const shown = drag ?? Math.max(0, Math.min(max, c.time - start));
  return (
    <div class={'progress-row' + (big ? ' big' : '')}>
      <span class="time">{fmtTime(shown)}</span>
      <input type="range" min="0" max={max} step="1" value={Math.floor(shown)} aria-label={t.seek}
        style={{ '--p': `${(100 * shown) / max}%` }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(at(e)); }}
        onPointerMove={(e) => drag != null && setDrag(at(e))}
        onPointerUp={(e) => { if (drag != null) seekTo(start + at(e)); setDrag(null); }}
        onPointerCancel={() => setDrag(null)}
        onInput={(e) => drag == null && seekTo(start + +e.currentTarget.value)} />
      <span class="time">{fmtTime(max)}</span>
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
      {!big && <button type="button" class="icon-btn nav-surprise" aria-label={t.surprise} title={t.surprise} onClick={() => surprise()}><Icon n="shuffle" /></button>}
    </div>
  );
}

// looks like a pill, opens the list of the recording's links, so any one can be picked
function SourcePick({ v, p, cls, children }) {
  const [t] = useT();
  const src = sourceById.get(v.sourceId);
  return (
    <Pick label={t.switchSource} cls={cls} value={p.link} items={v.links.map((l, i) => [i, linkLabel(l, src, v.links)])} onPick={switchLink}>
      {children}<Icon n="right" size={14} style={{ transform: 'rotate(90deg)' }} />
    </Pick>
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
  useEffect(pinDock); // its height changes when it opens, closes or shows a video
  return (
    <div class={'dock' + (v ? ' open' : '') + (link?.type === 'youtube' ? ' has-video' : '') + (p.status === 'playing' ? ' playing' : '')} aria-hidden={!v}>
      <div class="yt-frame" ref={(el) => { ytHost = el; }} />
      {link?.type === 'youtube' && <p class="yt-note">{t.ytNote}</p>}
      {v && (
        <div class="dock-bar" role="region" aria-label={t.nowPlaying}>
          <a class="dock-info" href={`/inregistrare/${v.id}`}>
            <Cover src={cover(v, 56)} title={storyById.get(v.storyId).title} seed={v.id} size={56} />
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
              <SourcePick v={v} p={p} cls="dock-switch">{`${p.link + 1}/${v.links.length}`}<span class="sw-txt">{` · ${t.switchShort}`}</span></SourcePick>
            )}
            <SleepChip />
            <Pick label={t.speed} cls={'dock-rate' + (s.rate !== 1 ? ' on' : '')} value={s.rate} items={RATES.map((r) => [r, r.toLocaleString(s.lang) + '×'])} onPick={setRate}>
              {s.rate.toLocaleString(s.lang) + '×'}
            </Pick>
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
            <Cover src={cover(v, 180)} title={storyById.get(v.storyId).title} seed={v.id} />
            <h3>{storyById.get(v.storyId).title}</h3>
            <p class="muted">{v.title}</p>
            {v.links.length > 1 && (
              <p class="night-source">
                <span>{linkLabel(v.links[p.link], sourceById.get(v.sourceId), v.links)}</span>
                <SourcePick v={v} p={p} cls="chip">{`${t.switchShort} (${p.link + 1}/${v.links.length})`}</SourcePick>
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
                  <Cover src={cover(x, 56)} title={storyById.get(x.storyId).title} seed={x.id} size={56} />
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
