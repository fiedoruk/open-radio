# 17 — Audyt polskich stacji, 2026-07-13

## Wynik

| Stacja | Operator | Oficjalna powierzchnia | Transport potwierdzony | Etap |
|---|---|---|---|---|
| RMF FM | Grupa RMF | https://www.rmfon.pl/stacja/rmf-fm | MP3/ICY 128 kb/s przez oficjalne API; także AAC+ | MP3 MVP |
| RMF MAXX | Grupa RMF | https://www.rmfon.pl/stacja/rmf-maxx | MP3/ICY 128 kb/s przez oficjalne API; także AAC+ | MP3 MVP |
| Radio ZET | Eurozet | https://player.radiozet.pl/ | oficjalny player AAC/FLV; publiczny stabilny redirect MP3/ICY | MP3 MVP |
| TOK FM | Grupa Radiowa Agory | https://audycje.tokfm.pl/ | oficjalny resolver zwraca MP3/ICY 128 kb/s | MP3 MVP |
| Złote Przeboje | Grupa Radiowa Agory | https://radio.zloteprzeboje.pl/radio-online-sluchaj-za-darmo | oficjalny resolver/redirect MP3/ICY 128 kb/s | MP3 MVP |
| Chillizet | Eurozet | https://player.chillizet.pl/ | publiczny redirect MP3/ICY 128 kb/s; player używa też AAC/FLV | MP3 MVP |
| VOX FM | Grupa ZPR Media / Time | https://player.voxfm.pl/ | HLS, HE-AAC, MPEG-TS | HLS phase |
| Radio ESKA | Grupa ZPR Media / Time | https://player.eska.pl/?stream_uid=radio_eska | HLS, HE-AAC, MPEG-TS | HLS phase |
| ESKA Impreska | Grupa ZPR Media / Time | https://player.eska.pl/?stream_uid=eska_impreska | HLS, HE-AAC, MPEG-TS | HLS phase |

## Oficjalne resolvery

- RMF FM: `https://api.rmfon.pl/stations/5/streams`
- RMF MAXX: `https://api.rmfon.pl/stations/6/streams`
- Radio ZET: `https://player.radiozet.pl/api/stations`
- Złote Przeboje: `https://fm.tuba.pl/getp/9/2`

TOK FM i część pozostałych playerów mają resolver/API wykorzystywane przez ich
publiczne strony. Dokładny parser zostanie udokumentowany dopiero w katalogu i
testach; nie przypinamy chwilowych hostów edge.

## Podział wdrożenia

### Phase S1 — MP3/ICY

RMF FM, RMF MAXX, Radio ZET, TOK FM, Złote Przeboje i Chillizet.

Cel: jeden stabilny resolver HTTP/ICY, dekoder MP3 i A2DP pipeline.

### Phase S2 — HLS/HE-AAC

VOX FM, Radio ESKA i ESKA Impreska.

Cel: jeden wspólny moduł playlist HLS, segmentów MPEG-TS i HE-AAC. Nie tworzymy
trzech osobnych wyjątków i nie korzystamy z nieoficjalnego proxy.

## Reliability rules

- Korzystamy z oficjalnego API, PLS albo stabilnego redirectora.
- Nie zapisujemy hosta edge generowanego na daną sesję.
- `primary -> alternate -> resolver refresh`, potem kontrolowany backoff.
- Last-known-good działa mimo awarii katalogu zdalnego.
- Audio płynie bezpośrednio od nadawcy.
- Health test nie oznacza oficjalnej rekomendacji przez nadawcę.

## Prawa i branding

- Open source obejmuje nasz kod, nie streamy, logotypy, okładki i treść audycji.
- Bez nagrywania, pomijania reklam, relay/proxy i dostępu do treści premium.
- Nazwy stacji są identyfikacyjne; repo zawiera disclaimer o niezależności.
- Przed sprzedażą gotowych urządzeń lub użyciem logotypów potrzebny jest osobny przegląd prawny/operatora.

## S4 provenance refresh

Loop S4 ponownie potwierdził publiczne powierzchnie operatorów i wykonał
kontrolowany live probe znanych API RMF, Eurozet oraz Tuba. Kanoniczny katalog nie
zapisuje zwróconych hostów CDN ani query stringów. Aktualny model 9/9 znajduje się
w `ui-contract/catalog/station-catalog.v1.json`, a szczegóły dowodów i ograniczeń
w `docs/31-station-provenance-2026-07-13.md`.
