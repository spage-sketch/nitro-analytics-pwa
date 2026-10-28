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
- Analiza, teme i AniList podaci spremaju se u `localStorage` trenutačnog preglednika i domene.
- Izvezi JSON gumbom **EXPORT JSON**, a zatim ga vrati gumbom **OBNOVI JSON**; uvoz provjerava MAL ID-jeve i prijavljuje preskočene zapise.
- **Shadow Fetch** šalje MAL ID-jeve AniListu i dohvaća javne žanrove i prosječnu ocjenu.
- Preporuke AniListu šalju samo odabrane žanrove iz ocijenjenih naslova; MAL lista i ocjene ostaju u pregledniku.
- Uvoz i spremljena analiza rade offline. AniList dohvat i preporuke zahtijevaju mrežu. Nakon prvog online učitavanja PWA predmemorira aplikaciju i dostupne biblioteke za offline pregled.

## Datoteke

- `index.html` — aplikacija
- `manifest.json` — naziv, ikona i prečaci instalirane PWA
- `sw.js` — offline predmemorija aplikacije i vanjskih biblioteka
- `nitro-icon.svg` — ikona aplikacije

## Provjere

Pokreni provjere naredbom node --test tests/*.test.js. GitHub Actions ih pokreće na push i pull request.
