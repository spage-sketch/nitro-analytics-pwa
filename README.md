# Nitro Anime Analytics

Lokalna PWA za analizu izvoza anime liste s MyAnimeList-a (MAL). Glavna verzija projekta nalazi se u mapi `nitro-analytics-pwa-main`.

## Pokretanje

Objavi sadržaj mape `nitro-analytics-pwa-main` na statički hosting ili posluži projekt kroz lokalni HTTP poslužitelj. Service worker i PWA instalacija traže HTTPS ili localhost; otvaranje HTML-a izravno preko `file://` ne omogućuje offline PWA funkcije.

Za lokalni pregled iz PowerShella, iz glavne mape projekta pokreni:

```powershell
py -m http.server 8000 --directory .\nitro-analytics-pwa-main
```

Zatim otvori `http://localhost:8000/`.

## Uvoz i analiza

- Podržani su MAL XML, CSV te komprimirani XML s nastavkom `.xml.gz` ako ga preglednik podržava.
- Analiza i AniList metapodaci spremaju se u IndexedDB preglednika; postojeća analiza iz `localStorage` automatski se prenosi pri prvom učitavanju. Tema ostaje u `localStorage`.
- Izvezi JSON gumbom **EXPORT JSON**, a zatim ga vrati gumbom **OBNOVI JSON**; uvoz provjerava MAL ID-jeve i prijavljuje preskočene zapise.
- **Shadow Fetch** AniListu šalje MAL ID-jeve; ručno povezivanje šalje naslove nepronađenih zapisa tek kad zatražiš pretragu. Kandidat se sprema nakon tvoje potvrde. Dohvaćaju se javni žanrovi, prosječna ocjena, oznake i podaci o formatu/sezoni.
- Preporuke AniListu šalju samo odabrane žanrove iz ocijenjenih naslova; MAL ocjene i cijela lista ostaju u pregledniku.
- Uvoz i spremljena analiza rade offline. AniList dohvat i preporuke zahtijevaju mrežu. Nakon prvog online učitavanja PWA predmemorira aplikaciju i dostupne biblioteke za offline pregled.

Filteri po naslovu, statusu, godini na listi, godini izlaska, žanru, AniList oznaci i minimalnoj ocjeni osvježavaju KPI-jeve, grafikone i uvide; klik na graf statusa ili žanra sužava prikaz. Tablica prikazuje najviše 150 filtriranih naslova i vodi na MAL stranicu naslova.

## Datoteke

- `index.html` — HTML struktura aplikacije
- `app.js` — logika i interakcije
- `styles.css` — stilovi aplikacije
- `manifest.json` — naziv, ikona i prečaci instalirane PWA
- `sw.js` — offline predmemorija aplikacije i vanjskih biblioteka
- `nitro-icon.svg` — ikona aplikacije

## Provjere

Pokreni provjere naredbom node --test tests/*.test.js. GitHub Actions ih pokreće na push i pull request.
