# AGENTS.md

Rules for every AI agent working in this repository (Claude, Codex, Copilot, Cursor and others). Read this file before making changes and follow it for the whole session.

## Guides

- **UI:** follow the Taste Skill guide: https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md
- **Text** (interface copy, README, changelog, catalog summaries): follow the Humanizer guide: https://github.com/blader/humanizer/blob/main/SKILL.md

## Catalog

- Only productions made to be listened to and performed by actors join the catalog: radio plays, story records, stories told by an actor. Synthetic or AI voices don't, and neither do channels that mass-upload recordings of unclear origin.
- Only the sound has to be made by people: no AI voices, narration or music. Covers and pictures of a story or recording can be anything, AI-made images included.
- Check every link before it goes in (the archive.org metadata API, YouTube oEmbed or the page itself): it has to open and play the recording it claims to be.
- Fill in the metadata of every story and recording you add, not only the required fields: summary (Romanian and English), genre, themes, characters, origin and year for the story; kind, voices, sound effects, music, moods, age, credits and year for the recording. Work from the source's description, the recording itself and reliable references.
- Never invent data. Facts (duration, years, director, cast, other credits) come only from the source or a reliable reference; what you can't find stays empty. Judgements you make from listening or from the description (kind, voices, sound effects, music, moods, age) go in `estimated`, so the page marks them with “≈”.

## People and books

- Every person in the catalog (authors, cast, narrators, directors, composers) gets a photo and links when they exist, and every story gets links to its book. `node scripts/wiki.js` fills `catalog/wiki.json` from Wikidata; run it after adding stories or credits.
- A photo can come from anywhere, as long as its license allows reuse with credit in a non-commercial project: public domain, CC0, CC BY, CC BY-SA, CC BY-NC or CC BY-NC-SA. The person's page ends with the photo's author, license and a link to its source.
- Wikipedia: the Romanian article for Romanians, the English one for everyone else, and the other language when that one is missing. Goodreads: the author's page for people, the book's page for stories.
- Only add what is certainly that person or that book: the occupation fits the role, people in the credits are Romanian, and a book has the same author and title. When unsure, leave it out. A name the script matched to the wrong person goes in `WRONG` in `scripts/wiki.js`.

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
- `README.md` and this file are public. No deploy steps, accounts, tokens, host names or personal data in them; notes meant only for the owner go to the owner in chat.
- Every piece of interface text exists in Romanian and English (`src/i18n.js`), and so does every changelog line. Story titles, names and catalog data stay in Romanian.
- Run `npm run build` before you commit.
- Report what you actually did. If something was skipped, failed or wasn't tested, say so.
