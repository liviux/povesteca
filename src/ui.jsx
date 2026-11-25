import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { storyById, authorsOf, cover, storyCover, bestVersion, versionsByStory, linkUrl } from './data.js';
import { label, fmtDur } from './i18n.js';
import { useStore, useT, toggleIn } from './store.js';
import { play, toggle, closePlayer } from './player.jsx';

const P = {
  play: <path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z" fill="currentColor" stroke="none" />,
  pause: <g fill="currentColor" stroke="none"><rect x="6" y="4.5" width="4.2" height="15" rx="1.2" /><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.2" /></g>,
  heart: <path d="M12 20.3s-7.6-4.5-7.6-10.3A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.6 10c0 5.8-7.6 10.3-7.6 10.3z" />,
  moon: <path d="M20 14.6A8.2 8.2 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z" />,
  search: <g><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></g>,
  clock: <g><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></g>,
  music: <g><path d="M9 17.5V5.5l10-2v12" /><circle cx="6.5" cy="17.5" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" /></g>,
  sfx: <g><path d="M11 4l1.7 4.3L17 10l-4.3 1.7L11 16l-1.7-4.3L5 10l4.3-1.7z" /><path d="M18 15l.8 1.7 1.7.8-1.7.8L18 20l-.8-1.7-1.7-.8 1.7-.8z" /></g>,
  cast: <g><circle cx="9" cy="8" r="3.3" /><path d="M3 19.5a6 6 0 0 1 12 0" /><path d="M15.5 4.8a3.3 3.3 0 0 1 0 6.4M17.5 13.8a6 6 0 0 1 3.5 5.7" /></g>,
  mic: <g><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></g>,
  star: <path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />,
  back: <g><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /></g>,
  fwd: <g><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 4v4.5h-4.5" /></g>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  refresh: <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" />,
  shuffle: <g><path d="M16 4h4v4M4 19L20 4M20 16v4h-4M14.5 14.5L20 20M4 5l5 5" /></g>,
  ext: <g><path d="M14 4h6v6M20 4l-8.5 8.5" /><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" /></g>,
  palette: <g><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1 0 1.6-.7 1.6-1.5 0-1.1-1-1.5-1-2.5 0-.9.7-1.5 1.6-1.5h2.3a4 4 0 0 0 4-4c0-4.2-3.8-7.5-8.5-7.5z" /><circle cx="7.8" cy="11" r="1" /><circle cx="10.5" cy="7.3" r="1" /><circle cx="15" cy="7.8" r="1" /></g>,
  left: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  right: <path d="M9.5 5.5L16 12l-6.5 6.5" />,
  disc: <g><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.3" /></g>,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  library: <g><path d="M5 4.5v15M9.5 4.5v15M14 5.5l4.3 14" /><path d="M3 19.5h18" /></g>,
};
export const Icon = ({ n, size = 22, ...p }) => (
  <svg class="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...p}>{P[n]}</svg>
);

// the themed list of the filters, for a few fixed choices (order, speed, source) instead of the device's own list.
// items: [[value, text]]; children replace the button's content (otherwise the chosen text and an arrow)
export function Pick({ label, value, items, onPick, cls = 'pick-btn', children }) {
  const [act, setAct] = useState(-1); // -1: closed
  const box = useRef();
  const id = useId();
  const open = act >= 0;
  const cur = Math.max(0, items.findIndex(([v]) => v === value));
  useEffect(() => {
    if (!open) return;
    const out = (e) => !box.current?.contains(e.target) && setAct(-1);
    document.addEventListener('pointerdown', out);
    return () => document.removeEventListener('pointerdown', out);
  }, [open]);
  // the whole list on screen (it can open below the fold), then the highlighted line inside it
  useEffect(() => { for (const el of box.current.querySelectorAll('ul, .act')) el.scrollIntoView({ block: 'nearest' }); }, [act]);
  const pick = (v) => { setAct(-1); if (v !== value) onPick(v); };
  // Enter and Space click the button: it opens the list, or picks the highlighted line
  const onKey = (e) => {
    const k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); setAct(open ? Math.max(0, Math.min(items.length - 1, act + (k === 'ArrowDown' ? 1 : -1))) : cur); }
    else if (open && (k === 'Home' || k === 'End')) { e.preventDefault(); setAct(k === 'Home' ? 0 : items.length - 1); }
    else if (open && k === 'Escape') { e.stopPropagation(); setAct(-1); }
    else if (k === 'Tab') setAct(-1);
  };
  return (
    <span class="pick" ref={box}>
      <button type="button" class={cls} role="combobox" aria-label={label} title={label} aria-haspopup="listbox" aria-expanded={open}
        aria-controls={id} aria-activedescendant={open ? `${id}-${act}` : undefined}
        onClick={() => (open ? pick(items[act][0]) : setAct(cur))} onKeyDown={onKey}>
        {/* every choice stacked, only the picked one visible: the button is as wide as the longest, like a native list */}
        {children || <><span class="pick-txt">{items.map(([, txt], i) => <span class={i === cur ? 'on' : null}>{txt}</span>)}</span>
          <Icon n="right" size={16} style={{ transform: 'rotate(90deg)' }} /></>}
      </button>
      {open && (
        <ul id={id} role="listbox" class="combo-list pick-list" aria-label={label} onMouseDown={(e) => e.preventDefault()}>
          {items.map(([v, txt], i) => (
            <li id={`${id}-${i}`} role="option" aria-selected={v === value} class={i === act ? 'act' : null} onClick={() => pick(v)}>{txt}</li>
          ))}
        </ul>
      )}
    </span>
  );
}

export function Cover({ src, title, size = 180 }) {
  // remember which src failed, so the same Cover showing a new picture tries again
  const [failed, setFailed] = useState(null);
  return (
    <div class="cover" data-initial={title?.[0]}>
      {src && failed !== src && <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setFailed(src)} />}
    </div>
  );
}

export function PlayButton({ v, cls = 'play-btn', label: text, from }) {
  const s = useStore();
  const [t] = useT();
  const story = storyById.get(v.storyId);
  const firstLink = v.links[0];
  if (firstLink.type === 'link') {
    return (
      <a class={cls} href={linkUrl(firstLink)} target="_blank" rel="noopener"
        aria-label={text ? null : `${t.openAt} · ${story.title}`} onClick={closePlayer}>
        <Icon n="ext" />
        {text && <span>{t.openAt}</span>}
      </a>
    );
  }
  // a "from the start" button always restarts; only the main button turns into Pause
  const active = from == null && s.player.id === v.id && ['playing', 'loading'].includes(s.player.status);
  const own = s.player.id === v.id && !['ended', 'error'].includes(s.player.status);
  return (
    // a button with visible text is named by that text; an icon-only one gets the story title
    <button type="button" class={cls} aria-label={text ? null : active ? t.pause : t.listen(story.title)}
      onClick={() => (own && from == null ? toggle() : play(v.id, from))}>
      <Icon n={active ? 'pause' : 'play'} />
      {text && <span>{active ? t.pause : text}</span>}
    </button>
  );
}

export function FavButton({ list, id, title, withText, onText }) {
  const s = useStore();
  const [t] = useT();
  const on = s[list].includes(id);
  return (
    <button type="button" class={'fav-btn' + (on ? ' on' : '')} aria-pressed={on} aria-label={withText ? null : t.saveA(title)} onClick={() => toggleIn(list, id)}>
      <Icon n="heart" />{withText && <span>{on ? onText || t.saved : t.save}</span>}
    </button>
  );
}

export function Rating({ id, compact }) {
  const s = useStore();
  const [t, lang] = useT();
  const r = s.ratings[id];
  if (!r?.[1]) return compact ? null : <span class="rating muted">{t.noVotes}</span>;
  const avg = (r[0] / r[1]).toLocaleString(lang, { maximumFractionDigits: 1 });
  return compact
    ? <span class="rating"><Icon n="star" size={15} />{avg}<span class="muted">({r[1]})</span></span>
    : <span class="rating"><Icon n="star" size={18} />{t.votes(avg, r[1])}</span>;
}

/** Small icons that describe the production, readable at a glance */
export function Traits({ v }) {
  const [t, lang] = useT();
  const items = [
    v.voices === 'distributie' ? ['cast', label('voices', v.voices, lang)] : ['mic', label('voices', v.voices, lang)],
    v.music === 'importanta' && ['music', label('music', v.music, lang)],
    v.sfx === 'bogate' && ['sfx', label('sfx', v.sfx, lang)],
  ].filter(Boolean);
  return (
    <ul class="traits">
      {items.map(([n, txt]) => <li title={txt}><Icon n={n} size={16} /><span class="sr-only">{txt}</span></li>)}
      <li class="age" title={t.ageFrom(v.age)}>{v.age}+</li>
    </ul>
  );
}

export function VersionCard({ v, progress, badge }) {
  const [t, lang] = useT();
  const s = storyById.get(v.storyId);
  return (
    <article class="card">
      <a class="card-link" href={`/inregistrare/${v.id}`}>
        <Cover src={cover(v)} title={s.title} />
        <div class="card-body">
          {badge && <span class="badge">{badge}</span>}
          <p class="card-kind">{label('kind', v.kind, lang)}</p>
          <h3 class="card-title">{s.title}</h3>
          <p class="card-sub">{authorsOf(s).join(', ')} · {fmtDur(v.duration)}{v.year ? ` · ${v.year}` : ''}</p>
          <div class="card-foot"><Traits v={v} /><Rating id={v.id} compact /></div>
          {progress != null && <div class="progress" role="presentation"><i style={{ width: `${Math.min(100, progress * 100)}%` }} /></div>}
        </div>
      </a>
      <PlayButton v={v} cls="card-play" />
    </article>
  );
}

export function StoryCard({ s: story }) {
  const [t, lang] = useT();
  const st = useStore();
  const best = bestVersion(story.id, st.ratings);
  const recs = versionsByStory.get(story.id)?.length || 0;
  return (
    <article class="card">
      <a class="card-link" href={`/poveste/${story.id}`}>
        <Cover src={storyCover(story)} title={story.title} />
        <div class="card-body">
          <p class="card-kind">{label('genre', story.genre, lang)}</p>
          <h3 class="card-title">{story.title}</h3>
          <p class="card-sub">{authorsOf(story).join(', ')}{story.year ? ` · ${story.year}` : ''}</p>
          {recs > 1 && <p class="card-sub card-count">{t.nRec(recs)}</p>}
        </div>
      </a>
      {best && <PlayButton v={best} cls="card-play" />}
    </article>
  );
}

