# 111 — Audyt toru BT i przerywania

[English version](111-bt-audio-bottleneck-audit.en.md)

**Cel:** domknięcie audytu „dlaczego rwie" liczbami zamiast wrażeniami
**Dotyczy:** toru Wi-Fi → dekoder → A2DP, doboru stacji, dźwigni naprawczych
**Nie autoryzuje:** żadnej zmiany w zamrożonym torze audio (`check:audio-surface`)

## Objaw i kto go zgłasza

Właściciel: „Eska Rock, VOX, PR24 przerywają". **Korekta z tego samego
wieczoru:** te zgłoszenia padły na buildzie, który — przez naszą własną,
później wycofaną zmianę — trzymał punkt dostępowy nadający przez 5 minut po
konfiguracji, i po serii restartów zerujących bufory. Rytm „rwie → przestało →
znowu" pokrywa się z oknem życia AP. Kontrdowód historyczny: Radio ESKA na tym
samym smcdn grało czysto przez wiele dni na 0.1. Z pierwotnych werdyktów broni
się tylko arytmetyka 192 kb/s.

## Równanie, z którego wynika wszystko

MP3 128 kb/s potrzebuje **15,625 KB/s**. Zmierzony pobór kostki pod aktywnym
A2DP to **15,6–15,7 KB/s** — pomiar ograniczony popytem (bufor był pełny),
więc realny sufit jest „co najmniej tyle", ale godzinny soak z pełnym buforem
dowodzi, że w dobrym eterze bilans się spina. **Margines w najlepszym razie
jest bliski zera.** Każde okno zatłoczenia 2,4 GHz wpycha bilans pod kreskę,
a odrabianie po zatorze jest ograniczone tym samym sufitem — nie hojnością
serwera.

## Pomiar CDN-ów (2026-07-21, surowe gniazdo, z podążaniem za 302)

| CDN | burst 3 s | podtrzymanie | stacje |
|---|---|---|---|
| rmfstream | 65–66 KB/s | 1,51× realtime | RMF FM, RMF Classic, RMF24 |
| streamtheworld | 68–69 | 1,56–1,57× | Radio ZET, Antyradio |
| smcdn | 47–50 | 1,34–1,35× | **VOX FM, Eska Rock** |
| radiownet | 36 | 1,22× | **Radio Wnet** |
| polskieradio | 69–75 | 1,58× | Jedynka, PR24 — ale 192 kb/s |

Po śmierci źródła (watchdog 8 s / rozłączenie edge'a) kostka otwiera na nowo
i odbudowuje bufor z burstu. Burst decyduje o **tempie odzysku**, nie o tym,
czy stacja działa: strumień live po dogonieniu i tak schodzi do 1,0× realtime,
więc „podtrzymanie" mierzy głównie wielkość prebuffera serwera. Na rmfstream
odzysk trwa sekundy, na radiownet trzykrotnie dłużej — dlatego pomiary służą
do **sortowania zapasowych**, a próg dopuszczenia odrzuca tylko strumienie
poniżej ~1,1× (nie trzymają realtime) i powyżej 128 kb/s.

## Jedynka i PR24 — inny mechanizm

192 kb/s = **23,4 KB/s**, o połowę ponad zmierzony pobór pod BT. Serwer jest
hojny (1,58×) — to kostka nie ma jak odebrać. Odsłuch właściciela z 2026-07-21
(„PR24 przerywa") jest de facto pomiarem 192 kb/s pod A2DP: **negatywnym**.
Walidator katalogu słusznie trzymał te stacje za progiem `bitrateCeilingKbps`.

## Ile kostka potrafi przetrwać — inwentarz buforów

| Bufor | Rozmiar | Czas przy 128 kb/s |
|---|---|---|
| wejściowy (skompresowany, PSRAM) | 128 KiB | ~8,2 s |
| zdekodowany PCM | 262 144 ramek | ~5,9 s |
| kolejka A2DP | 262 144 ramek | ~5,9 s |
| **razem (tor BT)** | | **~20 s** |

Udokumentowane zatory: drabinka DNS LWIP **16,3 s** (mieści się tylko przy
pełnych buforach), start bez sieci 6,6 s, okna zatłoczenia wieczornego —
minuty, których żaden bufor nie przeżyje przy bilansie ujemnym. Tor lokalnego
głośnika drenuje blokami 131 072 ramek (~3 s), co czyni go kruchym na chudych
strumieniach — problem opisany 2026-07-17, projekt mniejszych bloków czeka.

## AAC — status po ponownym sprawdzeniu

Wcześniejsze „AAC odrzucone licencyjnie" było oparte wyłącznie o `libhelix`
(RPSL). **FAAD2 jest na GPL-2.0-or-later, z SBR — licencyjnie zgodne z naszym
GPL-3.0.** Blokada przesuwa się w dwa inne miejsca: (1) **pamięć** — port na
ESP32 wymaga ~60 KB stosu w osobnym zadaniu, a pod aktywnym A2DP wolne bywa
25–30 KB wewnętrznej (ta sama ściana co TLS); (2) **patenty** — ocena
zrewidowana tego samego wieczoru: pule ścigają produkty i enkodery, nie darmowe
dekodery open-source (FAAD2 w Debianie od dwóch dekad; Fedora wysyła dekoder
AAC-LC od 2017), rdzeń AAC-LC wygasł, a zgłoszenia SBR z lat 2001–2004 wygasały
przez połowę lat 20. — dla darmowego projektu GPL ekspozycja praktyczna równa
ekspozycji każdej dystrybucji Linuksa. Wytrych pamięciowy do sprawdzenia: stos
zadania w PSRAM (`SPIRAM_ALLOW_STACK_EXTERNAL_MEMORY`; wolne ~1,9 MB) plus
przycięcie do LC+SBR. Warunek twardy: R&D wyłącznie na drugiej, laboratoryjnej
kostce. Wniosek: tor badawczy, nie droga 0.2. Rewizja §4.2
specyfikacji: z „na stałe" na „zamknięte do czasu wykonalnego dekodera".

## Dźwignie, od najtańszej

| # | Dźwignia | Koszt | Status |
|---|---|---|---|
| 1 | Kostka + głośnik razem, z dala od routera | zero | **potwierdzone empirycznie** (lipiec) |
| 2 | Dobór stacji wg burstu CDN (dane, nie kod) | zero | katalog ma pomiary |
| 3 | PR24 → RMF24 (ta sama funkcja, CDN 66 KB/s) | zmiana danych | **czeka na decyzję właściciela** |
| 4 | Większy ring wejściowy (PSRAM jest wolny ~1,9 MB) | wyjątek w locku audio + soak | propozycja |
| 5 | Mniejsze bloki lokalnego drainu (~0,74 s) | wyjątek w locku + soak | propozycja z 07-17 |
| 6 | Cache IP po pierwszej resolucji (omija drabinkę DNS) | `station_runtime` — niezamrożone | propozycja |
| 7 | Bitpool SBC po stronie źródła | warstwa IDF, inwazyjne | ostatnia deska |
| 8 | FAAD2 AAC 64 kb/s (8 KB/s) | R&D: pamięć + patenty | poza 0.2 |

Dźwignie 4–5 dotykają plików pilnowanych przez `check:audio-surface` — wymagają
jawnego wyjątku z uzasadnieniem i przebiegu na sprzęcie, dokładnie po to ta
bramka istnieje.

## Co użytkownik widzi w 0.2

Bez automatycznego skakania po stacjach (decyzja właściciela): kostka zostaje
na wybranej stacji i rotuje po **jej własnych** endpointach w nieskończoność
(0,25 s → 5 s → 30 s → 2 min → 10 min). Po pełnym obiegu bez zdrowej ramki
linia tytułu mówi: *„Ta stacja teraz nie nadaje. Próbuję dalej."* — pierwsza
zdekodowana ramka przywraca nazwę stacji, a prawdziwy tytuł ICY ją nadpisuje.
