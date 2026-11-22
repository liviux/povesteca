# Changelog

Every change to Povesteca, newest first. The app shows the same list under “What's new” in the page footer. The Romanian version is [CHANGELOG.md](CHANGELOG.md).

## [1.4.1] - 2026-11-22

### Changed
- New catalogue rule: the same recording found on another platform is added as an extra source, so the story still plays when one link disappears. The ad-free link comes first.

## [1.4.0] - 2026-11-22

### Added
- A page for everyone in the catalogue: authors, actors, narrators, directors. It shows the stories they wrote and the recordings they're in, and where possible a freely licensed photo and links to Wikipedia and Goodreads.
- Small photos next to the names in the cast.
- Links to the book (Wikipedia, Goodreads) on the page of stories that have one.

### Changed
- The author page became the person's page: it also shows recordings the author performs in or directs.

## [1.3.0] - 2026-11-22

### Added
- A **dark version** of all three themes. It turns on by itself when your phone or tablet is in dark mode, or when you use the Dark Reader extension, which then leaves the page alone instead of recolouring it.

### Fixed
- With the browser's dark mode or Dark Reader, colours, the seek bar and buttons no longer look broken.

## [1.2.3] - 2026-11-22

### Changed
- Phones now show the player's **Back 15 seconds** and **Forward 30 seconds** buttons too.

### Fixed
- The player's seek bar works with a finger on iPhone and iPad as well: tap anywhere on it to jump there, or drag it. It is thicker and easier to see, and it no longer jumps back while your finger is on it.

## [1.2.2] - 2026-11-22

### Changed
- On the home page, **Browse** now sits next to **Surprise me!** and **Good night**, so every story and filter is one tap away.

## [1.2.1] - 2026-11-22

### Changed
- The catalogue rules are now written down for everyone working on the project too: only recordings performed by actors, with checked links and no made-up details.

## [1.2.0] - 2026-11-22

### Added
- **New stories:** expanded the catalogue to 931 stories and 1,070 recordings across 13 free, ad-free archives and curated YouTube channels, adding eTeatru (National Radio Theatre), Arhiva Radio România, Culturalia (“Pe unde”), digitized Electrecord and Povești Audio Vinil records, A Fost Odată, Oameni mici și mari, Teatru Subtitrat, Teatru pe Vinil and Itsy Bitsy & Leon Magdan.
- **Direct MP3 playback** inside the in-app player for streams from eTeatru, Radio România, Culturalia, A Fost Odată and Oameni mici și mari, with seeking, saved progress and fade-out sleep timer.
- **Author pages**: tap any author's name on a story or recording page to see all of their stories in one place.
- **New genres and filters** in **Browse**: **Legend**, **Biography** and **Origin** (Romanian, German, French, Arabian Nights, etc.).
- **Story publication year** shown alongside **Recording year**, distinguishing when a work was written from when the radio drama was recorded.
- **New collections** for multi-story Electrecord vinyls and series (*Zeii din Olimp*, *Andilandi*, *Cartea cu jucării*, *Noapte bună, copii!*, *Români de poveste*, *Patrimoniu*, *Jules Verne – Teatru Radiofonic*, *Misiunile lui Itsy și ale lui Bitsy*).

### Changed
- **Browse** and source pages now reveal results in batches of 48 so scrolling stays responsive across the expanded library.
- Identical productions found across multiple platforms (eTeatru, Internet Archive, Radio România and YouTube) keep all mirror links visible and individually playable, add an in-player source switcher for instant fallback, and mark likely separate cross-source uploads as possible duplicates.

### Fixed
- Corrected Romanian diacritics and cast credits on existing records, and filled in missing cast lists for 1958–2003 radio plays.
- Story pages safely handle entries that omit optional character lists.

## [1.1.0] - 2026-11-22

### Added
- A **Sources** page in the top menu, with the archives and channels the stories come from and the rules a story has to meet to join the catalogue.
- **What's new**: the list of changes, opened from the page footer.

### Changed
- Headings use a font with every Romanian letter, so “ă”, “ș” and “ț” no longer look different from the letters around them.
- On **My stuff**, saved stories and saved recordings share one list, **Saved**.
- **Browse** shows a single list of results, without the switch between stories and recordings.
- The home page no longer shows how many stories and recordings there are.
- The **For tonight** shelf and the page behind **See all** show the same calm stories, shortest first.
- On narrow phones the language button (EN/RO) moves into the **Theme** menu, so the top menu fits on screen.
- Recordings with no cover at their source show the story's initial on a coloured tile instead of a black sound wave.
- Filter buttons, tags and names in the cast are easier to tap on a phone.

### Fixed
- On a recording's page, only the main button turns into **Pause** while the story plays. **From the start** stays as it is.
- Long lists in the filters (author, source, record) fit inside the panel, with no sideways scrolling.
- While a story plays, the player no longer covers the bottom of the filter panel.
- The top menu no longer runs off the screen on small phones and at some tablet widths.
- On phones, the **Previous** and **Next** buttons of a record with long titles no longer run off the screen.
- Pressing Enter in the **Browse** search no longer clears the chosen filters.
- The listen button works again after a recording failed to start.
- The player's cover no longer stays blank when you move to another story.
- A heart or other change made just before you close the page is kept.
- In **Good night** mode the keyboard stays inside its window and returns where it was after closing. A YouTube video stays visible above the dark screen, as YouTube's rules require.
- Screen readers hear the names of the top menu buttons on phones, no longer read the whole list after every filter, and start at the top of the page after each page change.

### Removed
- The **Rich productions** filter and the sort by production. They said the same thing as the **Performance** filter, only less clearly.
- The list of sources in the page footer. Sources have their own page now.

## [1.0.0] - 2026-11-22

### Added
- A library of Romanian audio stories: radio plays and story records published on the Internet Archive and YouTube.
- **New stories:** 62 stories in 73 recordings, most of them from digitised Electrecord records.
- Search that works without diacritics and with small typos, plus filters and several ways to sort.
- An in-page player that remembers where you stopped, and **Good night** mode with a sleep timer.
- Favourites, a **Listen later** list and history, kept in the browser.
- 1 to 5 star ratings, shared by every visitor.
- Three themes (Classic, Boys, Girls) and an interface in Romanian or English.
