import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useRoute, useStore, useT, set, setPlayer, loadRatings, state } from './store.js';
import { Home, Explore, StoryPage, VersionPage, PersonPage, SourcesPage, SourcePage, CollectionPage, Mine, NotFound } from './pages.jsx';
import { Dock, Night, surprise } from './player.jsx';
import { Icon } from './ui.jsx';
import { Changelog } from './changelog.jsx';
import { REPO, loadDetails, loadError, setMaxAge, stories, versions, allStories, allVersions } from './data.js';
import { version } from '../package.json';
import './styles.css';
import './themes.css';
import './themes/ie.css';
import './themes/umbre.css';
import './themes/radio.css';

// in pairs, each pair built on one design guide (see themes.css)
const THEMES = ['clasic', 'plastilina', 'caiet', 'galerie', 'afis', 'harta', 'cosmos', 'jeleu', 'vinil', 'hartie', 'abtibild', 'ie', 'umbre', 'radio'];
// a theme saved before it was retired (Băieți, Fete) falls back to the classic one
if (!THEMES.includes(state.theme)) state.theme = 'clasic';
// the three last themes have a moving scene behind the page (src/fx); three.js is downloaded only for them
const FX = { ie: () => import('./fx/ie.js'), umbre: () => import('./fx/umbre.js'), radio: () => import('./fx/radio.js') };
let fxStop = null, fxTheme = null;
function runFx(theme) {
  if (theme === fxTheme) return;
  fxTheme = theme;
  fxStop?.(); fxStop = null;
  FX[theme]?.().then((m) => { if (fxTheme === theme) fxStop = m.start(); }, (e) => console.warn('fx:', e));
}

// pages with credits, photos, summaries or the search index; the rest render from the main catalog alone
const needsDetails = (path, query) =>
  /^\/(poveste|inregistrare|persoana|autor|ale-mele|colectie)(\/|$)/.test(path) ||
  /^\/explorare(\/|$)/.test(path) || /[?&]q=./.test(query);

// Settings: language, the oldest age to show, theme. Kept in the browser like the rest.
function Settings() {
  const s = useStore();
  const [t] = useT();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e) => !e.target.closest?.('.theme-menu') && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('click', close); addEventListener('keydown', esc);
    return () => { document.removeEventListener('click', close); removeEventListener('keydown', esc); };
  }, [open]);
  const label = s.maxAge ? `${t.settings} · ${t.maxAgeOn(s.maxAge)}` : t.settings;
  return (
    <div class="theme-menu">
      <button type="button" class="icon-btn" aria-expanded={open} aria-haspopup="true" aria-label={label} title={label} onClick={() => setOpen(!open)}>
        <span class="gear"><Icon n="gear" />{s.maxAge > 0 && <b class="age-badge" aria-hidden="true">{s.maxAge}</b>}</span>
        <span class="nav-txt">{t.settings}</span>
      </button>
      {open && (
        <div class="theme-pop" role="group" aria-label={t.settings}>
          <div class="set-group set-row" role="group" aria-labelledby="set-lang"><p class="set-label" id="set-lang">{t.language}</p>
            <div class="chips">
              {[['ro', 'Română'], ['en', 'English']].map(([k, txt]) => (
                <button type="button" class="chip" lang={k} aria-pressed={s.lang === k} onClick={() => set({ lang: k })}>{txt}</button>
              ))}
            </div>
          </div>
          <div class="set-group" role="group" aria-labelledby="set-age"><p class="set-label" id="set-age">{t.maxAge}</p>
            <p class="set-hint" id="age-hint" aria-live="polite">{versions.length < allVersions.length ? t.maxAgeHides(t.nStories(allStories.length - stories.length), t.nRec(allVersions.length - versions.length)) : t.maxAgeHint}</p>
            <div class="chips" aria-describedby="age-hint">
              {[0, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button type="button" class="chip" aria-pressed={s.maxAge === n} aria-label={n ? t.ageOpt(n) : t.ageAll} onClick={() => setMaxAge(n)}>{n || t.ageAll}</button>
              ))}
            </div>
          </div>
          <div class="set-group" role="group" aria-labelledby="set-theme"><p class="set-label" id="set-theme">{t.theme}</p>
            <div class="swatches">
              {THEMES.map((x) => (
                <button type="button" class={'swatch sw-' + x} aria-pressed={s.theme === x} onClick={() => set({ theme: x })}>
                  <i /><span>{t.themes[x]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ path }) {
  const [t] = useT();
  const link = (href, icon, text, also) => (
    <a class="nav-link" href={href} aria-current={path === href || also?.test(path) ? 'page' : null}>
      <Icon n={icon} /><span class="nav-txt">{text}</span>
    </a>
  );
  return (
    <header class="site-head">
      <div class="wrap head-inner">
        <a class="brand" href="/" aria-label="Povesteca">
          <img src="/mark.webp" alt="" width="56" height="48" />
          <img class="wordmark" src="/wordmark.webp" alt="Povesteca" width="148" height="31" />
        </a>
        <nav class="head-nav" aria-label="Meniu">
          {link('/explorare', 'search', t.explore)}
          <button type="button" class="nav-link" onClick={() => surprise()}><Icon n="shuffle" /><span class="nav-txt">{t.surprise}</span></button>
          {link('/surse', 'library', t.sources, /^\/sursa\//)}
          {link('/ale-mele', 'heart', t.mine)}
          <button type="button" class="nav-link" onClick={() => setPlayer({ night: true })}><Icon n="moon" /><span class="nav-txt">{t.night}</span></button>
          <Settings />
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  const [t] = useT();
  const [log, setLog] = useState(false);
  return (
    <footer class="site-foot">
      <div class="wrap">
        <p>{t.footer}</p>
        <p class="foot-links">
          <button type="button" class="link-btn" title={t.version(version)} onClick={() => setLog(true)}>v{version} · {t.news}</button>
          <a href={REPO} target="_blank" rel="noopener">{t.code}<Icon n="ext" size={14} /></a>
          <span class="foot-contact">{t.contact} - <a href="https://liviu.ovh" target="_blank" rel="noopener">liviu.ovh</a></span>
        </p>
      </div>
      {log && <Changelog onClose={() => setLog(false)} />}
    </footer>
  );
}

function App() {
  const url = useRoute();
  const s = useStore();
  const [t] = useT();
  useEffect(() => { loadRatings(); }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = s.theme;
    document.documentElement.lang = s.lang;
    runFx(s.theme);
  }, [s.theme, s.lang]);
  const [path, query = ''] = url.split('?');
  // the summaries, photos and "≈" marks right after the first page; tried again on the next page if they failed.
  // Only pages that show them ask for them; the others don't pay for the download or the search index.
  useEffect(() => { if (needsDetails(path, query)) details(); }, [path, query, s.lang]);
  // after moving to another page, put keyboard and screen reader focus at its start
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [path]);
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  const page =
    !seg.length ? <Home />
    : seg[0] === 'explorare' ? <Explore query={query} />
    : seg[0] === 'poveste' && seg[1] ? <StoryPage id={seg[1]} />
    : seg[0] === 'inregistrare' && seg[1] ? <VersionPage id={seg[1]} />
    : (seg[0] === 'persoana' || seg[0] === 'autor') && seg[1] ? <PersonPage name={seg.slice(1).join('/')} />
    : seg[0] === 'surse' && !seg[1] ? <SourcesPage />
    : seg[0] === 'sursa' && seg[1] ? <SourcePage id={seg[1]} />
    : seg[0] === 'colectie' && seg[1] ? <CollectionPage id={seg[1]} />
    : seg[0] === 'ale-mele' ? <Mine />
    : <NotFound />;
  return (
    <>
      <a class="skip-link" href="#main">{t.skip}</a>
      <Header path={path} />
      {page}
      <Footer />
      <Dock />
      {s.player.night && <Night />}
    </>
  );
}

function LoadError() {
  const [t] = useT();
  useEffect(() => { document.title = t.catalogError; }, [t.catalogError]);
  return (
    <main id="main" tabIndex="-1" class="wrap page">
      <h1>{t.catalogError}</h1>
      <p class="lead">{t.catalogErrorHint}</p>
      <p><button type="button" class="btn primary" onClick={() => location.reload()}>{t.retry}</button></p>
    </main>
  );
}

// the long texts load after the page is on screen; a language change fetches the other summaries too
let detailsLang = null;
const details = () => loadDetails(state.lang).then(() => {
  if (!state.details || detailsLang !== state.lang) {
    detailsLang = state.lang;
    set({ details: true });
  }
}, () => {});
render(loadError ? <LoadError /> : <App />, document.getElementById('app'));
