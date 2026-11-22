# Povesteca

Povesteca e o bibliotecă de povești audio în limba română, pentru copii și pentru părinții care le aleg. Adună teatru radiofonic și discuri de povești publicate deja pe Internet Archive și YouTube, le așază pe povești și le poți asculta direct în pagină.

Nu are conturi, reclame sau AI și nu găzduiește fișiere audio.

## Ce fel de povești găsești

Doar producții făcute ca să fie ascultate: teatru radiofonic, discuri de povești cu actori, muzică și efecte, povești spuse de un actor. Lecturile cu voce sintetică și canalele care urcă în masă înregistrări de proveniență neclară nu intră în catalog.

Acum sunt 931 de povești și 1070 de înregistrări, din 13 surse gratuite:

- [Discuri Electrecord digitizate](https://archive.org/details/romanianvinyl) (Internet Archive). Pentru fiecare disc, regia, distribuția, muzica și anul sunt luate de pe disc.
- [Biblioteca Maia Martin](https://archive.org/details/bibliotecamaiamartin) (Internet Archive)
- [Povești Audio Vinil](https://archive.org/search?query=%22Povesti+Audio+Vinil%22) (Internet Archive)
- [eTeatru (Teatrul Național Radiofonic)](https://eteatru.ro/spectacole/povesti/) (audio direct MP3)
- [Arhiva Radio România](https://radio-arhive.ro/category/emisiuni/noapte-buna-copii/3) (audio direct MP3, „Noapte bună, copii!” și Teatrul Național Radiofonic pentru Copii)
- [Arhiva deschisă Culturalia („Pe unde”)](https://mariuscomper.uk/pe-unde/) (audio direct MP3)
- [A Fost Odată](https://afostodata.ro/) (audio direct MP3, inclusiv „Români de poveste” și „Patrimoniu”)
- [Oameni mici și mari](https://podcasters.spotify.com/pod/show/oamenimicisimari) (audio direct MP3, actori clujeni)
- [Teatru Radiofonic](https://www.youtube.com/@teatruradiofonic6362) (YouTube)
- [Electrecord](https://www.youtube.com/@Electrecord-Romania) (YouTube)
- [Teatru Subtitrat](https://www.youtube.com/playlist?list=PLPr2UQwCNy3kz-JkNoXZoKXcb3K0lW34h) (YouTube)
- [Teatru pe Vinil](https://www.youtube.com/@TeatruPeVinil) (YouTube)
- [Itsy Bitsy & Leon Magdan](https://www.youtube.com/@ItsyBitsyFM) (YouTube)

O poveste poate avea mai multe înregistrări, iar pe pagina poveștii le compari după durată, tip de producție și distribuție. Micul Prinț, de exemplu, are două montări diferite. Unele detalii, cum ar fi vârsta potrivită, atmosfera sau cât de multe efecte sonore are o înregistrare, sunt estimate și apar cu semnul „≈”.

## Ce poți face

- **Cauți** după titlu, autor, personaj sau actor. Căutarea merge și fără diacritice, și cu mici greșeli de scriere.
- **Filtrezi** după gen, origine, tipul producției, voci, efecte sonore, muzică, atmosferă, vârstă, durată, autor, actor, sursă și disc sau colecție, apoi ordonezi rezultatele.
- **Pagină pentru fiecare autor**: apasă pe numele autorului pe pagina poveștii sau a înregistrării ca să îi vezi toate poveștile.
- **Asculți în pagină.** Playerul rămâne jos cât timp navighezi și ține minte unde ai rămas.
- **„Surprinde-mă!”** alege o poveste la întâmplare, potrivită filtrelor tale.
- **Noapte bună**: ecran întunecat și temporizator de 10, 20 sau 30 de minute sau până la finalul poveștii. Nu pornește singur povestea următoare.
- **Ale mele**: favorite, lista „De ascultat” și istoricul.
- **Voturi** de la 1 la 5 stele, comune tuturor vizitatorilor.
- **Trei teme** (Clasică, Băieți, Fete), care schimbă și culorile, și așezarea paginii. Fiecare are o variantă întunecată, care pornește singură când dispozitivul e pe modul întunecat sau când folosești Dark Reader.
- **Surse**: o pagină cu arhivele și canalele de unde vin înregistrările și cu regulile catalogului.

Interfața e în română sau în engleză. Titlurile, numele și înregistrările rămân în română.

Ce s-a schimbat de la o versiune la alta e în [CHANGELOG.md](CHANGELOG.md) (în engleză, [CHANGELOG.en.md](CHANGELOG.en.md)). Aceeași listă apare în aplicație, la „Noutăți”, în subsolul paginii.

## Cum funcționează redarea

| Sursa | Ce merge |
|---|---|
| Internet Archive & Audio direct | Redare directă din fișier MP3/MP4: pauză, derulare, poziția salvată, controale pe ecranul blocat, temporizator cu stingere treptată. |
| YouTube | Playerul oficial YouTube, vizibil în pagină: pauză, derulare, poziția salvată, temporizator. Pe telefon, YouTube se oprește când blochezi ecranul. E regula lor și aplicația n-o ocolește. |
| Altă sursă | Buton „Deschide la sursă”. |

Dacă un link nu mai pornește, playerul încearcă alt link al aceleiași înregistrări. Când nu mai are niciunul, arată butonul spre sursă.

## Ce date se păstrează

- Favoritele, istoricul, poziția din fiecare poveste, filtrele, tema și limba stau doar în browserul tău. Nu sunt trimise nicăieri și dispar dacă ștergi datele site-ului.
- Pentru voturi se păstrează doar suma și numărul lor pentru fiecare înregistrare. Ca să limiteze voturile repetate, serverul ține un hash al IP-ului, care se șterge singur după cel mult 24 de ore.
- Nu există conturi, cookie-uri proprii sau statistici de trafic.
- Pagina încarcă fonturile de la Google Fonts, iar copertele, sunetul și playerul video de la Internet Archive și YouTube.

## Voturi

Ordinea după voturi folosește o medie ponderată, ca un singur vot de 5 să nu treacă înaintea multor voturi de 4. Poți vota aceeași înregistrare o dată la 24 de ore și poți da un vot la 20 de minute. Fără conturi, limitele opresc abuzurile obișnuite, nu pe cineva hotărât să voteze de pe mai multe rețele.

## Propune o poveste

Știi o înregistrare bună care lipsește, sau ai dat de un link care nu mai merge? Deschide un [issue](../../issues) cu linkul.

Dacă vrei s-o adaugi tu, nu trebuie să modifici nicio pagină. Catalogul e format din patru fișiere JSON în `catalog/`:

| Fișier | Ce ține |
|---|---|
| `stories.json` | povestea propriu-zisă: titlu, autor, rezumat, personaje, teme |
| `versions.json` | o înregistrare anume a unei povești: linkuri, durată, distribuție, tip, vârstă |
| `sources.json` | de unde vin înregistrările (o colecție, un canal) |
| `collections.json` | discuri, serii sau playlisturi, cu ordinea lor |

O poveste nouă, cu o înregistrare de pe Internet Archive:

```jsonc
// stories.json
{ "id": "ursul-pacalit", "title": "Ursul păcălit de vulpe", "author": "Ion Creangă", "genre": "basm",
  "themes": ["animale", "istetime"], "characters": ["Vulpea", "Ursul"],
  "summary": { "ro": "…", "en": "…" } }

// versions.json
{ "id": "ursul-pacalit-disc", "storyId": "ursul-pacalit", "title": "Ursul păcălit de vulpe, regia …",
  "sourceId": "arhiva-discuri-electrecord",
  "links": [
    { "type": "archive", "id": "IDENTIFICATOR_ARCHIVE", "file": "fisier.mp4" },
    { "type": "youtube", "id": "ID_VIDEO_11", "via": "numele canalului" }
  ],
  "duration": 597, "year": 1965,
  "kind": "teatru-radiofonic", "voices": "distributie", "sfx": "discrete", "music": "ambientala",
  "moods": ["amuzanta"], "age": 3,
  "credits": { "director": "…", "narrator": ["…"], "cast": [{ "role": "Vulpea", "name": "…" }] },
  "estimated": ["sfx", "moods", "age"],
  "addedAt": "2026-11-22" }
```

Reguli:

- **O producție înseamnă o singură înregistrare**, chiar dacă e urcată în mai multe locuri. Linkurile în plus merg în același `links`, iar playerul trece la următorul dacă primul nu mai merge.
- **Ce nu știi, lași gol.** Câmpurile lipsă nu apar în pagină.
- **Ce e ghicit se trece în `estimated`.** Pagina arată un „≈” lângă valoarea respectivă.
- `duration` e în secunde. `start` și `end` (tot în secunde) sunt pentru povești aflate în mijlocul unei înregistrări mai lungi.
- `quality` (1–5) arată cât de bogată e producția (distribuție, muzică, regie), nu cât de populară e. Nu apare în pagină; ajută doar la ordinea „Recomandate”.
- `"cover": false` e pentru înregistrările care n-au copertă la sursă. Fără el, archive.org arată în loc de copertă o formă de undă neagră; cu el, aplicația pune inițiala poveștii pe un fundal colorat.
- Valorile permise pentru `kind`, `voices`, `sfx`, `music`, `moods` și `genre` sunt în `scripts/check-catalog.js`.

Numele fișierului audio și durata unei înregistrări de pe archive.org le găsești la `https://archive.org/metadata/IDENTIFICATOR` (câmpul `length`). Înainte să trimiți un pull request, rulează `npm run check`: verifică legăturile dintre fișiere, valorile permise și linkurile care apar la două înregistrări.

## Rulare locală

Ai nevoie de Node.js 20.19 sau mai nou.

```bash
npm install
npm run dev     # pornește site-ul local; voturile se țin în memorie
npm run check   # verifică doar catalogul
npm run build   # verifică catalogul, apoi construiește site-ul în dist/
```

## Structura codului

```
catalog/            datele (JSON)
api/ratings.js      funcția serverless pentru voturi (Redis)
scripts/            verificarea catalogului
src/data.js         indexuri, căutare, filtre, sortare
src/player.jsx      playerul (Internet Archive + YouTube), modul Noapte bună
src/pages.jsx       paginile
src/ui.jsx          carduri, butoane, iconițe
src/i18n.js         textele RO/EN
src/store.js        preferințe locale, rutare, voturi
src/styles.css      cele trei teme
```

Vite + Preact, fără alte dependențe.

## Drepturi

Povesteca nu copiază și nu găzduiește înregistrări. Trimite la paginile originale și folosește playerele publice ale platformelor. Dacă o sursă scoate o înregistrare, ea nu mai pornește nici aici, iar linkul se scoate din catalog. Dacă deții drepturile asupra unei înregistrări și vrei să fie scoasă, deschide un issue.
