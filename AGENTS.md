# AGENTS.md

Rules for every AI agent working in this repository (Claude, Codex, Copilot, Cursor and others). Read this file before making changes and follow it for the whole session.

## Guides

- **UI:** follow the Taste Skill guide: https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md
- **Text** (interface copy, README, changelog, catalog summaries): follow the Humanizer guide: https://github.com/blader/humanizer/blob/main/SKILL.md

## Git

- Commit and push directly to `main`. No branches, pull requests or similar unless explicitly asked.
- Never force-push or rewrite published history.

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

- Every piece of interface text exists in Romanian and English (`src/i18n.js`), and so does every changelog line. Story titles, names and catalog data stay in Romanian.
- Run `npm run build` and check the change in the browser (`npm run dev`) before you commit it.
- Report what you actually did. If something was skipped, failed or wasn't tested, say so.
