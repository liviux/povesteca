import { useMemo, useState, useEffect } from 'preact/hooks';
import {
  stories, versions, sources, collections, storyById, versionById, sourceById, collectionById, versionsByStory, versionsBySource,
  collectionOf, authors, cover, storyCover, linkUrl, search, applyFilters, sortVersions, shuffle, bestVersion, FILTER_KEYS, DURATIONS, splitNames,
} from './data.js';
import { label, ENUMS, fmtDur, fmtTime } from './i18n.js';
import { useStore, useT, set, state, navigate, toggleIn, voteBlock, vote } from './store.js';
import { play } from './player.jsx';
import { Icon, Cover, PlayButton, FavButton, Rating, Traits, VersionCard, StoryCard } from './ui.jsx';

const title = (txt) => { document.title = txt ? `${txt} · Povesteca` : 'Povesteca · povești audio pentru copii'; };

function surprise(list) {
  const v = shuffle(list.length ? list : versions)[0];
  if (!v) return;
  play(v.id);
  navigate(`/inregistrare/${v.id}`);
}

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

export function Home() {
  const s = useStore();
  const [t] = useT();
  const [seed, setSeed] = useState(0);
  const discover = useMemo(() => shuffle(stories).slice(0, 8), [seed]);
  useEffect(() => title(''), []);
  if (!versions.length) return <main id="main" class="wrap page"><p class="empty">{t.empty}</p></main>;

  const cont = s.history.map((h) => versionById.get(h.id)).filter((v) => v && (s.pos[v.id] || 0) > 10).slice(0, 10);
  const R = s.ratings;
  const rows = [
    ['continue', cont, null],
    ['tonight', sortVersions(versions.filter((v) => (v.moods.includes('somn') || v.moods.includes('linistitoare')) && v.duration <= 1800), 'recomandate', R), '/explorare?mood=linistitoare&dur=mediu'],
    ['radio', sortVersions(versions.filter((v) => v.kind === 'teatru-radiofonic'), 'recomandate', R).slice(0, 12), '/explorare?kind=teatru-radiofonic'],
    ['cast', [...versions].filter((v) => (v.credits?.cast?.length || 0) >= 8).sort((a, b) => b.credits.cast.length - a.credits.cast.length).slice(0, 12), '/explorare?voices=distributie&sort=calitate'],
    ['short', sortVersions(versions.filter((v) => v.duration < 900), 'scurte', R), '/explorare?dur=scurt&sort=scurte'],
    ['top', sortVersions(versions.filter((v) => R[v.id]?.[1]), 'rating', R).slice(0, 12), '/explorare?sort=rating'],
  ];
  return (
    <main id="main">
      <section class="hero">
        <div class="wrap hero-inner">
          <div class="hero-text">
            <img class="hero-mark" src="/mark.webp" alt="" width="112" height="95" />
            <h1>{t.heroTitle}</h1>
            <p class="lead">{t.heroSub(stories.length, versions.length)}</p>
          </div>
          <div class="hero-box">
            <SearchForm />
            <div class="hero-actions">
              <button type="button" class="btn accent" onClick={() => surprise(applyFilters(versions, s.filters))}><Icon n="shuffle" />{t.surprise}</button>
              <button type="button" class="btn ghost" onClick={() => set({ player: { ...state.player, night: true } })}><Icon n="moon" />{t.night}</button>
            </div>
          </div>
        </div>
      </section>
      <div class="wrap shelves">
        {rows.filter(([, list]) => list.length).map(([k, list, more]) => (
          <Shelf id={'sec-' + k} heading={t.sec[k]} more={more}>
            {list.map((v) => <VersionCard v={v} progress={k === 'continue' ? (s.pos[v.id] || 0) / v.duration : null} />)}
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
    <form class="search" role="search" onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get('q').trim(); navigate('/explorare' + (q ? '?q=' + encodeURIComponent(q) : '')); }}>
      <Icon n="search" />
      <input name="q" type="search" value={value} onInput={onInput} placeholder={t.searchPh} aria-label={t.searchPh} autocomplete="off" enterkeyhint="search" />
      {!onInput && <button type="submit" class="btn primary">{t.search}</button>}
    </form>
  );
}

// ---------- Explore ----------
export function Explore({ query }) {
  const s = useStore();
  const [t, lang] = useT();
  const p = new URLSearchParams(query);
  const f = Object.fromEntries(FILTER_KEYS.filter((k) => p.get(k)).map((k) => [k, p.get(k)]));
  const q = p.get('q') || '';
  const view = p.get('view') || 'rec';
  const [open, setOpen] = useState(false);
  const rel = useMemo(() => search(q), [q]);
  const sort = p.get('sort') || (rel ? 'relevanta' : 'recomandate');
  useEffect(() => { title(t.explore); set({ filters: f }); }, [query]);

  const update = (k, v) => {
    const n = new URLSearchParams(query);
    v ? n.set(k, v) : n.delete(k);
    navigate('/explorare' + (n.toString() ? '?' + n : ''), true);
  };
  const list = sortVersions(applyFilters(rel ? versions.filter((v) => rel.has(v.id)) : versions, f, s.ratings), sort, s.ratings, rel);
  const storyList = [...new Set(list.map((v) => v.storyId))].map((id) => storyById.get(id));
  const active = Object.entries(f);

  const opt = (k, v, txt) => {
    const on = k === 'mood' ? (f.mood || '').split(',').includes(v) : f[k] === v;
    const next = k === 'mood' ? (on ? (f.mood || '').split(',').filter((x) => x !== v) : [...(f.mood ? f.mood.split(',') : []), v]).join(',') : on ? '' : v;
    return <button type="button" class="chip" aria-pressed={on} onClick={() => update(k, next)}>{txt}</button>;
  };
  const chips = (k, group = k) => (
    <fieldset class="fgroup"><legend>{t.f[k]}</legend>
      <div class="chips">{Object.keys(ENUMS[group]).filter((v) => versions.some((x) => k === 'mood' ? x.moods.includes(v) : x[k] === v)).map((v) => opt(k, v, label(group, v, lang)))}</div>
    </fieldset>
  );
  const select = (k, items) => (
    <label class="fgroup"><span class="legend">{t.f[k]}</span>
      <select value={f[k] || ''} onChange={(e) => update(k, e.currentTarget.value)}>
        <option value="">{t.any}</option>
        {items.map(([v, txt]) => <option value={v}>{txt}</option>)}
      </select>
    </label>
  );
  const activeLabel = (k, v) => k === 'mood' ? v.split(',').map((m) => label('moods', m, lang)).join(', ')
    : k === 'age' ? t.ageOpt(v) : k === 'dur' ? t.durOpt[v] : k === 'source' ? sourceById.get(v)?.name : k === 'col' ? collectionById.get(v)?.title
    : k === 'quality' ? t.qualityOpt : ENUMS[k]?.[v] ? label(k, v, lang) : v;

  return (
    <main id="main" class="wrap page explore">
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
          <button type="button" class="link-btn" onClick={() => navigate('/explorare' + (q ? '?q=' + encodeURIComponent(q) : ''), true)}>{t.clear}</button>
        </div>
      )}
      <div class="explore-grid">
        <aside class={'filters' + (open ? ' open' : '')} aria-label={t.filters}>
          {chips('kind')}{chips('voices')}{chips('sfx')}{chips('music')}{chips('mood', 'moods')}
          <fieldset class="fgroup"><legend>{t.f.dur}</legend><div class="chips">{Object.keys(DURATIONS).map((d) => opt('dur', d, t.durOpt[d]))}</div></fieldset>
          {select('age', [3, 4, 5, 6, 7, 8, 9, 10].map((n) => [String(n), t.ageOpt(n)]))}
          {select('author', authors.map((a) => [a, a]))}
          {select('source', sources.map((x) => [x.id, x.name]))}
          {select('col', collections.map((c) => [c.id, `${c.code} · ${c.title}`]))}
          <fieldset class="fgroup"><legend>{t.f.quality}</legend><div class="chips">{opt('quality', '4', t.qualityOpt)}</div></fieldset>
        </aside>
        <section class="results" aria-live="polite">
          <div class="results-head">
            <div class="seg" role="group">
              <button type="button" aria-pressed={view === 'rec'} onClick={() => update('view', '')}>{t.recordings}</button>
              <button type="button" aria-pressed={view === 'story'} onClick={() => update('view', 'story')}>{t.stories}</button>
            </div>
            <p class="count">{view === 'story' ? t.nStory(storyList.length) : t.nRec(list.length)}</p>
            <label class="sort"><span class="sr-only">{t.sortBy}</span>
              <select value={sort} onChange={(e) => update('sort', e.currentTarget.value)}>
                {Object.entries(t.sorts).filter(([k]) => k !== 'relevanta' || rel).map(([k, txt]) => <option value={k}>{txt}</option>)}
              </select>
            </label>
            <button type="button" class="btn small accent" disabled={!list.length} onClick={() => surprise(list)}><Icon n="shuffle" size={16} />{t.surprise}</button>
          </div>
          {list.length === 0 ? <p class="empty">{t.noResults}</p>
            : <div class="shelf grid">{view === 'story' ? storyList.map((x) => <StoryCard s={x} />) : list.map((v) => <VersionCard v={v} />)}</div>}
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
  return (
    <main id="main" class="wrap page">
      <section class="detail-hero">
        <Cover src={storyCover(story)} title={story.title} />
        <div class="detail-text">
          <p class="eyebrow">{label('genre', story.genre, lang)}</p>
          <h1>{story.title}</h1>
          <p class="byline">{t.by} <a href={`/explorare?author=${encodeURIComponent(story.author)}`}>{story.author}</a></p>
          <p class="lead">{story.summary[lang] || story.summary.ro}</p>
          <div class="actions">
            {best && <PlayButton v={best} cls="btn primary big" label={t.play} />}
            <FavButton list="favStories" id={story.id} title={story.title} withText />
          </div>
          <dl class="tags">
            <dt>{t.characters}</dt><dd>{story.characters.join(', ')}</dd>
            <dt>{t.themesH}</dt><dd>{story.themes.map((x) => <a class="tag" href={`/explorare?q=${encodeURIComponent(label('themes', x, lang))}`}>{label('themes', x, lang)}</a>)}</dd>
          </dl>
        </div>
      </section>
      <section aria-labelledby="vh">
        <div class="shelf-head">
          <h2 id="vh">{t.recordings} <span class="muted">({vs.length})</span></h2>
          {vs.length > 1 && (
            <label class="sort"><span class="sr-only">{t.sortBy}</span>
              <select value={sort} onChange={(e) => setSort(e.currentTarget.value)}>
                {['recomandate', 'rating', 'scurte', 'lungi', 'calitate'].map((k) => <option value={k}>{t.sorts[k]}</option>)}
              </select>
            </label>
          )}
        </div>
        <div class="compare">{vs.map((v) => <VersionRow v={v} best={vs.length > 1 && v.id === best.id} />)}</div>
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

function VersionRow({ v, best }) {
  const s = useStore();
  const [t, lang] = useT();
  const who = names(v, t);
  const later = s.queue.includes(v.id);
  return (
    <article class={'vrow' + (best ? ' best' : '')}>
      <Cover src={cover(v)} title={storyById.get(v.storyId).title} size={96} />
      <div class="vrow-body">
        {best && <span class="badge">{t.recommended}</span>}
        <h3><a href={`/inregistrare/${v.id}`}>{v.title}</a></h3>
        <p class="card-sub">{label('kind', v.kind, lang)} · {fmtDur(v.duration)}{v.year ? ` · ${v.year}` : ''} · {sourceById.get(v.sourceId).name}</p>
        {who && <p class="who"><Icon n={v.voices === 'narator' ? 'mic' : 'cast'} size={16} />{who}</p>}
        <div class="card-foot"><Traits v={v} /><Rating id={v.id} compact /></div>
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
  const pos = s.pos[v.id] || 0;
  const later = s.queue.includes(v.id);
  const person = (n) => <a href={`/explorare?person=${encodeURIComponent(n)}`}>{n}</a>;
  const others = (versionsByStory.get(story.id) || []).filter((x) => x.id !== v.id);
  return (
    <main id="main" class="wrap page">
      <section class="detail-hero">
        <Cover src={cover(v)} title={story.title} />
        <div class="detail-text">
          <p class="eyebrow"><a href={`/poveste/${story.id}`}>{t.story}: {story.title}</a></p>
          <h1>{v.title}</h1>
          <p class="byline">{story.author} · {label('kind', v.kind, lang)} · {fmtDur(v.duration)}</p>
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
            {v.year && <><dt>{t.facts.year}</dt><dd>{v.year}</dd></>}
            <dt>{t.facts.kind}</dt><dd>{label('kind', v.kind, lang)}{est('kind')}</dd>
            <dt>{t.facts.voices}</dt><dd>{label('voices', v.voices, lang)}{est('voices')}</dd>
            <dt>{t.facts.music}</dt><dd>{label('music', v.music, lang)}{est('music')}</dd>
            <dt>{t.facts.sfx}</dt><dd>{label('sfx', v.sfx, lang)}{est('sfx')}</dd>
            <dt>{t.facts.moods}</dt><dd>{v.moods.map((m) => label('moods', m, lang)).join(', ')}{est('moods')}</dd>
            <dt>{t.facts.age}</dt><dd>{t.ageFrom(v.age)}{est('age')}</dd>
            {v.quality && <><dt>{t.facts.quality}</dt><dd><span class="dots" aria-label={t.qualityTxt(v.quality)}>{[1, 2, 3, 4, 5].map((n) => <i class={n <= v.quality ? 'on' : ''} />)}</span>{est('quality')}</dd></>}
            <dt>{t.facts.play}</dt><dd>{t.playIn[v.links[0].type]}{v.links[0].type === 'youtube' && <small class="muted block">{t.ytNote}</small>}</dd>
            <dt>{t.facts.source}</dt><dd><a href={`/sursa/${src.id}`}>{src.name}</a></dd>
            {col && <><dt>{t.facts.disc}</dt><dd><a href={`/colectie/${col.c.id}`}>{col.c.code}</a> · {col.c.title}</dd></>}
            <dt>{t.facts.links}</dt>
            <dd><ul class="links">{v.links.map((l) => (
              <li><a href={linkUrl(l)} target="_blank" rel="noopener">{l.type === 'youtube' ? 'YouTube' : 'Internet Archive'}{l.via ? ` · ${l.via}` : ''}<Icon n="ext" size={14} /></a></li>
            ))}</ul></dd>
          </dl>
        </section>
        {(c.cast || c.director || c.narrator) && (
          <section aria-labelledby="cr">
            <h2 id="cr">{t.credits.cast}</h2>
            <dl class="facts">
              {['director', 'adaptation', 'music', 'songs'].filter((k) => c[k]).map((k) => <><dt>{t.credits[k]}</dt><dd>{splitNames(c[k]).map((n, i) => <>{i ? ', ' : ''}{person(n)}</>)}</dd></>)}
              {c.narrator && <><dt>{t.credits.narrator}</dt><dd>{c.narrator.map((n, i) => <>{i ? ', ' : ''}{person(n)}</>)}</dd></>}
            </dl>
            {c.cast && <ul class="cast">{c.cast.map((x) => <li>{x.role && <span class="muted">{x.role}</span>}{person(x.name)}</li>)}</ul>}
          </section>
        )}
      </div>

      {col && (
        <nav class="disc-nav" aria-label={t.fromDisc}>
          <p><Icon n="disc" size={18} />{t.fromDisc} <a href={`/colectie/${col.c.id}`}>{col.c.title}</a></p>
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

// ---------- Source & collection ----------
export function SourcePage({ id }) {
  const [t, lang] = useT();
  const src = sourceById.get(id);
  useEffect(() => src && title(src.name), [id]);
  if (!src) return <NotFound />;
  const vs = sortVersions(versionsBySource.get(id) || [], 'titlu');
  const cols = collections.filter((c) => c.sourceId === id);
  return (
    <main id="main" class="wrap page">
      <header class="page-head">
        <p class="eyebrow">{t.sources}</p>
        <h1>{src.name}</h1>
        <p class="lead">{src.description[lang] || src.description.ro}</p>
        <p><a class="btn ghost" href={src.url} target="_blank" rel="noopener">{t.sourceSite}<Icon n="ext" size={16} /></a> <span class="muted">{t.nRec(vs.length)}</span></p>
      </header>
      {cols.length > 0 && (
        <section class="shelf-section" aria-labelledby="cols">
          <div class="shelf-head"><h2 id="cols">{t.collections}</h2></div>
          <ul class="col-list">{cols.map((c) => <li><a href={`/colectie/${c.id}`}><Icon n="disc" size={18} /><strong>{c.title}</strong><span class="muted">{c.code}</span></a></li>)}</ul>
        </section>
      )}
      <section class="shelf-section" aria-labelledby="recs">
        <div class="shelf-head"><h2 id="recs">{t.recordings}</h2></div>
        <div class="shelf grid">{vs.map((v) => <VersionCard v={v} />)}</div>
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
    <main id="main" class="wrap page">
      <header class="page-head">
        <p class="eyebrow"><Icon n="disc" size={16} /> {c.code} · <a href={`/sursa/${src.id}`}>{src.name}</a></p>
        <h1>{c.title}</h1>
        <p class="lead">{c.description[lang] || c.description.ro}</p>
        {c.url && <p><a class="btn ghost" href={c.url} target="_blank" rel="noopener">Discogs<Icon n="ext" size={16} /></a></p>}
      </header>
      <ol class="compare">{c.items.map((vid) => <li><VersionRow v={versionById.get(vid)} /></li>)}</ol>
    </main>
  );
}

// ---------- Mine ----------
export function Mine() {
  const s = useStore();
  const [t] = useT();
  useEffect(() => title(t.mine), []);
  const block = (key, heading, items, render, extra) => items.length > 0 && (
    <section class="shelf-section" aria-labelledby={'m-' + key}>
      <div class="shelf-head"><h2 id={'m-' + key}>{heading}</h2>{extra}</div>
      <div class="shelf grid">{items.map((x) => (
        <div class="removable">{render(x)}
          <button type="button" class="remove" aria-label={t.removeA(storyById.get(x.storyId || x.id)?.title || '')}
            onClick={() => key === 'history' ? set({ history: s.history.filter((h) => h.id !== x.id) }) : toggleIn(key, x.id)}><Icon n="close" size={16} /></button>
        </div>
      ))}</div>
    </section>
  );
  const favS = s.favStories.map((id) => storyById.get(id)).filter(Boolean);
  const favV = s.favVersions.map((id) => versionById.get(id)).filter(Boolean);
  const queue = s.queue.map((id) => versionById.get(id)).filter(Boolean);
  const hist = s.history.map((h) => versionById.get(h.id)).filter(Boolean);
  const none = !favS.length && !favV.length && !queue.length && !hist.length;
  return (
    <main id="main" class="wrap page">
      <header class="page-head"><h1>{t.mine}</h1><p class="muted">{t.mineSub}</p></header>
      {none && <p class="empty">{t.mineEmpty}</p>}
      {block('favStories', t.favStories, favS, (x) => <StoryCard s={x} />)}
      {block('favVersions', t.favVersions, favV, (v) => <VersionCard v={v} />)}
      {block('queue', t.queue, queue, (v) => <VersionCard v={v} />)}
      {block('history', t.history, hist, (v) => <VersionCard v={v} progress={(s.pos[v.id] || 0) / v.duration} />,
        <button type="button" class="link-btn" onClick={() => set({ history: [], pos: {} })}>{t.clearHistory}</button>)}
    </main>
  );
}

export function NotFound() {
  const [t] = useT();
  useEffect(() => title(t.notFound), []);
  return (
    <main id="main" class="wrap page empty-page">
      <img src="/mark.webp" alt="" width="112" height="95" />
      <h1>{t.notFound}</h1>
      <a class="btn primary" href="/">{t.home}</a>
    </main>
  );
}
