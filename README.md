# Povesteca

Bibliotecă de povești audio în limba română, pentru copii și pentru părinții care le aleg. Adună teatru radiofonic și discuri de povești publicate deja pe Internet Archive și YouTube, le ordonează pe povești și lasă copilul să asculte direct în pagină.

Aplicația nu găzduiește fișiere audio, nu are conturi și nu folosește AI. Favoritele, istoricul și preferințele stau în browserul fiecăruia.

## Ce conține acum

- 62 de povești și 73 de înregistrări reale. Pentru fiecare link am verificat că există și că se poate reda în altă pagină.
- Sursa principală: colecția „Romanian Vinyl” de pe Internet Archive, cu discuri Electrecord digitizate. Fiecare fișă vine cu regia, distribuția, muzica, anul și codul discului, așa cum sunt trecute pe disc.
- Câteva producții de teatru radiofonic de pe YouTube (canalele „Teatru Radiofonic” și Electrecord), mai ales acolo unde o poveste are și o altă montare.
- 10 discuri cu câte două povești, păstrate ca „colecții”, în ordinea de pe disc.

## Rulare locală

Ai nevoie de Node.js 20 sau mai nou.

```bash
npm install
npm run dev        # http://localhost:5173, cu voturi ținute în memorie
npm run build      # verifică catalogul, apoi construiește în dist/
npm run check      # doar verificarea catalogului
```

## Publicare pe Vercel

1. Pune proiectul într-un repository GitHub.
2. În Vercel: **Add New → Project**, alege repository-ul. Vercel recunoaște Vite singur (build `npm run build`, output `dist`).
3. Pentru voturi: în proiectul Vercel, **Storage → Create / Connect → Upstash for Redis** (planul gratuit ajunge). Integrarea adaugă singură `KV_REST_API_URL` și `KV_REST_API_TOKEN`. Apoi un **Redeploy**.
4. Opțional, `RATING_SALT`: un text oarecare, folosit la amestecarea IP-urilor înainte de salvare.

Fără Redis, site-ul merge normal; doar zona de vot afișează „Voturile nu merg acum”.

## Cum adaugi povești

Catalogul e format din patru fișiere JSON în `catalog/`. Nu trebuie modificată nicio pagină.

| Fișier | Ce ține |
|---|---|
| `stories.json` | povestea propriu-zisă: titlu, autor, rezumat, personaje, teme |
| `versions.json` | o înregistrare anume a unei povești: linkuri, durată, distribuție, tip, vârstă |
| `sources.json` | de unde vin înregistrările (o colecție, un canal) |
| `collections.json` | discuri, serii sau playlisturi, cu ordinea lor |

O poveste nouă cu o înregistrare de pe Internet Archive:

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

- **O producție = o înregistrare**, chiar dacă e urcată în mai multe locuri. Linkurile în plus merg în același `links`. Playerul îl încearcă pe următorul dacă primul nu mai merge. `npm run check` oprește build-ul dacă același fișier sau video apare la două înregistrări.
- **Ce nu știi, lași gol.** Câmpurile lipsă nu apar în pagină.
- **Ce e ghicit se trece în `estimated`.** Pagina arată un „≈” lângă valoarea respectivă.
- `duration` e în secunde. `start` și `end` (tot în secunde) sunt pentru povești aflate în mijlocul unei înregistrări mai lungi.
- `quality` (1–5) e o estimare a cât de bogată e producția (distribuție, muzică, regie), nu a popularității. În catalogul actual e calculată din fișa discului și marcată estimată.
- Valorile permise pentru `kind`, `voices`, `sfx`, `music`, `moods`, `genre` sunt în `scripts/check-catalog.js`.

Pentru o înregistrare de pe archive.org, `https://archive.org/metadata/IDENTIFICATOR` dă numele fișierului audio și durata (`length`).

## Cum funcționează redarea

| Sursa | Ce merge |
|---|---|
| Internet Archive | Redare directă din fișier: pauză, derulare, poziția salvată, controale pe ecranul blocat, temporizator cu stingere treptată. |
| YouTube | Playerul oficial YouTube, vizibil în pagină: pauză, derulare, poziția salvată, temporizator. Pe telefon, YouTube se oprește când blochezi ecranul; asta e regula lor și nu încercăm s-o ocolim. |
| Altceva | Buton „Deschide la sursă”. |

Dacă un link nu mai pornește, playerul trece la următorul link al aceleiași înregistrări, iar dacă nu mai are niciunul arată butonul spre sursă.

Modul „Noapte bună” are ecran închis la culoare, temporizator de 10, 20 sau 30 de minute, oprire la final și o listă de povești liniștite. Nu pornește singur povestea următoare.

## Voturi

Note de la 1 la 5 pentru fiecare înregistrare, comune tuturor vizitatorilor și păstrate în Redis. Ordonarea folosește o medie ponderată, ca un singur vot de 5 să nu treacă peste multe voturi de 4.

Limite: un vot pe aceeași înregistrare în 24 de ore și un vot la 20 de minute, după IP (salvat doar ca hash) și după browser. Fără conturi, cine vrea neapărat poate vota de mai multe ori schimbând rețeaua; limitele opresc doar abuzurile obișnuite.

## Teme și limbă

Trei teme, alese din butonul „Temă”: Clasică (culorile logo-ului), Băieți și Fete. Diferă și culorile, și așezarea: rafturi orizontale, carduri pe rând cu coperta în stânga, sau grilă cu carduri mari și antet centrat.

Interfața e în română sau engleză (butonul EN/RO). Titlurile, numele și înregistrările rămân în română.

## Structura codului

```
catalog/            datele (JSON)
api/ratings.js      funcția Vercel pentru voturi
scripts/            verificarea catalogului
src/data.js         indexuri, căutare, filtre, sortare
src/player.jsx      playerul (archive + YouTube), modul Noapte bună
src/pages.jsx       paginile
src/ui.jsx          carduri, butoane, iconițe
src/i18n.js         textele RO/EN
src/store.js        preferințe locale, rutare, voturi
src/styles.css      cele trei teme
```

Stack: Vite + Preact, fără alte dependențe.

## Drepturi

Povesteca nu copiază și nu găzduiește înregistrări. Trimite la paginile originale și folosește playerele publice ale platformelor. Dacă o sursă scoate o înregistrare, ea dispare și din player; linkul se poate scoate din `versions.json`.
