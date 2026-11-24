// "What's new": the release notes from CHANGELOG.md (RO) / CHANGELOG.en.md (EN), newest first,
// 20 at a time, with a link to the full changelog on GitHub. Same format as the repo file:
// "## [1.2.0] - 2026-11-22", then "### Added|Changed|Fixed|Removed" and "- " bullets.
import { useEffect, useRef, useState } from 'preact/hooks';
import { REPO } from './data.js';
import { useT } from './store.js';
import { Icon } from './ui.jsx';

// loaded only when the dialog opens, so the notes never weigh on the first page load
const FILES = { ro: () => import('../CHANGELOG.md?raw'), en: () => import('../CHANGELOG.en.md?raw') };
const PAGE = 20;
// a bullet that starts with one of these markers flags the release with a "New stories" / "Removed stories" badge
const NEW = /^\*\*(Povești noi|New stories):\*\*/;
const GONE = /^\*\*(Povești scoase|Removed stories):\*\*/;

// **bold** and `code`, nothing else
const inline = (text) => text.split(/(\*\*.+?\*\*|`[^`]+`)/).map((part) =>
  part.startsWith('**') ? <strong>{part.slice(2, -2)}</strong> : part.startsWith('`') ? <code>{part.slice(1, -1)}</code> : part);

function Release({ text }) {
  const [t, lang] = useT();
  const [head, ...lines] = text.trim().split('\n');
  const [, version, date] = head.match(/^## \[(.+?)\] - (.+)$/) || [];
  const day = new Date(date + 'T12:00:00');
  const items = lines.map((line) => [line.match(/^### (.+)$/), line.match(/^(\s*)- (.+)$/)]);
  return (
    <section class="release">
      <h3>
        <span>v{version || '?'}{items.some(([, i]) => i && NEW.test(i[2])) && <span class="badge">{t.newStories}</span>}{items.some(([, i]) => i && GONE.test(i[2])) && <span class="badge gone">{t.removedStories}</span>}</span>
        <small>{isNaN(day) ? date : day.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })}</small>
      </h3>
      {items.map(([cat, item]) => cat ? <h4>{t.newsCats[cat[1]] || cat[1]}</h4>
        : item ? <p class={'release-item' + (item[1] ? ' nested' : '') + (NEW.test(item[2]) ? ' fresh' : GONE.test(item[2]) ? ' gone' : '')}>{inline(item[2])}</p>
        : null)}
    </section>
  );
}

export function Changelog({ onClose }) {
  const [t, lang] = useT();
  const ref = useRef();
  const [releases, setReleases] = useState(null); // null = loading, false = failed
  const [shown, setShown] = useState(PAGE);
  useEffect(() => { ref.current.showModal(); }, []);
  useEffect(() => {
    FILES[lang]().then((m) => setReleases(m.default.split(/(?=^## \[)/m).filter((x) => x.startsWith('## ['))), () => setReleases(false));
  }, [lang]);
  return (
    // a click on the dimmed backdrop lands on the <dialog> itself and closes it
    <dialog ref={ref} class="log" aria-labelledby="log-h" onClose={onClose} onClick={(e) => e.target === ref.current && ref.current.close()}>
      <div class="log-inner">
        <header class="log-head">
          <h2 id="log-h">{t.news}{__COMMITS__ && <span class="muted"> ({t.nChanges(__COMMITS__)})</span>}</h2>
          <button type="button" class="icon-btn" aria-label={t.close} onClick={() => ref.current.close()}><Icon n="close" /></button>
        </header>
        {releases === false ? <p class="muted">{t.newsErr}</p>
          : !releases ? <p class="muted">{t.loading}</p>
          : releases.slice(0, shown).map((r) => <Release text={r} />)}
        <div class="log-foot">
          {releases && shown < releases.length && <button type="button" class="btn ghost" onClick={() => setShown(shown + PAGE)}>{t.newsMore}</button>}
          <a class="btn ghost" href={`${REPO}/blob/main/CHANGELOG${lang === 'en' ? '.en' : ''}.md`} target="_blank" rel="noopener">{t.newsAll}<Icon n="ext" size={16} /></a>
        </div>
      </div>
    </dialog>
  );
}
