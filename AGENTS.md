# AGENTS.md

Rules for every AI agent working in this repository (Claude, Codex, Copilot, Cursor and others). Read this file before making changes and follow it for the whole session.

## Guides

- **UI:** follow the Taste Skill guide: https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md
- **Text** (interface copy, README, changelog, catalog summaries): follow the Humanizer guide: https://github.com/blader/humanizer/blob/main/SKILL.md

## Catalog

- Only productions made to be listened to and performed by actors join the catalog: radio plays, story records, stories told by an actor. Synthetic or AI voices don't, and neither do channels that mass-upload recordings of unclear origin.
- Only the sound has to be made by people: no AI voices, narration or music. Covers and pictures of a story or recording can be anything, AI-made images included.
- Every recording is spoken in Romanian. Romanian translations of foreign works are welcome; recordings in any other language (an opera sung in Italian, an English audiobook) don't join the catalog.
- Every story must suit children. Leave out, or remove when found, anything built on sexual or intimate themes, adultery, suicide, murder as the core of the plot, horror, drinking, crude humour or swearing, and productions made for adults even when harmless (comedy shows for grown-ups, satire of office or married life, adult stage comedies). Classic fairy tales, myths, legends with battles and adventure novels are fine; give darker ones an honest `age`. This applies to estimated ages too: an "≈ 13+" recording has no place here.
- A source with 3 recordings or fewer is removed completely (its recordings, its stories when they have no other recording, its collections and its entry in `sources.json`), and so is one that drops to 3 or fewer after a clean-up.
- One person has one spelling everywhere: Romanian diacritics with ș and ț, the spelling used on Wikipedia or on the record sleeve, no ALL CAPS. Each `cast` and `narrator` entry is one real name; split “X și Y” into two entries, drop “și alții”/“and others”, and move a role written into the name (“Gina Cazan - Vrăjitoarea”) into `role`. Before adding a name, search the catalog for the same person under another spelling.
- Before adding a story, search the catalog for the same tale under another title (“Spiridușii” and “Darul spiridușilor”, a translated title, a folk tale credited to a collector). The same tale gets one story with several recordings.
- Check every link before it goes in (the archive.org metadata API, YouTube oEmbed or the page itself): it has to open and play the recording it claims to be.
- The same production found on another platform is welcome: add it as another link of the existing recording, never as a new recording. The player moves to the next link by itself when one stops working. Do not make Internet Archive the preferred or default source: uploads on Internet Archive are often amateur transfers, whereas direct audio sources (`audio`) and YouTube channels usually carry studio recordings. Order `links` with direct `audio` first, then `youtube`, then `archive` last as a fallback (and external `link` after that); use `archive` first only when no other playable source exists. Two recordings marked “Posibil duplicat” on a story page get checked, and if they are the same production, merged into one.
- When a recording contains more than one story (a compilation, anthology, double feature or multi-story record side), split it into separate stories and recordings—one per story—sharing the same link(s) with verified `start` and `end` timestamps (and each story's own `duration`), so the player starts automatically where each story begins and stops where it ends. Never invent timestamps: verify every boundary from the audio or a reliable chapter list.
- Fill in the metadata of every story and recording you add, not only the required fields: summary (Romanian and English), genre, themes, characters, origin and year for the story; kind, voices, sound effects, music, moods, age, credits and year for the recording. Work from the source's description, the recording itself and reliable references.
- `duration`, `start` and `end` are in seconds. `quality` (1–5) says how rich the production is (cast, music, direction), not how popular it is; it only feeds the “Recomandate” order. `"cover": false` marks a recording with no cover at the source, so the app draws the story's initial instead of archive.org's black waveform. The allowed values of `kind`, `voices`, `sfx`, `music`, `moods` and `genre` are in `scripts/check-catalog.js`. An archive.org file name and duration are at `https://archive.org/metadata/IDENTIFIER` (field `length`).
- Never invent data. Facts (duration, years, director, cast, other credits) come only from the source or a reliable reference; what you can't find stays empty. Judgements you make from listening or from the description (kind, voices, sound effects, music, moods, age) go in `estimated`, so the page marks them with “≈”.

## People and books

- For every story added to the catalog—along with its author and every credited person (cast, narrators, directors, adaptors, composers)—check and add links whenever they exist:
  - **Wikipedia** for the story, the author and every credited person: the Romanian article for Romanians and Romanian stories, the English one for everyone else, falling back to the other language when missing.
  - **Goodreads** for the story (book or work page) and for the author.
- For every new person added to the catalog (authors, cast, narrators, directors, adaptors, composers), actively try to find and add a photo. A photo can come from anywhere on the internet, as long as its license allows reuse with credit in a non-commercial project: public domain (including Public Domain Mark), CC0, CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA, Wikimedia Commons `Attribution`, GNU Free Documentation License, Free Art License, Open Government Licence, or another clearly free license that allows reuse with credit in a non-commercial project (never `ND`, fair use or all-rights-reserved). The person's page ends with the photo's author, license and a clickable link to its source.
- Workflow: run `node scripts/wiki.js` after adding stories or credits; it fills `catalog/wiki.json` from Wikidata/Wikimedia Commons and merges curated additions from `catalog/wiki-manual.json`. Whenever Wikidata misses a story, person, Goodreads link or photo (translated titles, disambiguations, missing Goodreads IDs, or photos found on Wikimedia Commons, Openverse, Flickr CC or other open archives), verify the link and add it to `catalog/wiki-manual.json`, then re-run `node scripts/wiki.js`.
- Only add what is certainly that person, that photo or that book: the occupation and era fit the role, people in the credits are Romanian (except international composers/adaptors), and a book has the same author and title. When unsure, leave it out. A name the script matched to the wrong person goes in `wrong` in `catalog/wiki-manual.json` (or `WRONG` in `scripts/wiki.js`).

## Sources and privacy

- Nothing is downloaded from any source. Recordings, videos and covers stay where they are published; Povesteca only links to them and plays them through the platforms' own players.
- The YouTube player stays visible on the page, and the app doesn't get around YouTube stopping playback when the phone screen locks.
- No accounts, cookies, analytics or ads. Ask before any change that touches this, and update “Ce date se păstrează” in `README.md` when it lands.

## Interface

- A parent should understand every filter, label and button without an explanation. If a term needs one, first ask whether it needs to exist at all.
- Romanian text uses ș and ț with a comma below, not ş and ţ with a cedilla. Any new font must have ă, â, î, ș and ț.
- Check every visible change in the browser (`npm run dev`) before you commit it: all three themes, a 320 px phone and a desktop, Romanian and English, with the player open. Nothing scrolls sideways, tap targets are at least 44 px and everything works from the keyboard.

## Git

- Commit and push directly to `main`. No branches, pull requests or similar unless explicitly asked.
- “Push to main” means the whole release described below, without asking: version bump, both changelogs, `npm run check`, `npm run build`, commit and push.
- Never force-push or rewrite published history.
- Other people and agents may work in the same folder at the same time. Never delete, overwrite or revert uncommitted files or changes you didn't make. Commit only your own files and tell the user what else you found.
- Never commit `.env` files, tokens (Upstash or any other) or personal data, and never run anything against the production ratings database.

## Versioning

The project uses [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`. The current version is the `version` field in `package.json`.

- **MAJOR**: a breaking change, such as a new format for what the app keeps in the browser (`povesteca:v1`) that loses saved favourites, history or positions, or a removed main feature.
- **MINOR**: a new feature, page or filter, or new stories in the catalog.
- **PATCH**: a bug fix, a copy or style tweak, a catalog correction, a docs change or a dependency bump that changes no behaviour.

Pick the bump from the largest change in the push.

## Every change that reaches `main`

Small or medium changes to `README.md` do not need a changelog entry or a version bump.

For other changes committed and pushed to `main`:

1. **Bump the version** with `npm version <major|minor|patch> --no-git-tag-version`, so `package.json` and `package-lock.json` change together.
2. **Update both changelogs**: `CHANGELOG.md` (Romanian) and `CHANGELOG.en.md` (English). Add a section for the new version at the top of each, with the same version and date:

   ```markdown
   ## [1.2.0] - 2026-11-22

   ### Added
   - Short explanation of the new thing, from the listener's point of view.

   ### Changed
   - ...

   ### Fixed
   - ...

   ### Removed
   - ...
   ```

   Use only the headings you need, and keep them in English in both files; the app shows them translated. Keep each line short and say what changed for the listener, not which files moved.
   When a release adds stories to the catalog, start that bullet with `**Povești noi:**` in `CHANGELOG.md` and `**New stories:**` in `CHANGELOG.en.md`. The app's “Noutăți” dialog marks that release with a badge.
3. **Commit** the version bump and both changelogs together with the change (or as the last commit before the push).

`npm run check` (also part of `npm run build`) fails when `package.json`, `package-lock.json` and the two changelogs don't agree on the version.

Don't create git tags or GitHub releases. If a version shipped with a mistake, fix it in a new patch version.

## General

- When there are several good ways forward, ask before you pick one.
- Use subagents when they make the work faster or more thorough.
- Search online for the current documentation of Vite, Preact, the YouTube player, Vercel and anything else you rely on, instead of working from memory.
- `README.md` and this file are public. No deploy steps, accounts, tokens, private host names or personal data in them (the public app link at the top of the README stays); notes meant only for the owner go to the owner in chat.
- Every piece of interface text exists in Romanian and English (`src/i18n.js`), and so does every changelog line. Story titles, names and catalog data stay in Romanian.
- Run `npm run build` before you commit.
- Report what you actually did. If something was skipped, failed or wasn't tested, say so.
