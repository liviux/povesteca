# Changelog

Every change to Povesteca, newest first. The app shows the same list under “What's new” in the page footer. The Romanian version is [CHANGELOG.md](CHANGELOG.md).

## [1.31.1] - 2026-11-25

### Changed
- Large covers (Discogs, Libsyn, CloudFront, eteatru, SRR, Radio Moldova, Radio Târgu Mureș, MiniPovești, Poveștile Cristinei) go through the resizing service; YouTube and Internet Archive covers, and people's photos, load directly from their source.
- Covers near the screen start loading earlier, so they no longer pop in late while scrolling.
- The page opens the connection to the resizing service in advance.

## [1.31.0] - 2026-11-25

### Added
- **New stories:** 4 stories and 5 recordings from Poveștile Cristinei (“Mi-e dor de tine” with Florin Coșuleț, “În căutarea lui Moș Nicolae” with Daniel Nițoiu, “Armăsarul nărăvaș” with Florin Busuioc, and “O girafă în spațiu” in two readings, with Flaviu Crișan and Teo Trandafir).
- Backup YouTube link for “Povestea Pufosului Mititel Întunecat”, plus Wikipedia and Goodreads links for Sorin Misirianțu, Bianca Mereuță and Serenela Mureșan.

### Fixed
- Separated “Călătorie în țara jucăriilor” (by Cristian Mitescu) into its own story instead of linking it under “The Nutcracker”, and completed Culturalia credits for 8 recordings.
- Added Romanian and English labels for the Armenian origin and all previously untranslated story themes in the catalogue.

## [1.30.0] - 2026-11-25

### Added
- **New stories:** 27 stories and 47 recordings from five new sources: Sidonia Drăgușanu’s stories read on the radio by Rodica Mandache, Radio România Actualități’s “Poveștile de vineri seara” series, original bedtime stories told by actor Viorel Ionescu, Nekta Ioana Dedu’s fairy tales and Radio Zalău’s evening stories.
- Portraits and Wikipedia links for Clara Cernat and Gabriela Dancău, plus voice credits for the new recordings.

### Changed
- Listened to the new recordings and noted each one’s age, characters, mood and quality. The Radio România Actualități episodes play directly from the radio archive; the rest play from YouTube.

## [1.29.0] - 2026-11-25

### Changed
- Covers and portraits load much faster: they are resized before they reach the page, and only the ones near the screen are fetched instead of a whole shelf.
- Story and recording pages appear immediately; the summary, cast and photos fill in right after.
- The catalogue loads asynchronously, and summaries arrive only in the language you are reading.
- Search starts after you stop typing and answers faster; the long filter lists are no longer sorted on the phone.
- Fonts are trimmed to the letters in use, so less is downloaded.
- Radio Moldova streams use a smaller HLS player build.
- Covers and portraits pass through `wsrv.nl` to be resized; Povesteca keeps no copy, and the README explains what data goes there.

### Added
- `robots.txt` and `sitemap.xml` for search engines.
- Link previews now carry the full image address.

## [1.28.0] - 2026-11-25

### Added
- Recordings without a picture now get a cover drawn on the spot, with the story's title on it: hills, sunbursts, waves, rainbows, night skies and more, in colours that go together. Every visit brings new drawings.

## [1.27.0] - 2026-11-25

### Added
- **New stories:** 28 stories from Radio România Târgu Mureș, Culturalia, MiniPovești and Povestile Cristinei, plus one more production each of “Lupul Pârcălab” and “The Nutcracker”.

### Fixed
- Fixed sideways scrolling in the Cosmos theme on narrow phones.

## [1.26.0] - 2026-11-25

### Added
- **New stories:** 6 stories and 8 recordings from the State Jewish Theatre (“Mărțișor” by Sadoveanu, “Papagalul” by Isaac Bashevis Singer, “Ursul păcălit de vulpe” and a second reading of “Povestea jucăușă”) and Baia Mare Municipal Theatre (“Polul Nord” by Marin Sorescu, Florence Holbrook’s “Poveste de Crăciun”, “Atelierul de jucării al lui Moș Crăciun” and “Mickey Mouse și corespondența de Crăciun”).
- Added Wikipedia links, Goodreads pages and portraits for Isaac Bashevis Singer, Marin Sorescu and Florence Holbrook.

### Fixed
- Checked all 741 YouTube links in the catalogue via the YouTube API: removed 5 truncated, mismatched or unlisted secondary mirrors where full sources remain, and filled in verified years and credits for 4 recordings and 2 stories.

### Removed
- **Removed stories:** “Povestea celor trei copăcei” (Itsy Bitsy) was removed as a Christian religious retelling.

## [1.25.5] - 2026-11-25

### Changed
- Checked all three new 1.25.0 sources (State Jewish Theatre, Arlechino Brașov and Baia Mare Municipal Theatre) for more stories and added author Petre Crăciun’s Goodreads link.

## [1.25.4] - 2026-11-25

### Changed
- Audited all 40 recordings added in 1.25.0 (all follow the catalogue rules and play properly) and filled in verified summaries, characters, themes, years, moods and ages for 18 of the new stories, plus the Wikipedia link for “Pasărea de aur”.

### Fixed
- Removed 11 previously deleted stories from the manual Wikipedia link list.

## [1.25.3] - 2026-11-25

### Added
- “What's new” now has a button that reloads the page when the list didn't load.

### Fixed
- On narrow phones, “What's new” no longer spills off the side of the screen.

## [1.25.2] - 2026-11-25

### Changed
- The note above the YouTube window now says stories pause when you minimise the app, and it only shows on phones and tablets.

## [1.25.1] - 2026-11-25

### Added
- A short note above the YouTube window now says YouTube stories pause if you leave the app.

## [1.25.0] - 2026-11-25

### Added
- **New stories:** 32 stories and 40 recordings from three new sources: “Regatul poveștilor”, stories by Petre Crăciun read by actors of the State Jewish Theatre (Maia Morgenstern among them), “O după-amiază de poveste” from the Arlechino Theatre in Brașov and “Povești la gura sobei” from the Baia Mare Municipal Theatre.

## [1.24.6] - 2026-11-24

### Fixed
- When you close the player, the filter panel in “Explore” reaches the bottom again right away, without scrolling.

## [1.24.5] - 2026-11-24

### Fixed
- In the Stickers theme, the big stickers on the shelves no longer have an empty band under the text: the picture grows to fill them.

## [1.24.4] - 2026-11-24

### Added
- In “What's new”, releases that removed stories from the catalog now carry a “Removed stories” label, just as those with new stories carry “New stories”.

### Fixed
- On a computer with the player open, the last filters in “Explore” no longer hide under the player before you scroll the page.

## [1.24.3] - 2026-11-24

### Fixed
- “Darul spiridușilor” has its own page again. It's a different Brothers Grimm tale from “Spiridușii”, the one with the shoemaker.
- “Zeii din Olimp – Poseidon” now lists the episode's own cast from eTeatru, not the whole series.

## [1.24.2] - 2026-11-24

### Changed
- Ages, production type, sound effects, music, themes, characters and credits were checked and updated for hundreds of stories and recordings, by listening to them and comparing with the sources.
- Six stories that were filed under the wrong title now have their own page, and stories inside multi-story recordings start and stop at the right moment.

### Fixed
- Corrected casts: “Vulpea albă” now lists its own actors instead of those from “Ochii mamei”, and the narrator of “Fata din dafin” is Dinu Ianculescu.

### Removed
- **Removed stories:** Removed 129 recordings that aren't stories for children up to 10: the “Români de poveste” and “Patrimoniu” documentaries, biographies, educational lessons, productions for older children and duplicates.

## [1.24.1] - 2026-11-24

### Changed
- Clearer rule: no recording with AI-generated voices joins the catalogue, not even for a single character in an otherwise human-acted production.

## [1.24.0] - 2026-11-24

### Added
- “What's new” now shows next to its title how many changes the app has had so far, for example “What's new (54 changes)”.

## [1.23.2] - 2026-11-24

### Fixed
- Under “Cast” on a recording page, the box with the director, narrator and the rest no longer shows up empty when the recording only lists actors, and the actor list no longer shows when it only has a director or narrator.

## [1.23.1] - 2026-11-24

### Removed
- The big logo above the title on the home page, in every theme: the logo showed twice, once in the menu at the top and again right below it.

## [1.23.0] - 2026-11-24

### Added
- Ten new playful themes for children that change not only the colours but where things sit on the page: Clay, Notebook, Gallery, Playbill, Map, Space, Jelly, Vinyl, Paper and Stickers.
- In Jelly the menu sits at the bottom, like in an app; in Space it is a column on the left; in Playbill the stories are a numbered programme, in Map a trail, and in Vinyl the record slides out of its sleeve and turns while you listen.

### Changed
- In the “Theme” menu the themes sit in two columns, and the language switch comes last, after a line.

### Removed
- The Boys and Girls themes. Anyone who had picked one now sees the Classic theme.

## [1.22.1] - 2026-11-24

### Changed
- For stories played from YouTube, the video now sits in a small 200×200 square on the right, above the player. On phones it no longer takes the full width of the screen, and on computers it is smaller than before.

## [1.22.0] - 2026-11-24

### Removed
- The “Listen later” button on recordings and the “Listen later” list in “My stuff”. To keep something, add it to your favourites with “Save”.

### Fixed
- The “Listen” button is back on a story's page. Version 1.21.2 had removed it by mistake.

## [1.21.2] - 2026-11-24

### Added
- In the page footer, on the right: “Contact/feedback - liviu.ovh”, linking to the author's site.

### Removed
- The “Listen” button on a story's page. “Save” stays there, and every recording in the list still has its own “Listen” button.

## [1.21.1] - 2026-11-24

### Removed
- **Removed stories:** The “Legendele Dobrogei” source and its 9 remaining legends: they were made for a general audience, not for children.

## [1.21.0] - 2026-11-24

### Added
- Stories with several authors show each of them separately, with their own page, such as Sanda Socoliuc and Vasile Socoliuc, or Charles and Mary Lamb.
- 70 stories that had no summary now have one, written after listening to the recording.

### Changed
- The catalog is for children up to 10: the age filter stops at 10, and recommended ages were checked against the source and the content (51 corrected).
- A source needs at least 5 recordings. “Teatru Subtitrat” was left with 4 and is gone.

### Removed
- **Removed stories:** Deeply religious stories: those about Jesus, the Nativity, saints or other faiths (28 stories).
- **Removed stories:** Stories that turned out to be for older children or adults after checking, such as “Hanul Ancuței”, “Luceafărul”, “Călin (file din poveste)”, “Cocoșatul de la Notre-Dame” and “Meșterul Manole”.
- **Removed stories:** Recordings that no longer started in the player: 14 YouTube videos that can't be played on other sites any more, and 14 LaTimp files their site no longer serves to other sites.

### Fixed
- 5 recordings entered twice and 2 duplicated stories (“Feciorul cel vrednic” is “Zâna Zorilor”, for example) are now one each.
- 248 cast roles now have their diacritics, and a few titles and authors were corrected.
- “Mărășești” is back: it comes from a record made for third graders.

## [1.20.2] - 2026-11-23

### Fixed
- On a phone in “Desktop site” mode, or with the page zoomed in with two fingers, the player now stays at the bottom of the screen at its usual size instead of disappearing or moving around.

## [1.20.1] - 2026-11-23

### Removed
- **Removed stories:** Removed 48 stories that weren't right for children: satire and comedy for adults, stories about suicide, murder or infidelity, the harshest Dobruja legends, and 3g RadioActiv's eight 13+ monologues.
- The 3g RadioActiv and Teatrul Stela Popescu sources are gone, since they were left with three recordings or fewer.

### Fixed
- Merged 13 stories that were the same tale under another title, such as “Spiridușii” and “Darul spiridușilor” or “Rapunzel” and “Sălățica”.
- The same actor no longer shows up under two spellings (Florian Pittiș and Florian Pitis, for example), and “X and others” is no longer treated as one name.
- Some darker recordings, such as “Barbă Albastră”, “Oliver Twist” and “Hanul Ancuței”, now have a higher recommended age.
- Corrected titles, including “Cei trei mușchetari” and “Penelul fermecat”.

## [1.20.0] - 2026-11-23

### Added
- The “Surprise me!” button is now in the top bar and in the player too: it starts a random story from the whole catalog.

### Changed
- The language button (RO/EN) moved into the “Theme” menu.

## [1.19.2] - 2026-11-23

### Removed
- **Removed stories:** Removed LibriVox’s 16 English recordings, the source, and the nine stories with no other recordings.

## [1.19.1] - 2026-11-23

### Fixed
- The app loads when a recording has no known mood; unknown metadata no longer appears as empty rows.
- Estimated classifications on new recordings now show “≈”.
- Summaries, themes and characters were filled in where sources confirmed them.

## [1.19.0] - 2026-11-23

### Added
- **New stories:** 71 stories and 93 recordings from Gong, Culturalia, LaTimp.eu, Povești Alese, MiniPovești, LibriVox, Teatru pe Vinil, Teatrul Colibri, Teatrul Stela Popescu and Internet Archive.
- 111 verified links were added to existing recordings.

### Removed
- **Removed stories:** Sources with fewer than three recordings were removed, along with the three recordings found only there.

## [1.18.0] - 2026-11-23

### Added
- New length filter: “under 6 min”. The “under 15 min” option is now “6–15 min”.

## [1.17.0] - 2026-11-23

### Changed
- The app starts faster. On an average phone the home page shows up almost a third sooner, and after an app update it downloads ten times less, because the story list stays saved in the browser.
- Search keeps up with every letter you type, typos included. Before, a single letter could take almost a second.
- Fonts now come from the Povesteca site itself, not from Google. The page no longer waits on another site, and Google no longer learns who visits. The letters look the same.

## [1.16.1] - 2026-11-23

### Added
- New freely licensed photos for nine authors, actors and musicians in the catalog, each with credit, license and source link on the person's page.

### Changed
- Besides the Creative Commons licenses we already accepted, photos can now also come under the Public Domain Mark, GFDL, Free Art License or Open Government Licence.

## [1.16.0] - 2026-11-23

### Added
- **New stories:** 35 actor-performed stories from Radio Romania’s archive on LaTimp.eu and the 3g HUB series “It Happened on a Thursday” (8 plays).
- 3g HUB recordings now include a sound design credit.

### Removed
- **Removed stories:** Removed the seven inCAP recordings that could only be played on SoundCloud.

## [1.15.7] - 2026-11-23

### Fixed
- All 19 “Cutiuța cu povești” stories now have real summaries, and the recordings have their direction, music and roles filled in from the record; “Fiii Soarelui” has the correct year, 2005.

## [1.15.6] - 2026-11-23

### Changed
- On recording pages, the current rating and the “How was it?” star picker now sit on the same line on wider screens.

## [1.15.5] - 2026-11-23

### Changed
- Internet Archive is no longer the default source when a recording is also available as direct audio or on YouTube; studio sources play first and Internet Archive stays as a fallback.
- When a story has several recordings of the same quality, direct audio and YouTube versions now come ahead of Internet Archive ones.

### Removed
- Removed the “Playback” row and the YouTube lock-screen note from recording pages.

## [1.15.4] - 2026-11-23

### Fixed
- Three characters from the “Alma” recording (Metina, Licia, Khan) added to the story page.

 - 2026-11-23

### Changed
- Metadata was checked story by story and recording by recording: 688 summaries, 652 character lists, 358 story years, 286 recording years and 369 cast and director credits filled in or corrected.
- 350 recordings got the cover of the original record or video.
- New origins in the filters: Slovak, Dutch, Welsh, Brazilian, Latvian, Slovenian, Austrian, Cypriot, Mexican, Croatian and Australian.

### Fixed
- Wrong years (“Fram, ursul polar” 1932, “Sarea în bucate” 1887, “Scufița Roșie” 1961, “Palatul de cleștar” 1884), reissue years mistaken for the production year, and segment lengths.
- Dead links and one YouTube link that played a different production.
- “Cei doi prieteni” was merged into “Prietenul devotat”, and “Câtă muncă adunată!” into the record version.
- “Povestea lui Moș Crăciun” (1994, by Maria Ioana Vasiloiu) was split from the A Fost Odată adaptation.

## [1.15.2] - 2026-11-23

### Changed
- The player's “Other source” and speed lists, “Order” and the “Age” filter now open in the theme's colours, like the filter lists, instead of the phone's standard list.

## [1.15.1] - 2026-11-23

### Changed
- On phones, the player's seek bar now spans the whole row, left to right, with the buttons below it. Jumping to the exact spot in a story is easier.

## [1.15.0] - 2026-11-23

### Added
- You can now favourite **people** (authors, actors, directors), **sources** and **records or series** too, with the heart on their page. They show up in **My stuff** next to your saved stories and recordings. Everything stays in your browser, with no account.
- In **My stuff**, **Surprise me from favourites** plays a random recording from everything you favourited.

### Changed
- 185 stories got real summaries, written from the source's description or the story's text. Summaries copied from YouTube (“I have no intent to sell…”) and placeholders like “Story: “Title”.” are gone. Where nobody knows what a story is about, its page shows no summary at all.
- Summaries that lacked Romanian diacritics have them now.
- 21 collections and records got a description.

### Fixed
- “Moșneagul și merii” (record) showed a length of 26 seconds. It now shows 4 minutes, the length of the recording.
- The origin of Romani stories now reads “rromă” in Romanian instead of “romani”.

## [1.14.0] - 2026-11-23

### Added
- **New stories:** 40 titles and 42 recordings, including all 20 radio plays in “Legendele Dobrogei”, the first three episodes of “The Adventures of Jonathan Gullible”, and the “Prezent! REscris” series.
- “Prințesa Curcubeu”, “Muntele de sticlă”, “Broscoiul” and other radio plays, plus backup links for “Muck cel mic” and “Aventura Căpitanului Vic”.

### Changed
- Stories on SoundCloud open on the source website through the “Open at source” button.

## [1.13.1] - 2026-11-23

### Added
- Expanded Wikipedia and Goodreads links across stories, authors, and cast and crew: 296 stories now link to Wikipedia (up from 68), 373 link to Goodreads (up from 29), 553 people link to Wikipedia, and 202 authors link to Goodreads.
- 117 new permissively licensed portraits for authors, actors, and directors (405 people with photos in total), sourced from Wikimedia Commons, the Romanian National Film Archive (Culturalia), and Flickr, each credited with author, license, and source link at the bottom of the person's page.

### Changed
- Person pages now display each photo's actual source (Wikimedia Commons, Culturalia, Flickr, and others) with localized license labels, and hide broken external images gracefully.

### Fixed
- Removed wrong Wikidata matches (such as *Dumitru Petrescu* and *Alexandru Minculescu*) and aligned Wikipedia links to Romanian for Romanians and Romanian stories and English for everyone else.

## [1.13.0] - 2026-11-23

### Added
- **New stories:** 85 recordings from **Radio Moldova's Golden Archive (Teleradio-Moldova)** — 25 full children's radio plays (*Teatru la microfon*, including *The Adventures of Tom Sawyer*, *The Mysterious Island*, *Pippi Longstocking*, *The Little Witch*, *Thumbelina / Crăița Florilor*, *Apolodor*, and *Mowgli*) and 60 short bedtime stories from *Povestea de seară* (Spiridon Vangheli's *Guguță* tales, Grigore Vieru, Ion Druță, Ion Creangă, the Brothers Grimm, Gianni Rodari, Dumitru Matcovschi, Nicolae Dabija, Aureliu Busuioc, and folk tales).
- Direct in-page playback for HLS (`.m3u8`) audio streams, so Radio Moldova recordings play right in the app with seeking, speed control and sleep timer, without ads.
- Five new collections (*Radio Moldova – Teatru la microfon pentru copii*, *Radio Moldova – Povestea de seară*, *Baba Dochia – Trei legende românești*, Electrecord record `EXC 401`, and *Povestiri din provincia de altădată*), plus new Wikidata photos and links for the added authors and actors.

### Changed
- Split direct-audio recordings that bundled several stories into separate stories that start and stop automatically at the right timestamp: the three *Baba Dochia* legends (*Fata de împărat*, *Soacra și nora*, *Lâna albă*, with individual YouTube backups for the first two and Vasile Manta credited as director), Leo Tolstoy's four stories on record `EXC 401` (*Un singur fiu*, *Ceașca spartă*, *Bunicul și nepotul*, *Moșneagul și merii*), and Ion Agârbiceanu's two radio sketches (*Milionul* and *Cum ne înșelăm*).

### Fixed
- Stories located in the middle of a longer recording now reliably jump to their start timestamp, show their own duration and progress bar, and display accurate resume times in “Resume from…” and the listening history.

## [1.12.2] - 2026-11-23

### Changed
- On a story page, the characters and the genre can be tapped, like the origin and the themes: they open **Browse** with every story that has the same character or genre.
- On a recording page, the production type, performance, music, sound effects and mood can be tapped too.

### Fixed
- The pages of some new collections (such as *MiniREACTOR & Radio Cluj* or *Aventurile lui Pippin cel Curios*) stayed blank. They open now.

## [1.12.1] - 2026-11-23

### Fixed
- **Surprise me!** on the home page now picks from every story. It used to apply, without showing it, the last filters chosen in **Browse**, so it kept landing on the same few.
- Every story has the same chance, however many recordings it has, and none comes back until all the others have had their turn. Stories you already heard come last.

## [1.12.0] - 2026-11-23

### Added
- A **Cast and crew** filter in **Browse**: pick an actor, a narrator, a director or the composer and see only the recordings they worked on. Each name shows how many recordings it appears on.

### Changed
- Very long filter lists show the first 300 names, so they open quickly on phones too. Type a few letters to find the rest.

## [1.11.0] - 2026-11-23

### Added
- **New stories:** 43 stories and 56 recordings from five new sources of radio plays and acted audio stories — **MiniREACTOR & Radio Cluj** (6 contemporary children's radio plays directed by Selma Dragoș), **Colibri Theatre Craiova** (6 radio drama adaptations by Adriana Ioncu), **Asociația Arteka** (*Aventura Căpitanului Vic în Lumea Reală* and *Hermann*, direct MP3), **Cutiuța cu povești & Povești ascultătoare** (albums featuring Florin Piersic, Daniela Nane, Florin Piersic Jr., Iurie Darie, Anca Pandrea and Damian Victor Oancea), and **Pippin cel Curios** (11 acted cultural-heritage audio stories).
- Selma Dragoș's radio play *Fereastra care n-avea somn* (directed by Mihnea Chelaru, 2025) from **eTeatru**, and the radio drama *Un Paște fericit!* (with Ruxandra Sireteanu, Marius Rizea and Mircea Constantinescu).
- Seven new collections for the newly added series and albums, plus Wikidata photos and links for the newly added actors and authors.

### Changed
- Added backup YouTube mirrors for *Papuciada*, *Țugulea* and *Legenda ouălor roșii* (also updated with its 1993 year and full cast).

## [1.10.1] - 2026-11-23

### Changed
- The **Sources** page shows at the top how many sources there are in total, and how many stories and recordings they hold together.
- On phones, the totals under titles no longer break between the number and the word.

## [1.10.0] - 2026-11-23

### Added
- Every name in the filter lists shows how many there are: how many stories an author or a character has, how many recordings a source or a record has.
- A source's page shows at the top how many stories and recordings it has.
- Stories with more than one recording show how many on their card.
- Section headings show how many items they hold, like **Recordings (175)** or **Stories (33)**, on source, collection and people pages, in **Browse** and in **My stuff**.

## [1.9.0] - 2026-11-23

### Added
- **New stories:** individual tracks from Electrecord records (*Păsările de lut*, *Întoarcerea cerbilor*, *Oglinda năzdrăvană*, *Alma*, *Voinicul Bob de Grâu*, *Marele duel Volta–Galvani*, *Iarnă ca-n poveste*, *O pățanie cu un toc*, *Guturaiul*, *Câtă muncă adunată!*, *Cri-Cri*, *Rodica Lăcomica*, *O întâmplare în pădure*, *Toomai și elefanții* and the Brothers Grimm's *Fata moșului cea cuminte și harnică*), replacing long files that concatenated several stories.
- Reader credits for **A Fost Odată** (~170 recordings), full casts for multi-part **eTeatru** productions (*Cărțile de lut*, *Tabloul cel viu*, *Ileana Cosânzeana și Ionică Făt-Frumos*, *Andilandi*), and missing authors, directors and adapters across sources.

### Changed
- Recordings that bundled several stories on one tape (*Recitindu-l pe Creangă*, *Poveștile Șeherezadei*, *Povești despre Iisus*, *Ciocănituri în fereastră și O veveriță care zboară*) are now split by story, and the player shows and plays only the chosen story's span.
- The 11 bedtime stories read by **Elena Pop** from the *Radio România Archive* now carry each story's real title, author and recording year (*Cine le va găsi?*, *Cocoșelul Timotei*, *Pricoliciul Alandala*, *Spiridușul*, *Fluturele*, *Fetița din ploaie*, *O poveste de necrezut*, *Ciobul de sticlă*, *Deochiatul*, *Pescarul*, *O faptă bună*).
- Duplicate stories and duplicate recordings across sources have been merged into single entries with multiple links, and actor, director and author names have been unified.

### Fixed
- Swapped cast lists between *David Copperfield* (1954) and *Oliver Twist* (1954), and mis-grouped links in *Punguța cu doi bani* (1963 / 2003), *Povestea unui om leneș* and *Amintiri din copilărie* (chapters 1 and 2).

### Removed
- **Removed stories:** Three AI-voiced recordings and two amateur recordings that did not meet the catalog rules.

## [1.8.0] - 2026-11-23

### Added
- A **character** filter in **Browse**: the Wolf, the Goat, Harap-Alb and the rest.
- A **Show** filter, with **Stories** or **Recordings**, for when you only want one of them.
- In the long lists in the filters (author, character, source, record, origin) you can type a few letters and only the matching names stay: “ion” keeps Ion Creangă, Ion Luca Caragiale and every other Ion.

### Changed
- **Browse** shows the stories first, then the recordings. Search for “capra” and you see the story first, with all its recordings below.
- The lists in the filters use the colours of your theme instead of the browser's plain list.
- The player's **Other source** button opens the list of sources, so you can pick the one you want instead of stepping through them one by one.
- In the Boys theme, **Browse** results sit in two columns next to the filters, so titles have room.

## [1.7.0] - 2026-11-23

### Added
- **Browse** has a **Random** order.

### Changed
- **Browse** now opens with the recordings shuffled, in a different order on every visit, so you keep finding something new. The order stays the same while you browse, and a search still shows the best matches first.

## [1.6.1] - 2026-11-23

### Changed
- The home page says more clearly what Povesteca is: children's stories made for listening, performed by actors, with direction, music and sound effects.
- On phones, the player bar leaves room for the title. A recording's other sources are picked from its page or from **Good night**.
- When a recording has two links on the same platform, their buttons are numbered (“Internet Archive 1”, “Internet Archive 2”).

### Fixed
- On a story page, labels such as **Origin** and **What it's about** now sit on the same line as their values.
- In the Girls theme, a row of stories that isn't full is centred, and the icons on recordings line up with the text.
- The icon next to the actors' names sits by the first line, not in the middle of the list.
- Source buttons and **Other source** are easier to tap with a finger.
- On 360 px phones, **Browse** and **Good night** fit on one line.

## [1.6.0] - 2026-11-23

### Added
- **Playback speed** in the player: the “1×” button next to the moon changes the speed from 0.5× to 2× in quarter steps. It works on YouTube and on audio files, and the chosen speed carries over to the next story.

### Changed
- On phones, the player's “Other source” button is shorter, so it fits next to the speed.

## [1.5.1] - 2026-11-23

### Changed
- On the home page, the **For tonight**, **Radio plays**, **Big casts** and **Short stories** shelves show different stories on every visit, picked at random. They stay the same while you move around the site, so you can find them again when you come back.

## [1.5.0] - 2026-11-23

### Added
- **New stories:** the catalogue grows to 1,178 stories and 1,452 recordings from 19 free sources. Six new sources join — Puck Puppet Theatre Cluj-Napoca, Gong Theatre Sibiu (including the Creangă and Petre Ispirescu radio trilogies and winter stories told by Marian Râlea), Somnoroși (the free episodes narrated by Mihaela Tatu), Comic Opera for Children (*Povești cu Bubu*), Ion Creangă Theatre and the Ady Magdici radio drama archive — alongside new additions on eTeatru, Radio România Archive, A Fost Odată, Oameni mici și mari, Teatru Radiofonic, Teatru pe Vinil, Teatru Subtitrat and Electrecord.
- 19 new collections (including *Harap-Alb* and *A Christmas Carol* from Puck Theatre, Gong Theatre's series, *Hanul Ancuței*, *Povești cu Bubu* and Ion Creangă Theatre's series).
- More person pages and book links with freely licensed photos, Wikipedia and Goodreads entries for the new casts, authors and stories.

### Changed
- Added 176 backup mirrors for existing recordings (including official Electrecord YouTube uploads), always keeping the direct ad-free audio link first so stories keep playing if one link goes down.

### Fixed
- Merged 32 duplicate stories and 28 duplicate recordings while keeping every working link, and cleaned up misattributed authors, origins, diacritics and scraped text in summaries.
- Unified actor and author names that appeared under slightly different spellings so each person has a single page.
- Fixed the broken links to Itsy Bitsy and Radio România Archive on the **Sources** page.

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
