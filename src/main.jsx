import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useRoute, useStore, useT, set, setPlayer, loadRatings } from './store.js';
import { Home, Explore, StoryPage, VersionPage, SourcePage, CollectionPage, Mine, NotFound } from './pages.jsx';
import { Dock, Night } from './player.jsx';
import { Icon } from './ui.jsx';
import { sources } from './data.js';
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
        </div>
      )}
    </div>
  );
}

function Header() {
  const s = useStore();
  const [t] = useT();
  return (
    <header class="site-head">
      <div class="wrap head-inner">
        <a class="brand" href="/" aria-label="Povesteca">
          <img src="/mark.webp" alt="" width="56" height="48" />
          <img class="wordmark" src="/wordmark.webp" alt="Povesteca" width="148" height="31" />
        </a>
        <nav class="head-nav" aria-label="Meniu">
          <a class="nav-link" href="/explorare"><Icon n="search" /><span class="nav-txt">{t.explore}</span></a>
          <a class="nav-link" href="/ale-mele"><Icon n="heart" /><span class="nav-txt">{t.mine}</span></a>
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
  return (
    <footer class="site-foot">
      <div class="wrap">
        <p>{t.footer}</p>
        <p>{t.sources}: {sources.map((x, i) => <>{i ? ' · ' : ''}<a href={`/sursa/${x.id}`}>{x.name}</a></>)}</p>
      </div>
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
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  const page =
    !seg.length ? <Home />
    : seg[0] === 'explorare' ? <Explore query={query} />
    : seg[0] === 'poveste' && seg[1] ? <StoryPage id={seg[1]} />
    : seg[0] === 'inregistrare' && seg[1] ? <VersionPage id={seg[1]} />
    : seg[0] === 'sursa' && seg[1] ? <SourcePage id={seg[1]} />
    : seg[0] === 'colectie' && seg[1] ? <CollectionPage id={seg[1]} />
    : seg[0] === 'ale-mele' ? <Mine />
    : <NotFound />;
  return (
    <>
      <a class="skip-link" href="#main">{t.skip}</a>
      <Header />
      {page}
      <Footer />
      <Dock />
      {s.player.night && <Night />}
    </>
  );
}

render(<App />, document.getElementById('app'));
