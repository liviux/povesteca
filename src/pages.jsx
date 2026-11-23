import { useMemo, useState, useEffect, useRef } from 'preact/hooks';
import {
  stories, versions, sources, collections, storyById, versionById, sourceById, collectionById, versionsByStory, versionsBySource,
  storiesByAuthor, collectionOf, people, norm, cover, storyCover, linkUrl, linkLabel, duplicateMap, search, applyFilters, sortVersions, shuffle, bestVersion, FILTER_KEYS, DURATIONS, splitNames, REPO, personInfo, storyLinks, personUrl, rolesIn,
} from './data.js';
import { label, ENUMS, fmtDur, fmtTime } from './i18n.js';
import { useStore, useT, set, state, navigate, toggleIn, voteBlock, vote } from './store.js';
import { play, toggle, savedOffset, surprise } from './player.jsx';
import { Icon, Cover, PlayButton, FavButton, Rating, Traits, VersionCard, StoryCard, Pick } from './ui.jsx';

const title = (txt) => { document.title = txt ? `${txt} · Povesteca` : 'Povesteca · povești audio pentru copii'; };

function Shelf({ id, heading, more, children, action }) {
  const [t] = useT();
  return (
    <section class="shelf-section" aria-labelledby={id}>
      <div class="shelf-head">
        <h2 id={id}>{heading}</h2>
        {action}
        {more && <a class="more" href={more}>{t.seeAll}<Icon n="right" size={16} /></a>}
      </div>
      <div class="shelf">{children}</div>
    </section>
  );
}

// a new random pick on every visit, kept while browsing so Back shows the same cards
const pick = (f) => shuffle(versions.filter(f)).slice(0, 12);
const picks = {
  tonight: pick((v) => v.moods.includes('linistitoare')),
  radio: pick((v) => v.kind === 'teatru-radiofonic'),
  cast: pick((v) => (v.credits?.cast?.length || 0) >= 8),
  short: pick((v) => v.duration < 900),
};

export function Home() {
  const s = useStore();
  const [t] = useT();
  const [seed, setSeed] = useState(0);
  const discover = useMemo(() => shuffle(stories).slice(0, 8), [seed]);
  useEffect(() => title(''), []);
  if (!versions.length) return <main id="main" tabindex="-1" class="wrap page"><p class="empty">{t.empty}</p></main>;

  const cont = s.history.map((h) => versionById.get(h.id)).filter((v) => v && savedOffset(v, s.pos[v.id]) > 10).slice(0, 10);
  const R = s.ratings;
  const rows = [
    ['continue', cont, null],
    ['tonight', picks.tonight, '/explorare?mood=linistitoare&sort=scurte'],
    ['radio', picks.radio, '/explorare?kind=teatru-radiofonic'],
    ['cast', picks.cast, '/explorare?voices=distributie'],
    ['short', picks.short, '/explorare?sort=scurte'],
    ['top', sortVersions(versions.filter((v) => R[v.id]?.[1]), 'rating', R).slice(0, 12), '/explorare?sort=rating'],
  ];
  return (
    <main id="main" tabindex="-1">
      <section class="hero">
        <div class="wrap hero-inner">
          <div class="hero-text">
            <img class="hero-mark" src="/mark.webp" alt="" width="112" height="95" />
            <h1>{t.heroTitle}</h1>
            <p class="lead">{t.heroSub}</p>
          </div>
          <div class="hero-box">
            <SearchForm />
            <div class="hero-actions">
              <button type="button" class="btn accent" onClick={() => surprise(versions)}><Icon n="shuffle" />{t.surprise}</button>
              <a class="btn ghost" href="/explorare"><Icon n="filter" />{t.explore}</a>
              <button type="button" class="btn ghost" onClick={() => set({ player: { ...state.player, night: true } })}><Icon n="moon" />{t.night}</button>
            </div>
          </div>
        </div>
      </section>
      <div class="wrap shelves">
        {rows.filter(([, list]) => list.length).map(([k, list, more]) => (
          <Shelf id={'sec-' + k} heading={t.sec[k]} more={more}>
            {list.map((v) => <VersionCard v={v} progress={k === 'continue' ? Math.min(1, savedOffset(v, s.pos[v.id]) / v.duration) : null} />)}
          </Shelf>
        ))}
        <Shelf id="sec-discover" heading={t.sec.discover}
          action={<button type="button" class="btn small ghost" onClick={() => setSeed(seed + 1)}><Icon n="shuffle" size={16} />{t.others}</button>}>
          {discover.map((x) => <StoryCard s={x} />)}
        </Shelf>
      </div>
    </main>
  );
}

function SearchForm({ value = '', onInput }) {
  const [t] = useT();
  return (
    <form class="search" role="search" onSubmit={(e) => {
      e.preventDefault();
      // on Explore the results already follow the typing; Enter only closes the phone keyboard
      if (onInput) return e.currentTarget.q.blur();
      const q = new FormData(e.currentTarget).get('q').trim();
      navigate('/explorare' + (q ? '?q=' + encodeURIComponent(q) : ''));
    }}>
      <Icon n="search" />
      <input name="q" type="search" value={value} onInput={onInput} placeholder={t.searchPh} aria-label={t.searchPh} autocomplete="off" enterkeyhint="search" />
      {!onInput && <button type="submit" class="btn primary">{t.search}</button>}
    </form>
  );
}

const PAGE_SIZE = 48;
// "(12)" after a heading, like "Înregistrări (6)" on a story page
const cnt = (n) => <span class="muted">({n})</span>;
// a value on a story or recording page that opens Browse filtered by it
const find = (k, v) => `/explorare?${k}=${encodeURIComponent(v)}`;
// "19 surse · 1172 de povești": a line may break only between the totals, never inside one
const stats = (...parts) => parts.filter(Boolean).map((x) => x.replace(/ /g, '\u00a0')).join(' · ');
const countBy = (list, keys) => { const m = new Map(); for (const x of list) for (const k of keys(x)) m.set(k, (m.get(k) || 0) + 1); return m; };
const byName = (a, b) => a.localeCompare(b, 'ro');
// the long lists in Explore's filters, A to Z, with how many there are of each in the whole catalogue.
// Worked out the first time Explore opens, not when the app starts.
let lists;
function filterLists() {
  if (lists) return lists;
  const storiesWithChar = countBy(stories, (s) => s.characters || []);
  const storiesFrom = countBy(stories, (s) => (s.origin ? [s.origin] : []));
  // everyone credited on a recording (narrators, cast, directors, adaptation, music and sound)
  const recsWith = countBy(versions, (v) => new Set(people(v)));
  return (lists = {
    storiesWithChar, storiesFrom, recsWith,
    crew: [...recsWith.keys()].sort(byName),
    authors: [...storiesByAuthor.keys()].filter(Boolean).sort(byName),
    characters: [...storiesWithChar.keys()].sort(byName),
    origins: [...storiesFrom.keys()].sort((a, b) => byName(label('origin', a, 'ro'), label('origin', b, 'ro'))),
  });
}

// a themed list you can type into, instead of the browser's endless <select>: "ion" keeps only the names with "ion"
function Combo({ id, legend, value, items, onPick }) {
  const [t] = useT();
  const [q, setQ] = useState(null); // null: closed
  const [act, setAct] = useState(0);
  const ul = useRef();
  const cur = items.find(([v]) => v === value)?.[1] || '';
  // matches at the start of a word, without diacritics: "ion" finds Ion and Ionel, not Vissarion
  const words = (x) => ' ' + norm(x).replace(/[^a-z0-9]+/g, ' ').trim();
  const list = q == null ? [] : [['', t.any], ...items.filter(([, txt]) => words(txt).includes(words(q)))];
  useEffect(() => { ul.current?.querySelector('.act')?.scrollIntoView({ block: 'nearest' }); }, [act, q]);
  const pick = (v) => { setQ(null); onPick(v); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (q == null) { setQ(''); setAct(0); return; }
      setAct(Math.max(0, Math.min(Math.min(list.length, 300) - 1, act + (e.key === 'ArrowDown' ? 1 : -1))));
    } else if (e.key === 'Enter' && q != null) { e.preventDefault(); if (list[act]) pick(list[act][0]); }
    else if (e.key === 'Escape' && q != null) { e.stopPropagation(); setQ(null); }
  };
  return (
    <div class="fgroup combo">
      <label class="legend" for={id}>{legend}</label>
      <span class="combo-field">
        <input id={id} type="text" role="combobox" autocomplete="off" spellcheck={false} aria-autocomplete="list" aria-expanded={q != null}
          aria-controls={id + '-list'} aria-activedescendant={q != null && list[act] ? `${id}-${act}` : undefined}
          placeholder={cur || t.any} value={q ?? (cur || t.any)}
          onFocus={() => { setQ(''); setAct(0); }} onClick={() => q == null && setQ('')} onBlur={() => setQ(null)}
          onInput={(e) => { setQ(e.currentTarget.value); setAct(0); }} onKeyDown={onKey} />
        <Icon n="right" size={16} style={{ transform: q == null ? 'rotate(90deg)' : 'rotate(-90deg)' }} />
      </span>
      {q != null && (
        <ul id={id + '-list'} role="listbox" class="combo-list" ref={ul} aria-label={legend}>
          {/* ponytail: the first 300 only, so a slow phone opens 1300 names fast; typing finds the rest */}
          {list.slice(0, 300).map(([v, txt, n], i) => (
            <li id={`${id}-${i}`} role="option" aria-selected={v === (value || '')} class={i === act ? 'act' : null}
              onMouseDown={(e) => e.preventDefault()} onClick={() => pick(v)}>{txt}{n && <span class="combo-n">{n}</span>}</li>
          ))}
          {list.length === 1 && <li class="combo-none" role="presentation">{t.noMatch}</li>}
          {list.length > 300 && <li class="combo-none" role="presentation">{t.typeMore(list.length - 300)}</li>}
        </ul>
      )}
    </div>
  );
}

// ---------- Explore ----------
export function Explore({ query }) {
  const s = useStore();
  const [t, lang] = useT();
  const p = new URLSearchParams(query);
  const f = Object.fromEntries(FILTER_KEYS.filter((k) => p.get(k)).map((k) => [k, p.get(k)]));
  const q = p.get('q') || '';
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const rel = useMemo(() => search(q), [q, s.details]);
  const L = filterLists();
  const sort = p.get('sort') || (rel ? 'relevanta' : 'aleator');
  useEffect(() => { title(t.explore); setLimit(PAGE_SIZE); }, [query]);

  const update = (k, v) => {
    const n = new URLSearchParams(query);
    v ? n.set(k, v) : n.delete(k);
    navigate('/explorare' + (n.toString() ? '?' + n : ''), true);
  };
  const list = sortVersions(applyFilters(rel ? versions.filter((v) => rel.has(v.id)) : versions, f, s.ratings), sort, s.ratings, rel);
  // a story is in the results when one of its recordings is, in the order of its first recording
  const storyList = [...new Set(list.map((v) => v.storyId))].map((id) => storyById.get(id));
  const shown = list.slice(0, limit);
  const active = Object.entries(f);
  const onlyStories = '/explorare?' + new URLSearchParams({ ...Object.fromEntries(p), show: 'povesti' });
  const more = (total) => total > limit && (
    <p class="results-more">
      <button type="button" class="btn ghost" onClick={() => setLimit(limit + PAGE_SIZE)}>{t.showMore(total - limit)}</button>
    </p>
  );

  const opt = (k, v, txt) => {
    const on = k === 'mood' ? (f.mood || '').split(',').includes(v) : f[k] === v;
    const next = k === 'mood' ? (on ? (f.mood || '').split(',').filter((x) => x !== v) : [...(f.mood ? f.mood.split(',') : []), v]).join(',') : on ? '' : v;
    return <button type="button" class="chip" aria-pressed={on} onClick={() => update(k, next)}>{txt}</button>;
  };
  const chips = (k, group = k) => (
    <fieldset class="fgroup"><legend>{t.f[k]}</legend>
      <div class="chips">{Object.keys(ENUMS[group]).filter((v) => versions.some((x) => {
        if (k === 'mood') return x.moods.includes(v);
        if (k === 'genre') return storyById.get(x.storyId)?.genre === v;
        return x[k] === v;
      })).map((v) => opt(k, v, label(group, v, lang)))}</div>
    </fieldset>
  );
  const combo = (k, items) => <Combo id={'f-' + k} legend={t.f[k]} value={f[k] || ''} items={items} onPick={(v) => update(k, v)} />;
  const activeLabel = (k, v) => k === 'show' ? (v === 'povesti' ? t.storiesH : t.recordings) : k === 'mood' ? v.split(',').map((m) => label('moods', m, lang)).join(', ')
    : k === 'age' ? t.ageOpt(v) : k === 'dur' ? t.durOpt[v] : k === 'source' ? sourceById.get(v)?.name : k === 'col' ? collectionById.get(v)?.title
    : ENUMS[k]?.[v] ? label(k, v, lang) : v;

  return (
    <main id="main" tabindex="-1" class="wrap page explore">
      <h1 class="sr-only">{t.explore}</h1>
      <div class="explore-top">
        <SearchForm value={q} onInput={(e) => update('q', e.currentTarget.value)} />
        <button type="button" class="btn ghost filters-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon n="filter" />{t.filters}{active.length ? ` (${active.length})` : ''}
        </button>
      </div>
      {active.length > 0 && (
        <div class="active-filters">
          {active.map(([k, v]) => (
            <button type="button" class="chip on" onClick={() => update(k, '')} aria-label={`${t.remove}: ${t.f[k]} ${activeLabel(k, v)}`}>
              <span class="muted">{t.f[k]}:</span> {activeLabel(k, v)} <Icon n="close" size={14} />
            </button>
          ))}
          {f.author && <a class="link-btn" href={personUrl(f.author)}>{t.allByAuthor(f.author)}</a>}
          <button type="button" class="link-btn" onClick={() => navigate('/explorare' + (q ? '?q=' + encodeURIComponent(q) : ''), true)}>{t.clear}</button>
        </div>
      )}
      <div class="explore-grid">
        <aside class={'filters' + (open ? ' open' : '')} aria-label={t.filters}>
          <fieldset class="fgroup"><legend>{t.f.show}</legend><div class="chips">{opt('show', 'povesti', t.storiesH)}{opt('show', 'inregistrari', t.recordings)}</div></fieldset>
          {chips('genre')}{chips('kind')}{chips('voices')}{chips('sfx')}{chips('music')}{chips('mood', 'moods')}
          <fieldset class="fgroup"><legend>{t.f.dur}</legend><div class="chips">{Object.keys(DURATIONS).map((d) => opt('dur', d, t.durOpt[d]))}</div></fieldset>
          {combo('age',[3, 4, 5, 6, 7, 8, 9, 10, 12].map((n) => [String(n), t.ageOpt(n)]))}
          {/* how many there are of each, in the whole catalogue: stories for story fields, recordings for the rest */}
          {combo('origin', L.origins.map((o) => [o, label('origin', o, lang), t.nStories(L.storiesFrom.get(o))]))}
          {combo('author', L.authors.map((a) => [a, a, t.nStories(storiesByAuthor.get(a).length)]))}
          {combo('char', L.characters.map((c) => [c, c, t.nStories(L.storiesWithChar.get(c))]))}
          {combo('person', L.crew.map((n) => [n, n, t.nRec(L.recsWith.get(n))]))}
          {combo('source', sources.map((x) => [x.id, x.name, t.nRec(versionsBySource.get(x.id)?.length || 0)]))}
          {combo('col', collections.map((c) => [c.id, c.code ? `${c.code} · ${c.title}` : c.title, t.nRec(c.items.length)]))}
        </aside>
        <section class="results">
          <div class="results-head">
            <p class="count" aria-live="polite">{f.show === 'povesti' ? t.nStories(storyList.length) : f.show ? t.nRec(list.length) : `${t.nStories(storyList.length)} · ${t.nRec(list.length)}`}</p>
            <Pick label={t.sortBy} value={sort} items={Object.entries(t.sorts).filter(([k]) => k !== 'relevanta' || rel)} onPick={(v) => update('sort', v)} />
            <button type="button" class="btn small accent" disabled={!list.length} onClick={() => surprise(list)}><Icon n="shuffle" size={16} />{t.surprise}</button>
          </div>
          {list.length === 0 ? <p class="empty">{t.noResults}</p>
            : f.show === 'povesti' ? <>
                <div class="shelf grid">{storyList.slice(0, limit).map((x) => <StoryCard s={x} />)}</div>
                {more(storyList.length)}
              </>
            : <>
                {!f.show && (
                  <Shelf id="res-stories" heading={<>{t.storiesH} {cnt(storyList.length)}</>} more={storyList.length > 6 ? onlyStories : null}>
                    {storyList.slice(0, 6).map((x) => <StoryCard s={x} />)}
                  </Shelf>
                )}
                {!f.show && <div class="shelf-head res-recs"><h2>{t.recordings} {cnt(list.length)}</h2></div>}
                <div class="shelf grid">{shown.map((v) => <VersionCard v={v} />)}</div>
                {more(list.length)}
              </>}
        </section>
      </div>
    </main>
  );
}

// ---------- Story ----------
export function StoryPage({ id }) {
  const s = useStore();
  const [t, lang] = useT();
  const story = storyById.get(id);
  const [sort, setSort] = useState('recomandate');
  useEffect(() => story && title(story.title), [id]);
  if (!story) return <NotFound />;
  const vs = sortVersions(versionsByStory.get(id) || [], sort, s.ratings);
  const best = bestVersion(id, s.ratings);
  const dups = duplicateMap(vs);
  const book = storyLinks(story.id);
  const summary = story.summary?.[lang] || story.summary?.ro;
  return (
    <main id="main" tabindex="-1" class="wrap page">
      <section class="detail-hero">
        <Cover src={storyCover(story)} title={story.title} />
        <div class="detail-text">
          <p class="eyebrow"><a href={find('genre', story.genre)}>{label('genre', story.genre, lang)}</a></p>
          <h1>{story.title}</h1>
          <p class="byline">{t.by} <PersonLink name={story.author} />{story.year ? ` · ${story.year}` : ''}</p>
          {summary && <p class="lead">{summary}</p>}
          <div class="actions">
            {best && <PlayButton v={best} cls="btn primary big" label={t.play} />}
            <FavButton list="favStories" id={story.id} title={story.title} withText />
          </div>
          <dl class="tags">
            {story.origin && <><dt>{t.facts.origin}</dt><dd><a class="tag" href={`/explorare?origin=${encodeURIComponent(story.origin)}`}>{label('origin', story.origin, lang)}</a></dd></>}
            {story.year && <><dt>{t.facts.storyYear}</dt><dd>{story.year}</dd></>}
            {story.characters?.length > 0 && <><dt>{t.characters}</dt><dd>{story.characters.map((x) => <a class="tag" href={find('char', x)}>{x}</a>)}</dd></>}
            {book && <><dt>{t.aboutBook}</dt><dd>{ext(book.wikipedia, 'Wikipedia', 'tag')}{ext(book.goodreads, 'Goodreads', 'tag')}</dd></>}
            {story.themes?.length > 0 && <><dt>{t.themesH}</dt><dd>{story.themes.map((x) => <a class="tag" href={`/explorare?q=${encodeURIComponent(label('themes', x, lang))}`}>{label('themes', x, lang)}</a>)}</dd></>}
          </dl>
        </div>
      </section>
      <section aria-labelledby="vh">
        <div class="shelf-head">
          <h2 id="vh">{t.recordings} {cnt(vs.length)}</h2>
          {vs.length > 1 && (
            <Pick label={t.sortBy} value={sort} items={['recomandate', 'rating', 'scurte', 'lungi'].map((k) => [k, t.sorts[k]])} onPick={setSort} />
          )}
        </div>
        <div class="compare">{vs.map((v) => <VersionRow v={v} best={vs.length > 1 && v.id === best.id} dupOf={dups.get(v.id)} />)}</div>
      </section>
    </main>
  );
}

function names(v, t) {
  const c = v.credits || {};
  const list = [...(c.narrator || []).map((n) => n), ...(c.cast || []).map((x) => x.name)];
  const uniq = [...new Set(list)];
  return uniq.length ? uniq.slice(0, 3).join(', ') + (uniq.length > 3 ? ` ${t.more(uniq.length - 3)}` : '') : null;
}

function VersionRow({ v, best, dupOf }) {
  const s = useStore();
  const [t, lang] = useT();
  const who = names(v, t);
  const later = s.queue.includes(v.id);
  const p = s.player;
  const src = sourceById.get(v.sourceId);
  return (
    <article class={'vrow' + (best ? ' best' : '')}>
      <Cover src={cover(v)} title={storyById.get(v.storyId).title} size={96} />
      <div class="vrow-body">
        {(best || dupOf) && (
          <div class="vrow-badges">
            {best && <span class="badge">{t.recommended}</span>}
            {dupOf && <span class="badge dup">{t.possibleDup(sourceById.get(dupOf.sourceId).name)}</span>}
          </div>
        )}
        <h3><a href={`/inregistrare/${v.id}`}>{v.title}</a></h3>
        <p class="card-sub">{label('kind', v.kind, lang)} · {fmtDur(v.duration)}{v.year ? ` · ${v.year}` : ''} · {src.name}</p>
        {who && <p class="who"><Icon n={v.voices === 'narator' ? 'mic' : 'cast'} size={16} />{who}</p>}
        <div class="card-foot"><Traits v={v} /><Rating id={v.id} compact /></div>
        {v.links.length > 1 && (
          <div class="vrow-mirrors">
            <span class="muted">{t.otherMirrors}:</span>
            {v.links.map((l, i) => {
              const active = p.id === v.id && p.link === i && p.status !== 'ended';
              const playing = active && ['playing', 'loading'].includes(p.status);
              return (
                <button type="button" class="mirror-btn" aria-pressed={active}
                  onClick={() => (playing ? toggle() : play(v.id, undefined, i))}>
                  <Icon n={playing ? 'pause' : 'play'} size={12} />
                  <span>{linkLabel(l, src, v.links)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div class="vrow-actions">
        <PlayButton v={v} cls="btn primary" label={t.play} />
        <button type="button" class="btn ghost small" aria-pressed={later} onClick={() => toggleIn('queue', v.id)}><Icon n={later ? 'check' : 'later'} size={16} />{later ? t.laterOn : t.later}</button>
      </div>
    </article>
  );
}

// ---------- Version ----------
export function VersionPage({ id }) {
  const s = useStore();
  const [t, lang] = useT();
  const v = versionById.get(id);
  useEffect(() => v && title(storyById.get(v.storyId).title), [id]);
  if (!v) return <NotFound />;
  const story = storyById.get(v.storyId);
  const src = sourceById.get(v.sourceId);
  const col = collectionOf.get(v.id);
  const c = v.credits || {};
  const est = (k) => v.estimated?.includes(k) && <abbr class="est" title={t.estimated}>≈</abbr>;
  const pos = savedOffset(v, s.pos[v.id]);
  const later = s.queue.includes(v.id);
  const person = (n) => <PersonLink name={n} />;
  const others = (versionsByStory.get(story.id) || []).filter((x) => x.id !== v.id);
  const p = s.player;
  return (
    <main id="main" tabindex="-1" class="wrap page">
      <section class="detail-hero">
        <Cover src={cover(v)} title={story.title} />
        <div class="detail-text">
          <p class="eyebrow"><a href={`/poveste/${story.id}`}>{t.story}: {story.title}</a></p>
          <h1>{v.title}</h1>
          <p class="byline"><PersonLink name={story.author} /> · {label('kind', v.kind, lang)} · {fmtDur(v.duration)}</p>
          <div class="actions">
            {pos > 10 && pos < v.duration - 20
              ? <><PlayButton v={v} cls="btn primary big" label={t.resume(fmtTime(pos))} /><PlayButton v={v} cls="btn ghost" label={t.fromStart} from="start" /></>
              : <PlayButton v={v} cls="btn primary big" label={t.play} />}
            <FavButton list="favVersions" id={v.id} title={v.title} withText />
            <button type="button" class="btn ghost" aria-pressed={later} onClick={() => toggleIn('queue', v.id)}><Icon n={later ? 'check' : 'later'} size={18} />{later ? t.laterOn : t.later}</button>
          </div>
          <Rate id={v.id} />
        </div>
      </section>

      <div class="detail-cols">
        <section aria-labelledby="ab">
          <h2 id="ab">{t.about}</h2>
          <dl class="facts">
            <dt>{t.facts.duration}</dt><dd>{fmtDur(v.duration)}</dd>
            {story.year && <><dt>{t.facts.storyYear}</dt><dd>{story.year}</dd></>}
            {v.year && <><dt>{t.facts.recYear}</dt><dd>{v.year}</dd></>}
            {story.origin && <><dt>{t.facts.origin}</dt><dd><a href={`/explorare?origin=${encodeURIComponent(story.origin)}`}>{label('origin', story.origin, lang)}</a></dd></>}
            {['kind', 'voices', 'music', 'sfx'].filter((k) => v[k] != null).map((k) => <><dt>{t.facts[k]}</dt><dd><a href={find(k, v[k])}>{label(k, v[k], lang)}</a>{est(k)}</dd></>)}
            {v.moods.length > 0 && <><dt>{t.facts.moods}</dt><dd>{v.moods.map((m, i) => <>{i ? ', ' : ''}<a href={find('mood', m)}>{label('moods', m, lang)}</a></>)}{est('moods')}</dd></>}
            {v.age != null && <><dt>{t.facts.age}</dt><dd>{t.ageFrom(v.age)}{est('age')}</dd></>}
            <dt>{t.facts.source}</dt><dd><a href={`/sursa/${src.id}`}>{src.name}</a></dd>
            {col && <><dt>{t.facts.disc}</dt><dd>{col.c.code ? <><a href={`/colectie/${col.c.id}`}>{col.c.code}</a> · {col.c.title}</> : <a href={`/colectie/${col.c.id}`}>{col.c.title}</a>}</dd></>}
            <dt>{t.facts.links}</dt>
            <dd><ul class="links">{v.links.map((l, i) => {
              const lbl = linkLabel(l, src, v.links);
              if (l.type === 'link') return <li class="link-row"><a class="mirror-btn" href={linkUrl(l)} target="_blank" rel="noopener"><span>{lbl}</span><Icon n="ext" size={16} /></a></li>;
              const active = p.id === v.id && p.link === i && p.status !== 'ended';
              const playing = active && ['playing', 'loading'].includes(p.status);
              return (
                <li class="link-row">
                  <button type="button" class="mirror-btn" aria-pressed={active}
                    onClick={() => (playing ? toggle() : play(v.id, undefined, i))}>
                    <Icon n={playing ? 'pause' : 'play'} size={12} />
                    <span>{lbl}</span>
                  </button>
                  <a class="mirror-ext" href={linkUrl(l)} target="_blank" rel="noopener" aria-label={`${lbl} · ${t.openAt}`}>
                    <Icon n="ext" size={14} />
                  </a>
                </li>
              );
            })}</ul></dd>
          </dl>
        </section>
        {(c.cast || c.director || c.narrator || c.soundDesign) && (
          <section aria-labelledby="cr">
            <h2 id="cr">{t.credits.cast}</h2>
            <dl class="facts">
              {['director', 'adaptation', 'music', 'songs', 'soundDesign'].filter((k) => c[k]).map((k) => <><dt>{t.credits[k]}</dt><dd>{splitNames(c[k]).map((n, i) => <>{i ? ', ' : ''}{person(n)}</>)}</dd></>)}
              {c.narrator && <><dt>{t.credits.narrator}</dt><dd>{c.narrator.map((n, i) => <>{i ? ', ' : ''}{person(n)}</>)}</dd></>}
            </dl>
            {c.cast && <ul class="cast">{c.cast.map((x) => <li>{x.role && <span class="muted">{x.role}</span>}{person(x.name)}</li>)}</ul>}
          </section>
        )}
      </div>

      {col && (
        <nav class="disc-nav" aria-label={col.c.type === 'disc' ? t.fromDisc : t.fromCol}>
          <p><Icon n="disc" size={18} />{col.c.type === 'disc' ? t.fromDisc : t.fromCol} <a href={`/colectie/${col.c.id}`}>{col.c.title}</a></p>
          <div>
            {col.i > 0 && <a class="btn ghost small" href={`/inregistrare/${col.c.items[col.i - 1]}`}><Icon n="left" size={16} />{storyById.get(versionById.get(col.c.items[col.i - 1]).storyId).title}</a>}
            {col.i < col.c.items.length - 1 && <a class="btn ghost small" href={`/inregistrare/${col.c.items[col.i + 1]}`}>{storyById.get(versionById.get(col.c.items[col.i + 1]).storyId).title}<Icon n="right" size={16} /></a>}
          </div>
        </nav>
      )}

      {others.length > 0 && (
        <section class="shelf-section" aria-labelledby="ov">
          <div class="shelf-head"><h2 id="ov">{t.otherVersions}</h2></div>
          <div class="shelf">{others.map((x) => <VersionCard v={x} />)}</div>
        </section>
      )}
    </main>
  );
}

function Rate({ id }) {
  const s = useStore();
  const [t] = useT();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (s.ratingsOk === false) return <p class="rate muted small">{t.votesOff}</p>;
  const mine = s.votes[id];
  const doVote = async (n) => {
    const b = voteBlock(id);
    if (b) return setMsg(b.reason === 'today' ? t.votedToday : t.waitVote(b.minutes));
    setBusy(true);
    const r = await vote(id, n).catch(() => ({ ok: false, error: 'off' }));
    setBusy(false);
    setMsg(r.ok ? t.thanks : r.error === 'today' ? t.votedToday : r.error === 'wait' ? t.waitVote(r.minutes) : t.votesOff);
  };
  return (
    <div class="rate">
      <Rating id={id} />
      <div class="stars" role="group" aria-label={t.rate}>
        <span class="label">{mine && Date.now() - mine.at < 864e5 ? t.yourVote(mine.stars) : t.rate}</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" disabled={busy} aria-label={t.starA(n)} class={mine && n <= mine.stars ? 'on' : ''} onClick={() => doVote(n)}><Icon n="star" size={26} /></button>
        ))}
      </div>
      {msg && <p class="small" role="status">{msg}</p>}
    </div>
  );
}

// ---------- Sources ----------
export function SourcesPage() {
  const [t, lang] = useT();
  useEffect(() => title(t.sources), []);
  return (
    <main id="main" tabindex="-1" class="wrap page">
      <header class="page-head">
        <h1>{t.sources}</h1>
        <p class="lead muted">{stats(t.nSources(sources.length), t.nStories(stories.length), t.nRec(versions.length))}</p>
        <p class="lead">{t.sourcesLead}</p>
      </header>
      <ul class="src-list">
        {sources.map((src) => {
          const vs = versionsBySource.get(src.id) || [];
          return (
            <li class="src-card">
              <div class="src-body">
                <p class="eyebrow">{t.platform[src.type] || src.type} · {t.nRec(vs.length)}</p>
                <h2><a href={`/sursa/${src.id}`}>{src.name}</a></h2>
                <p>{src.description[lang] || src.description.ro}</p>
                <div class="actions">
                  <a class="btn primary" href={`/sursa/${src.id}`}>{t.seeRecs}</a>
                  <a class="btn ghost" href={src.url} target="_blank" rel="noopener">{t.sourceSite}<Icon n="ext" size={16} /></a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <section class="rules" aria-labelledby="rules-h">
        <h2 id="rules-h">{t.rulesH}</h2>
        <p>{t.rules}</p>
        <p>{t.suggest} <a href={`${REPO}/issues`} target="_blank" rel="noopener">{t.suggestLink}</a>.</p>
      </section>
    </main>
  );
}

// ---------- People: authors and everyone in the credits ----------
// an outside link (Wikipedia, Goodreads), shown only when it exists
const ext = (href, txt, cls = 'btn ghost') => href && <a class={cls} href={href} target="_blank" rel="noopener">{txt}<Icon n="ext" size={14} /></a>;

// a name with its photo, when there is one; the photo's credit is on the person's page
function PersonLink({ name }) {
  const photo = personInfo(name)?.photo;
  return <a class="person-link" href={personUrl(name)}>{photo && <img class="avatar" src={photo.src} alt="" width="32" height="32" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}{name}</a>;
}

function photoSource(p) {
  if (p.source) return p.source;
  if (/wikimedia\.org/.test(p.page)) return 'Wikimedia Commons';
  if (/flickr\.com/.test(p.page)) return 'Flickr';
  if (/culturalia\.ro/.test(p.page)) return 'Culturalia';
  if (/archive\.org/.test(p.page)) return 'Internet Archive';
  try { return new URL(p.page).hostname.replace(/^www\./, ''); } catch { return p.page; }
}
const photoLicense = (lic, t) => (/^public domain$/i.test(lic) ? t.publicDomain : /^attribution$/i.test(lic) ? t.attribution : lic);

function More({ total, shown, onMore }) {
  const [t] = useT();
  return total > shown && <p class="results-more"><button type="button" class="btn ghost" onClick={onMore}>{t.showMore(total - shown)}</button></p>;
}

export function PersonPage({ name }) {
  const [t] = useT();
  const written = storiesByAuthor.get(name) || [];
  const performed = useMemo(() => versions.filter((v) => rolesIn(v, name).length), [name]);
  const [limit, setLimit] = useState({ s: PAGE_SIZE, v: PAGE_SIZE });
  useEffect(() => { name && title(name); setLimit({ s: PAGE_SIZE, v: PAGE_SIZE }); }, [name]);
  if (!written.length && !performed.length) return <NotFound />;
  const w = personInfo(name);
  const sorted = [...written].sort((a, b) => (a.year || 9999) - (b.year || 9999) || a.title.localeCompare(b.title, 'ro'));
  const allVs = [...new Set([...sorted.flatMap((st) => versionsByStory.get(st.id) || []), ...performed])];
  const roles = [...new Set([...(written.length ? ['author'] : []), ...performed.flatMap((v) => rolesIn(v, name))])];
  return (
    <main id="main" tabindex="-1" class="wrap page">
      <header class={'page-head' + (w?.photo ? ' person-head' : '')}>
        {w?.photo && <img class="person-photo" src={w.photo.src} alt="" width="160" height="160" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        <div class="person-text">
          <p class="eyebrow"><a href="/explorare">{t.explore}</a> · {roles.map((r) => t.roleNames[r]).join(' · ')}</p>
          <h1>{name}</h1>
          <p class="lead muted">{stats(written.length && t.nStories(written.length), t.nRec(allVs.length))}</p>
          <div class="actions">
            <button type="button" class="btn accent" disabled={!allVs.length} onClick={() => surprise(allVs)}><Icon n="shuffle" size={16} />{t.surprise}</button>
            <FavButton list="favPeople" id={name} title={name} withText onText={t.favOn} />
            <a class="btn ghost" href={`/explorare?${written.length ? 'author' : 'person'}=${encodeURIComponent(name)}`}>{t.filterInExplore}</a>
            {ext(w?.wikipedia, 'Wikipedia')}{ext(w?.goodreads, 'Goodreads')}
          </div>
        </div>
      </header>
      {sorted.length > 0 && (
        <section class="shelf-section" aria-labelledby="pers-st">
          <div class="shelf-head"><h2 id="pers-st">{t.storiesH} {cnt(sorted.length)}</h2></div>
          <div class="shelf grid">{sorted.slice(0, limit.s).map((st) => <StoryCard s={st} />)}</div>
          <More total={sorted.length} shown={limit.s} onMore={() => setLimit({ ...limit, s: limit.s + PAGE_SIZE })} />
        </section>
      )}
      {performed.length > 0 && (
        <section class="shelf-section" aria-labelledby="pers-rec">
          <div class="shelf-head"><h2 id="pers-rec">{t.recordings} {cnt(performed.length)}</h2></div>
          <div class="shelf grid">{performed.slice(0, limit.v).map((v) => <VersionCard v={v} />)}</div>
          <More total={performed.length} shown={limit.v} onMore={() => setLimit({ ...limit, v: limit.v + PAGE_SIZE })} />
        </section>
      )}
      {w?.photo && (
        <p class="photo-credit">
          {t.photo}: {w.photo.by && <>{w.photo.by} · </>}{photoLicense(w.photo.license, t)} · <a href={w.photo.page} target="_blank" rel="noopener">{photoSource(w.photo)}</a>
        </p>
      )}
    </main>
  );
}

// ---------- Source & collection ----------
export function SourcePage({ id }) {
  const [t, lang] = useT();
  const src = sourceById.get(id);
  const [limit, setLimit] = useState(PAGE_SIZE);
  useEffect(() => { src && title(src.name); setLimit(PAGE_SIZE); }, [id]);
  if (!src) return <NotFound />;
  const vs = sortVersions(versionsBySource.get(id) || [], 'titlu');
  const shown = vs.slice(0, limit);
  const cols = collections.filter((c) => c.sourceId === id);
  return (
    <main id="main" tabindex="-1" class="wrap page">
      <header class="page-head">
        <p class="eyebrow"><a href="/surse">{t.sources}</a> · {t.platform[src.type] || src.type}</p>
        <h1>{src.name}</h1>
        <p class="lead muted">{stats(t.nStories(new Set(vs.map((v) => v.storyId)).size), t.nRec(vs.length))}</p>
        <p class="lead">{src.description[lang] || src.description.ro}</p>
        <div class="actions"><FavButton list="favSources" id={src.id} title={src.name} withText onText={t.favOn} /><a class="btn ghost" href={src.url} target="_blank" rel="noopener">{t.sourceSite}<Icon n="ext" size={16} /></a></div>
      </header>
      {cols.length > 0 && (
        <section class="shelf-section" aria-labelledby="cols">
          <div class="shelf-head"><h2 id="cols">{t.collections} {cnt(cols.length)}</h2></div>
          <ul class="col-list">{cols.map((c) => <li><a href={`/colectie/${c.id}`}><Icon n="disc" size={18} /><strong>{c.title}</strong>{c.code && <span class="muted">{c.code}</span>}</a></li>)}</ul>
        </section>
      )}
      <section class="shelf-section" aria-labelledby="recs">
        <div class="shelf-head"><h2 id="recs">{t.recordings} {cnt(vs.length)}</h2></div>
        <div class="shelf grid">{shown.map((v) => <VersionCard v={v} />)}</div>
        {vs.length > limit && (
          <p class="results-more">
            <button type="button" class="btn ghost" onClick={() => setLimit(limit + PAGE_SIZE)}>{t.showMore(vs.length - limit)}</button>
          </p>
        )}
      </section>
    </main>
  );
}

export function CollectionPage({ id }) {
  const [t, lang] = useT();
  const c = collectionById.get(id);
  useEffect(() => c && title(c.title), [id]);
  if (!c) return <NotFound />;
  const src = sourceById.get(c.sourceId);
  return (
    <main id="main" tabindex="-1" class="wrap page">
      <header class="page-head">
        <p class="eyebrow"><Icon n="disc" size={16} /> {c.code && <>{c.code} · </>}<a href={`/sursa/${src.id}`}>{src.name}</a></p>
        <h1>{c.title}</h1>
        {c.description && <p class="lead">{c.description[lang] || c.description.ro}</p>}
        <div class="actions"><FavButton list="favCols" id={c.id} title={c.title} withText onText={t.favOn} />{c.url && <a class="btn ghost" href={c.url} target="_blank" rel="noopener">{c.url.includes('discogs.com') ? 'Discogs' : t.sourceSite}<Icon n="ext" size={16} /></a>}</div>
      </header>
      <section class="shelf-section" aria-labelledby="on-disc">
        <div class="shelf-head"><h2 id="on-disc">{c.type === 'disc' ? t.onDisc : t.inCol} {cnt(c.items.length)}</h2></div>
        <ol class="compare">{c.items.map((vid) => <li><VersionRow v={versionById.get(vid)} /></li>)}</ol>
      </section>
    </main>
  );
}

// ---------- Mine ----------
export function Mine() {
  const s = useStore();
  const [t] = useT();
  useEffect(() => title(t.mine), []);
  // items: [{ key, title, card, remove }]
  const block = (id, heading, items, extra) => items.length > 0 && (
    <section class="shelf-section" aria-labelledby={'m-' + id}>
      <div class="shelf-head"><h2 id={'m-' + id}>{heading} {cnt(items.length)}</h2>{extra}</div>
      <div class="shelf grid">{items.map((x) => (
        <div class="removable" key={x.key}>{x.card}
          <button type="button" class="remove" aria-label={t.removeA(x.title)} onClick={x.remove}><Icon n="close" size={16} /></button>
        </div>
      ))}</div>
    </section>
  );
  const rec = (list, remove, progress) => list.map((id) => versionById.get(id)).filter(Boolean).map((v) => ({
    key: v.id, title: storyById.get(v.storyId).title, remove: () => remove(v.id),
    card: <VersionCard v={v} progress={progress ? Math.min(1, savedOffset(v, s.pos[v.id]) / v.duration) : null} />,
  }));
  const saved = [
    ...s.favStories.map((id) => storyById.get(id)).filter(Boolean).map((x) => ({ key: x.id, title: x.title, remove: () => toggleIn('favStories', x.id), card: <StoryCard s={x} /> })),
    ...rec(s.favVersions, (id) => toggleIn('favVersions', id)),
  ];
  const queue = rec(s.queue, (id) => toggleIn('queue', id));
  const hist = rec(s.history.map((h) => h.id), (id) => set({ history: s.history.filter((h) => h.id !== id) }), true);
  // people, sources and records: one row each, with a remove button
  const rows = (id, heading, key, item) => {
    const items = s[key].map(item).filter(Boolean);
    return items.length > 0 && (
      <section class="shelf-section" aria-labelledby={'m-' + id}>
        <div class="shelf-head"><h2 id={'m-' + id}>{heading} {cnt(items.length)}</h2></div>
        <ul class="col-list">{items.map((x) => (
          <li class="fav-row" key={x.key}>
            <a href={x.href}>{x.icon}<span class="fav-text"><strong>{x.title}</strong>{x.sub && <span class="muted">{x.sub}</span>}</span></a>
            <button type="button" class="icon-btn" aria-label={t.removeA(x.title)} onClick={() => toggleIn(key, x.key)}><Icon n="close" size={16} /></button>
          </li>
        ))}</ul>
      </section>
    );
  };
  const withPerson = (n) => versions.filter((v) => people(v).includes(n) || storyById.get(v.storyId)?.author === n);
  // everything kept in favourites, as recordings: the button below picks one of them at random
  const pool = [...new Set([
    ...s.favVersions.map((id) => versionById.get(id)),
    ...s.favStories.flatMap((id) => versionsByStory.get(id) || []),
    ...s.favPeople.flatMap(withPerson),
    ...s.favSources.flatMap((id) => versionsBySource.get(id) || []),
    ...s.favCols.flatMap((id) => (collectionById.get(id)?.items || []).map((x) => versionById.get(x))),
  ].filter(Boolean))];
  const none = !saved.length && !queue.length && !hist.length && !s.favPeople.length && !s.favSources.length && !s.favCols.length;
  return (
    <main id="main" tabindex="-1" class="wrap page">
      <header class="page-head">
        <h1>{t.mine}</h1><p class="muted">{t.mineSub}</p>
        {pool.length > 0 && <div class="actions"><button type="button" class="btn accent" onClick={() => surprise(pool)}><Icon n="shuffle" />{t.surpriseFav}</button></div>}
      </header>
      {none && <p class="empty">{t.mineEmpty}</p>}
      {block('saved', t.savedH, saved)}
      {rows('people', t.peopleH, 'favPeople', (n) => {
        const photo = personInfo(n)?.photo;
        return { key: n, title: n, href: personUrl(n), sub: t.nRec(withPerson(n).length),
          icon: photo ? <img class="avatar" src={photo.src} alt="" width="32" height="32" loading="lazy" /> : <span class="avatar initial" aria-hidden="true">{n[0]}</span> };
      })}
      {rows('sources', t.sources, 'favSources', (id) => {
        const x = sourceById.get(id);
        return x && { key: id, title: x.name, href: `/sursa/${id}`, sub: t.nRec(versionsBySource.get(id)?.length || 0), icon: <Icon n="library" size={18} /> };
      })}
      {rows('cols', t.collections, 'favCols', (id) => {
        const c = collectionById.get(id);
        return c && { key: id, title: c.title, href: `/colectie/${id}`, sub: c.code, icon: <Icon n="disc" size={18} /> };
      })}
      {block('queue', t.queue, queue)}
      {block('history', t.history, hist,
        <button type="button" class="link-btn" onClick={() => set({ history: [], pos: {} })}>{t.clearHistory}</button>)}
    </main>
  );
}

export function NotFound() {
  const [t] = useT();
  useEffect(() => title(t.notFound), []);
  return (
    <main id="main" tabindex="-1" class="wrap page empty-page">
      <img src="/mark.webp" alt="" width="112" height="95" />
      <h1>{t.notFound}</h1>
      <a class="btn primary" href="/">{t.home}</a>
    </main>
  );
}
