import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useRoute, useStore, useT, set, setPlayer, loadRatings } from './store.js';
import { Home, Explore, StoryPage, VersionPage, AuthorPage, SourcesPage, SourcePage, CollectionPage, Mine, NotFound } from './pages.jsx';
import { Dock, Night } from './player.jsx';
import { Icon } from './ui.jsx';
import { Changelog } from './changelog.jsx';
import { REPO } from './data.js';
import { version } from '../package.json';
import './styles.css';

const THEMES = ['clasic', 'baieti', 'fete'];

function ThemeMenu() {
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
  return (
    <div class="theme-menu">
      <button type="button" class="icon-btn" aria-expanded={open} aria-haspopup="true" aria-label={t.theme} onClick={() => setOpen(!open)}>
        <Icon n="palette" /><span class="nav-txt">{t.theme}</span>
      </button>
      {open && (
        <div class="theme-pop" role="group" aria-label={t.theme}>
          {THEMES.map((x) => (
            <button type="button" class={'swatch sw-' + x} aria-pressed={s.theme === x} onClick={() => { set({ theme: x }); setOpen(false); }}>
              <i /><span>{t.themes[x]}</span>
            </button>
          ))}
          {/* on narrow phones the language switch moves in here, the header has no room for it */}
          <button type="button" class="swatch lang-in-menu" lang={s.lang === 'ro' ? 'en' : 'ro'} onClick={() => { set({ lang: s.lang === 'ro' ? 'en' : 'ro' }); setOpen(false); }}>
            <i aria-hidden="true">{s.lang === 'ro' ? 'EN' : 'RO'}</i><span>{t.otherLang}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function Header({ path }) {
  const s = useStore();
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
          {link('/surse', 'library', t.sources, /^\/sursa\//)}
          {link('/ale-mele', 'heart', t.mine)}
          <button type="button" class="nav-link" onClick={() => setPlayer({ night: true })}><Icon n="moon" /><span class="nav-txt">{t.night}</span></button>
          <ThemeMenu />
          <button type="button" class="nav-link lang" lang={s.lang === 'ro' ? 'en' : 'ro'} onClick={() => set({ lang: s.lang === 'ro' ? 'en' : 'ro' })}>
            <span aria-hidden="true">{s.lang === 'ro' ? 'EN' : 'RO'}</span><span class="sr-only">{t.otherLang}</span>
          </button>
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
  }, [s.theme, s.lang]);
  const [path, query = ''] = url.split('?');
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
    : seg[0] === 'autor' && seg[1] ? <AuthorPage author={seg.slice(1).join('/')} />
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

render(<App />, document.getElementById('app'));
