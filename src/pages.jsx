import { useMemo, useState, useEffect } from 'preact/hooks';
import {
  stories, versions, sources, collections, storyById, versionById, sourceById, collectionById, versionsByStory, versionsBySource,
  storiesByAuthor, collectionOf, authors, origins, cover, storyCover, linkUrl, linkLabel, duplicateMap, search, applyFilters, sortVersions, shuffle, bestVersion, FILTER_KEYS, DURATIONS, splitNames, REPO,
} from './data.js';
import { label, ENUMS, fmtDur, fmtTime } from './i18n.js';
import { useStore, useT, set, state, navigate, toggleIn, voteBlock, vote } from './store.js';
import { play, toggle } from './player.jsx';
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
  if (!versions.length) return <main id="main" tabindex="-1" class="wrap page"><p class="empty">{t.empty}</p></main>;

  const cont = s.history.map((h) => versionById.get(h.id)).filter((v) => v && (s.pos[v.id] || 0) > 10).slice(0, 10);
  const R = s.ratings;
  const rows = [
    ['continue', cont, null],
    // shelf and "See all" use the same filter and order, so "See all" starts with the same cards
    ['tonight', sortVersions(versions.filter((v) => v.moods.includes('linistitoare')), 'scurte', R).slice(0, 12), '/explorare?mood=linistitoare&sort=scurte'],
    ['radio', sortVersions(versions.filter((v) => v.kind === 'teatru-radiofonic'), 'recomandate', R).slice(0, 12), '/explorare?kind=teatru-radiofonic'],
    ['cast', [...versions].filter((v) => (v.credits?.cast?.length || 0) >= 8).sort((a, b) => b.credits.cast.length - a.credits.cast.length).slice(0, 12), '/explorare?voices=distributie'],
    ['short', sortVersions(versions.filter((v) => v.duration < 900), 'scurte', R).slice(0, 12), '/explorare?dur=scurt&sort=scurte'],
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

// ---------- Explore ----------
export function Explore({ query }) {
  const s = useStore();
  const [t, lang] = useT();
  const p = new URLSearchParams(query);
  const f = Object.fromEntries(FILTER_KEYS.filter((k) => p.get(k)).map((k) => [k, p.get(k)]));
  const q = p.get('q') || '';
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const rel = useMemo(() => search(q), [q]);
  const sort = p.get('sort') || (rel ? 'relevanta' : 'recomandate');
  useEffect(() => { title(t.explore); set({ filters: f }); setLimit(PAGE_SIZE); }, [query]);

  const update = (k, v) => {
    const n = new URLSearchParams(query);
    v ? n.set(k, v) : n.delete(k);
    navigate('/explorare' + (n.toString() ? '?' + n : ''), true);
  };
  const list = sortVersions(applyFilters(rel ? versions.filter((v) => rel.has(v.id)) : versions, f, s.ratings), sort, s.ratings, rel);
  const shown = list.slice(0, limit);
  const active = Object.entries(f);

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
          {f.author && <a class="link-btn" href={`/autor/${encodeURIComponent(f.author)}`}>{t.allByAuthor(f.author)}</a>}
          <button type="button" class="link-btn" onClick={() => navigate('/explorare' + (q ? '?q=' + encodeURIComponent(q) : ''), true)}>{t.clear}</button>
        </div>
      )}
      <div class="explore-grid">
        <aside class={'filters' + (open ? ' open' : '')} aria-label={t.filters}>
          {chips('genre')}{chips('kind')}{chips('voices')}{chips('sfx')}{chips('music')}{chips('mood', 'moods')}
          <fieldset class="fgroup"><legend>{t.f.dur}</legend><div class="chips">{Object.keys(DURATIONS).map((d) => opt('dur', d, t.durOpt[d]))}</div></fieldset>
          {select('age', [3, 4, 5, 6, 7, 8, 9, 10, 12].map((n) => [String(n), t.ageOpt(n)]))}
          {select('origin', origins.map((o) => [o, label('origin', o, lang)]))}
          {select('author', authors.map((a) => [a, a]))}
          {select('source', sources.map((x) => [x.id, x.name]))}
          {select('col', collections.map((c) => [c.id, c.code ? `${c.code} · ${c.title}` : c.title]))}
        </aside>
        <section class="results">
          <div class="results-head">
            <p class="count" aria-live="polite">{t.nRes(list.length)}</p>
            <label class="sort"><span class="sr-only">{t.sortBy}</span>
              <select value={sort} onChange={(e) => update('sort', e.currentTarget.value)}>
                {Object.entries(t.sorts).filter(([k]) => k !== 'relevanta' || rel).map(([k, txt]) => <option value={k}>{txt}</option>)}
              </select>
            </label>
            <button type="button" class="btn small accent" disabled={!list.length} onClick={() => surprise(list)}><Icon n="shuffle" size={16} />{t.surprise}</button>
          </div>
          {list.length === 0 ? <p class="empty">{t.noResults}</p>
            : <>
                <div class="shelf grid">{shown.map((v) => <VersionCard v={v} />)}</div>
                {list.length > limit && (
                  <p class="results-more">
                    <button type="button" class="btn ghost" onClick={() => setLimit(limit + PAGE_SIZE)}>{t.showMore(list.length - limit)}</button>
                  </p>
                )}
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
  return (
    <main id="main" tabindex="-1" class="wrap page">
      <section class="detail-hero">
        <Cover src={storyCover(story)} title={story.title} />
        <div class="detail-text">
          <p class="eyebrow">{label('genre', story.genre, lang)}</p>
          <h1>{story.title}</h1>
          <p class="byline">{t.by} <a href={`/autor/${encodeURIComponent(story.author)}`}>{story.author}</a>{story.year ? ` · ${story.year}` : ''}</p>
          <p class="lead">{story.summary[lang] || story.summary.ro}</p>
          <div class="actions">
            {best && <PlayButton v={best} cls="btn primary big" label={t.play} />}
            <FavButton list="favStories" id={story.id} title={story.title} withText />
          </div>
          <dl class="tags">
            {story.origin && <><dt>{t.facts.origin}</dt><dd><a class="tag" href={`/explorare?origin=${encodeURIComponent(story.origin)}`}>{label('origin', story.origin, lang)}</a></dd></>}
            {story.year && <><dt>{t.facts.storyYear}</dt><dd>{story.year}</dd></>}
            {story.characters?.length > 0 && <><dt>{t.characters}</dt><dd>{story.characters.join(', ')}</dd></>}
            {story.themes?.length > 0 && <><dt>{t.themesH}</dt><dd>{story.themes.map((x) => <a class="tag" href={`/explorare?q=${encodeURIComponent(label('themes', x, lang))}`}>{label('themes', x, lang)}</a>)}</dd></>}
          </dl>
        </div>
      </section>
      <section aria-labelledby="vh">
        <div class="shelf-head">
          <h2 id="vh">{t.recordings} <span class="muted">({vs.length})</span></h2>
          {vs.length > 1 && (
            <label class="sort"><span class="sr-only">{t.sortBy}</span>
              <select value={sort} onChange={(e) => setSort(e.currentTarget.value)}>
                {['recomandate', 'rating', 'scurte', 'lungi'].map((k) => <option value={k}>{t.sorts[k]}</option>)}
              </select>
            </label>
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
                  <span>{linkLabel(l, src)}</span>
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
  const pos = s.pos[v.id] || 0;
  const later = s.queue.includes(v.id);
  const person = (n) => <a href={`/explorare?person=${encodeURIComponent(n)}`}>{n}</a>;
  const others = (versionsByStory.get(story.id) || []).filter((x) => x.id !== v.id);
  const p = s.player;
  const activeIdx = p.id === v.id ? p.link : 0;
  const activeLink = v.links[activeIdx] || v.links[0];
  return (
    <main id="main" tabindex="-1" class="wrap page">
      <section class="detail-hero">
        <Cover src={cover(v)} title={story.title} />
        <div class="detail-text">
          <p class="eyebrow"><a href={`/poveste/${story.id}`}>{t.story}: {story.title}</a></p>
          <h1>{v.title}</h1>
          <p class="byline"><a href={`/autor/${encodeURIComponent(story.author)}`}>{story.author}</a> · {label('kind', v.kind, lang)} · {fmtDur(v.duration)}</p>
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
            <dt>{t.facts.kind}</dt><dd>{label('kind', v.kind, lang)}{est('kind')}</dd>
            <dt>{t.facts.voices}</dt><dd>{label('voices', v.voices, lang)}{est('voices')}</dd>
            <dt>{t.facts.music}</dt><dd>{label('music', v.music, lang)}{est('music')}</dd>
            <dt>{t.facts.sfx}</dt><dd>{label('sfx', v.sfx, lang)}{est('sfx')}</dd>
            <dt>{t.facts.moods}</dt><dd>{v.moods.map((m) => label('moods', m, lang)).join(', ')}{est('moods')}</dd>
            <dt>{t.facts.age}</dt><dd>{t.ageFrom(v.age)}{est('age')}</dd>
            <dt>{t.facts.play}</dt><dd>{t.playIn[activeLink.type]}{v.links.length > 1 && <span class="muted"> ({t.moreMirrors(v.links.length - 1)})</span>}{activeLink.type === 'youtube' && <small class="muted block">{t.ytNote}</small>}</dd>
            <dt>{t.facts.source}</dt><dd><a href={`/sursa/${src.id}`}>{src.name}</a></dd>
            {col && <><dt>{t.facts.disc}</dt><dd>{col.c.code ? <><a href={`/colectie/${col.c.id}`}>{col.c.code}</a> · {col.c.title}</> : <a href={`/colectie/${col.c.id}`}>{col.c.title}</a>}</dd></>}
            <dt>{t.facts.links}</dt>
            <dd><ul class="links">{v.links.map((l, i) => {
              const active = p.id === v.id && p.link === i && p.status !== 'ended';
              const playing = active && ['playing', 'loading'].includes(p.status);
              const lbl = linkLabel(l, src);
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

// ---------- Author ----------
export function AuthorPage({ author }) {
  const [t] = useT();
  const list = storiesByAuthor.get(author);
  const [limit, setLimit] = useState(PAGE_SIZE);
  useEffect(() => { author && title(author); setLimit(PAGE_SIZE); }, [author]);
  if (!list?.length) return <NotFound />;
  const sorted = [...list].sort((a, b) => (a.year || 9999) - (b.year || 9999) || a.title.localeCompare(b.title, 'ro'));
  const allVs = sorted.flatMap((st) => versionsByStory.get(st.id) || []);
  const shown = sorted.slice(0, limit);
  return (
    <main id="main" tabindex="-1" class="wrap page">
      <header class="page-head">
        <p class="eyebrow"><a href="/explorare">{t.explore}</a> · {t.author}</p>
        <h1>{author}</h1>
        <p class="lead muted">{t.nStories(sorted.length)} · {t.nRec(allVs.length)}</p>
        <div class="actions">
          <button type="button" class="btn accent" disabled={!allVs.length} onClick={() => surprise(allVs)}><Icon n="shuffle" size={16} />{t.surprise}</button>
          <a class="btn ghost" href={`/explorare?author=${encodeURIComponent(author)}`}>{t.filterInExplore}</a>
        </div>
      </header>
      <section class="shelf-section" aria-labelledby="auth-st">
        <div class="shelf-head"><h2 id="auth-st">{t.storiesH}</h2></div>
        <div class="shelf grid">{shown.map((st) => <StoryCard s={st} />)}</div>
        {sorted.length > limit && (
          <p class="results-more">
            <button type="button" class="btn ghost" onClick={() => setLimit(limit + PAGE_SIZE)}>{t.showMore(sorted.length - limit)}</button>
          </p>
        )}
      </section>
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
        <p class="lead">{src.description[lang] || src.description.ro}</p>
        <p><a class="btn ghost" href={src.url} target="_blank" rel="noopener">{t.sourceSite}<Icon n="ext" size={16} /></a> <span class="muted">{t.nRec(vs.length)}</span></p>
      </header>
      {cols.length > 0 && (
        <section class="shelf-section" aria-labelledby="cols">
          <div class="shelf-head"><h2 id="cols">{t.collections}</h2></div>
          <ul class="col-list">{cols.map((c) => <li><a href={`/colectie/${c.id}`}><Icon n="disc" size={18} /><strong>{c.title}</strong>{c.code && <span class="muted">{c.code}</span>}</a></li>)}</ul>
        </section>
      )}
      <section class="shelf-section" aria-labelledby="recs">
        <div class="shelf-head"><h2 id="recs">{t.recordings}</h2></div>
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
        <p class="lead">{c.description[lang] || c.description.ro}</p>
        {c.url && <p><a class="btn ghost" href={c.url} target="_blank" rel="noopener">{c.url.includes('discogs.com') ? 'Discogs' : t.sourceSite}<Icon n="ext" size={16} /></a></p>}
      </header>
      <section class="shelf-section" aria-labelledby="on-disc">
        <div class="shelf-head"><h2 id="on-disc">{c.type === 'disc' ? t.onDisc : t.inCol}</h2></div>
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
      <div class="shelf-head"><h2 id={'m-' + id}>{heading}</h2>{extra}</div>
      <div class="shelf grid">{items.map((x) => (
        <div class="removable" key={x.key}>{x.card}
          <button type="button" class="remove" aria-label={t.removeA(x.title)} onClick={x.remove}><Icon n="close" size={16} /></button>
        </div>
      ))}</div>
    </section>
  );
  const rec = (list, remove, progress) => list.map((id) => versionById.get(id)).filter(Boolean).map((v) => ({
    key: v.id, title: storyById.get(v.storyId).title, remove: () => remove(v.id),
    card: <VersionCard v={v} progress={progress ? (s.pos[v.id] || 0) / v.duration : null} />,
  }));
  const saved = [
    ...s.favStories.map((id) => storyById.get(id)).filter(Boolean).map((x) => ({ key: x.id, title: x.title, remove: () => toggleIn('favStories', x.id), card: <StoryCard s={x} /> })),
    ...rec(s.favVersions, (id) => toggleIn('favVersions', id)),
  ];
  const queue = rec(s.queue, (id) => toggleIn('queue', id));
  const hist = rec(s.history.map((h) => h.id), (id) => set({ history: s.history.filter((h) => h.id !== id) }), true);
  const none = !saved.length && !queue.length && !hist.length;
  return (
    <main id="main" tabindex="-1" class="wrap page">
      <header class="page-head"><h1>{t.mine}</h1><p class="muted">{t.mineSub}</p></header>
      {none && <p class="empty">{t.mineEmpty}</p>}
      {block('saved', t.savedH, saved)}
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
