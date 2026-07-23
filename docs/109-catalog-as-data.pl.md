# 109 — Katalog jako dane

[English version](109-catalog-as-data.en.md)

**Cel:** zapis pierwszej fazy wydania 0.2 — endpointy odtwarzania przestają być
kodem C++
**Dotyczy:** katalogu stacji, generatora nagłówków, rozwiązywania endpointów i
domyślnej dziewiątki
**Nie autoryzuje:** zapisu urządzenia, zmian w torze audio ani wydania

## Co się zmieniło

`resolveEndpoint()` był `switch`em po indeksie stacji z wklejonymi adresami.
Zmiana dziewiątki wymagała edycji C++, a rotacja po martwym adresie działała
tylko dla stacji RMF (przez pule operatora) i dla ESKI (przez ręcznie napisane
przełączanie `ic1`/`ic2`). Pozostałe sześć stacji odtwarzało **jeden** adres w
kółko, niezależnie od tego, ile razy licznik rotacji się przekręcił.

Teraz endpointy są danymi. Katalog niesie tablicę `playback[]`, generator
zamienia ją w płaską tablicę w `firmware/generated/station_catalog.hpp`, a
firmware chodzi po wierszach tej stacji. Trzynaście wpisów na dziewięć stacji —
sześć stacji ma realną alternatywę.

## Dlaczego to osobna tablica, a nie `candidates[]`

`candidates[]` dokumentuje oficjalne powierzchnie nadawcy i istnieje ze względów
prawnych. Kontrakt wymaga tam HTTPS i **odrzuca** hosty przejściowe
(`rmfstream`, `streamtheworld`, `cdn*`, `edge*`). Adresy strumieni to dokładnie
te hosty, więc wsadzenie ich tam wywaliłoby walidator — i słusznie.

`playback[]` ma reguły odwrotne: **plain HTTP obowiązkowo**. To nie jest
poluzowanie wymagań. Przy aktywnym łączu A2DP uzgadnianie TLS potrzebuje około
40 KB pamięci wewnętrznej, a wolne bywa 25–30 KB, więc adres HTTPS nie jest tu
wyborem ostrożniejszym — jest nieosiągalny. Dodatkowo host musi znajdować się w
`firmware/manifests/network-services.lock.json`, a adres mieścić się w 127
znakach, bo `start()` odrzuca dłuższe i po cichu wraca do zapamiętanego.

## Tor audio zamrożony bramką

`check:audio-surface` porównuje sześć plików ścieżki dekodowania, ujścia A2DP i
generatora szumu z tagiem `open-radio-0-1`, a dodatkowo pilnuje czterech
niezmienników w plikach, które wolno zmieniać: preferencji koegzystencji
`BALANCE`, budżetu dekodera 8192 ramek i dwóch rezerw 262 144 ramek.

Wszystkie sześć plików było **bajtowo identycznych** z tagiem w chwili
zakładania locka, więc bramka zapisuje stan wydany, a nie legalizuje wstecz
dryfu. Po 18 lipca deklaracja „nie zamierzaliśmy ruszać audio" nie ma wartości
dowodowej; teraz każda zmiana wywala build, chyba że stoi na jawnej liście
wyjątków z uzasadnieniem.

## Nowa dziewiątka

| # | Stacja | Endpointy | Uwaga |
|---|---|---|---|
| 0 | RMF FM | pula rmfon + `rs102…/rmf_fm` | bez zmian |
| 1 | Radio ZET | streamtheworld | bez zmian |
| 2 | RMF MAXX | pula rmfon + `rs202…/rmf_maxxx` | **slot trzymany** |
| 3 | VOX FM | `ic1`/`ic2.smcdn.pl/3990-1.mp3` | nowa |
| 4 | Antyradio | streamtheworld | bez zmian |
| 5 | RMF Classic | `rs102`/`rs202…/rmf_classic` | nowa |
| 6 | Eska Rock | `ic1`/`ic2.smcdn.pl/5380-1.mp3` | nowa |
| 7 | Radio ESKA | `ic1`/`ic2.smcdn.pl/2980-1.mp3` | **slot trzymany** |
| 8 | Radio Wnet | `audio.radiownet.pl:8000/stream` | nowa |

Odeszły: Meloradio, Złote Przeboje, Chillizet i RMF MAXX Club. Cztery nowe
palety odziedziczyły barwy po odchodzących bez zmiany wartości, więc kontrast i
przepełnienia pozostają dokładnie takie, jak je zwalidowano.

## Dwa sloty trzymane i dlaczego

Właściciel wybrał do dziewiątki Jedynkę i Polskie Radio 24. Obie nadają MP3
**wyłącznie w 192 kb/s**; sprawdzone warianty poniżej tego progu na serwerach
nadawcy to kanały podcastowe i odpowiadają `ICY 401`. Nie ma drogi programowej.

Zmierzony sufit przepustowości pod aktywnym Bluetoothem wynosi 15,6 KB/s, ale
pomiar jest ograniczony popytem: wszystkie osiem zapisanych przebiegów to
strumienie 128 kb/s, więc każdy ciągnął dokładnie tyle, ile potrzebował. Wynika
z nich „zapas większy od zera", a nie „zapas co najmniej 8 KB/s".

Dlatego katalog niesie `bitrateCeilingKbps: 128`, a walidator odrzuca stację,
której **żaden** endpoint nie mieści się pod tym progiem. Blokada jest
mechaniczna, nie uznaniowa. RMF MAXX i Radio ESKA trzymają te dwa sloty; obie
już były w wydaniu i obie grają. Po pomiarze na sprzęcie podmiana jest zmianą
wyłącznie danych.

## Dwie korekty wobec specyfikacji

**Eska Rock nie wymaga podążania za przekierowaniem.** Projekt zakładał
`302 → CDN revma` z tokenem ważnym 5 sekund. Stacja ma mount w tej samej
rodzinie CDN co ESKA (2980) i VOX FM (3990): `5380-1.mp3` na `ic1`/`ic2`. Oba
hosty były już w locku, więc cała klasa problemu zniknęła.

**`audio.radiownet.pl:8000/` to strona statusu Icecast, nie strumień.** Adres ze
specyfikacji zwraca `text/xml`. Właściwy mount to `/stream`.

## Generator katalogu

`npm run catalog:refresh` odpytuje radio-browser, filtruje twardo i sonduje
kandydatów **surowym gniazdem**, bo firmware akceptuje status `ICY 200 OK`,
który `fetch` i `urllib` odrzucają — zwykły klient HTTP zaniżyłby wynik.

Skrypt sonduje też wariant plain HTTP adresu podanego jako HTTPS. Nadawcy
rutynowo publikują jeden, a serwują oba; filtrowanie po opublikowanym schemacie
ukrywało **133 działające stacje** — 191 wykonalnych stało się 324. Tak
znalazły się Eska Rock i VOX FM.

Wynik jest raportem i propozycją, nigdy automatycznym commitem. Sieć jest w
generatorze; build pozostaje offline, bo sięganie do sieci przy kompilacji
zniszczyłoby bajtową powtarzalność, na której stoi dowód pochodzenia.

Nie ufamy polu `lastcheckok`. Mówi ono, że komuś zagrało. Dopiero nasza sonda
dopuszcza stację — cudzy pomiar nie wchodzi do produktu jako nasza gwarancja.

## Licznik zdrowia

Pełny obieg po alternatywach stacji bez ani jednej zdrowej ramki to różnica
między „edge mrugnął" a „ta stacja nie nadaje". Licznik zeruje się przy
pierwszej zdekodowanej ramce, więc mierzy porażkę ciągłą, nie kłopoty
historyczne, i wypisuje linię `station_health` w serialu.

Nic go jeszcze nie odczytuje. Ekran „ta stacja teraz nie nadaje" wymaga nowej
wartości w `Screen`, funkcji rysującej, odbicia w bliźniaku parity i pola
snapshotu — to praca tej samej wielkości co usunięcie zapisu utworu i idzie
osobno, żeby dało się zweryfikować jedno i drugie.

## Bramka

`npm run check`: **36 bramek** (nowa `check:audio-surface`), **223 testy**, zero
błędów. Build publiczny `SUCCESS`, `firmware.bin` 2 245 328 B.
