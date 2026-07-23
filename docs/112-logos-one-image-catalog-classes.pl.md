# 112 — Logotypy, jeden obraz, klasy katalogu

[English version](112-logos-one-image-catalog-classes.en.md)

**Cel:** zapis drugiej fazy wydania 0.2 — automatyczne logotypy stacji,
jeden obraz produktu i zmierzony katalog
**Obejmuje:** łańcuch logo, zasadę jednego obrazu, klasy katalogu A/B/C,
sesję konsoli i adres urządzenia
**Nie autoryzuje:** zapisów na urządzeniu, zmian toru audio ani wydania

## Jeden obraz dla wszystkich

Zasada właściciela przestawiła wydanie: **właściciel zawsze ma dokładnie ten
obraz, który pobierają klienci.** Tor `core2-owner-production` z wkompilowaną
paczką logotypów zszedł ze ścieżki wydania; `core2-public-candidate` jest
torem produktu i rejestr przyjmuje go do flashowania. Kostka właściciela
niczym się już nie różni — i o to chodzi: każda regresja, którą widzi
właściciel, jest regresją, którą zobaczyłby klient.

## Łańcuch logotypów (ADR-010)

Logotypy pobiera sama kostka, raz, bez nadzoru:

```
katalog niesie favicony po QC (sondowane tego samego dnia: 200, magia
PNG, sensowne wymiary)
   │  pierwsza asocjacja Wi-Fi, PRZED startem stosu Bluetooth
   │  (jedyne okno z internetem i heapem na TLS naraz)
   ▼
dekodowanie PNG w LovyanGFX → cover-crop 96×96 → RGB565 na SPIFFS
(`/lN.bin` + sidecar `/lN.url` z hashem przypinającym piksele do URL-a)
   ▼
runtime-provider renderera — logo przycięte DO zaokrąglonego kafla,
monogram przy braku; host nigdy nie rejestruje providera, więc
deterministyczny kontrakt renderowania jest bez zmian
```

Telefon nigdy nie podaje adresu, więc powierzchnia SSRF nie istnieje z
konstrukcji. Stacja bez PNG po QC zostaje przy monogramie — picker oznacza,
które stacje katalogu mają logo do pobrania.

Fabryka-przy-nowym-buildzie czyści NVS **i** magazyn logo, więc każdy build
przechodzi ścieżkę pierwszego uruchomienia klienta; hash w sidecarze wymusza
ponowne pobranie, gdy zmieni się stacja slotu (a z nią URL).

## Klasy katalogu — „naprawdę nie przerywa", zmierzone

Każdy endpoint sondowaliśmy własnym surowym gniazdem (15 s na endpoint,
ze zrozumieniem ICY, z podążaniem za redirectami), tożsamość po `icy-name`,
ocena po utrzymanym poborze względem potrzeb danego strumienia:

| Klasa | Kryterium | Stacji | W pickerze 0.2 |
|---|---|---|---|
| A | ≥1,5× realtime | 184 | tak |
| B | 1,3–1,5× | 34 | tak — klasa dostawy ESKI, udowodniona na sprzęcie w 0.1 |
| C | 1,1–1,3× | 61 | **nie** — trzyma realtime przy najwolniejszym odzysku |
| — | martwe / >128 kb/s / <1,1× | odrzucone | nie |

Próg burst jest **względny** (≥3,5× potrzeby strumienia): próg bezwzględny
niesłusznie zabił mount 64 kb/s TOK FM. Podłoga przyjęcia 1,1× to wartość
poprawiona po lekcji skażenia kalibracji (docs/111): nigdy nie kalibruj
progów na objawach zebranych podczas własnej interferencji. Klasa C zostaje
w danych i wraca do pickera, gdy cokolwiek z niej zostanie udowodnione na
sprzęcie.

## Sesja konsoli i adres urządzenia

Po asocjacji firmware rejestruje **open-radio.local** (mDNS), a ekran Wi-Fi
pokazuje parę adresów (nazwa mDNS + surowe IP). Kafel Konsola w ustawieniach
systemowych otwiera 15-minutowe okno bezczynności, w którym endpointy
portalu (`/api/directory`, `/api/slots`, CSRF jak dotąd) przyjmują klientów
z sieci domowej; odtwarzanie radia jest na ten czas wstrzymane — okno HTTP
konkuruje o to samo powietrze co strumień — a lokalny szum gra dalej. Poza
sesją serwer w ogóle nie nasłuchuje. Zmiana slotu w trakcie sesji restartuje
urządzenie, bo nowe logotypy potrzebują okna TLS sprzed Bluetooth, które
daje tylko świeży start.

## Odniesienia

- `decisions/ADR-010-runtime-station-logos.md` — decyzja i pozycja prawna
- `docs/109-catalog-as-data.pl.md` — endpointy jako dane (faza pierwsza)
- `docs/110-choosing-the-nine.pl.md` — domyślna dziewiątka i jej QC
- `docs/111-bt-audio-bottleneck-audit.pl.md` — równanie pasma i metoda
  pomiaru
