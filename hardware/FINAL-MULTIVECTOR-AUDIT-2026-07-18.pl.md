# Finalny audyt wielowektorowy kostki i postmortem regresji — 2026-07-18

**Pochodzenie:** dokument utworzył Codex 2026-07-18 na polecenie właściciela
wykonania finalnego audytu wielowektorowego. Nie jest to tekst napisany przez
właściciela ani automatyczny wynik narzędzia.
**Rola:** datowany postmortem i rejestr dowodów. Kanoniczną, skończoną kolejkę
kwalifikacji i zamknięcia produkcji definiuje
[docs/106](../docs/106-final-private-cube-closeout-loop.pl.md).
**Rodzaj dokumentu:** wewnętrzny, właścicielski zapis techniczny; nie jest
publiczną deklaracją zgodności ani materiałem release
**Stan dokumentu:** `FINALNY OBRAZ WGRANY / RMF PASS / WARUNKOWE QC`
**Urządzenie:** M5Stack Core2, ESP32-D0WDQ6-V3, flash 16 MB, PSRAM 8 MB
**Gałąź robocza:** `codex/final-94c-fenced`
**Bazowy HEAD przed audytem:** `fe5f8639ada66e570d5116c83ab3991e563e5567`
**ROM działający na kostce:** `3e7a0cbdfc5cb5509ea2929430c047e812d86fbdd3ae8699998c7c7f847a9738`
**Rozmiar ROM-u:** 2 448 816 B
**Source SHA zapisany w ROM-ie:** `791ebd49d87d904a14956fa21688fbfe5fbff65e`
**Lane:** owner-production MP3-only, async ICY input, katalog 9 stacji i lokalny
pakiet 9/9 logotypów i pasek PMIC; exact-final RMF 300 s PASS
**Następny dokładny kandydat:** `3e7a0cbdfc5cb5509ea2929430c047e812d86fbdd3ae8699998c7c7f847a9738`,
2 448 816 B, source `791ebd49d87d904a14956fa21688fbfe5fbff65e`; jedyna różnica zachowania to
lekki pasek PMIC w Ustawieniach
**Dokładny obraz odzyskania bieżącej powierzchni (nie stabilny baseline):** obraz
`94c25a9e373f2bc0b3dabeaf4af19483362aa9486a7eafd638f25b2d9e562f12`
z source `44f19e49a64eeb2a9107f9e929e9577071623e32`

Dokument nie zawiera SSID, haseł, adresów urządzeń, portu szeregowego,
rozwiązanych adresów CDN ani hasha prywatnego backupu całego flasha.

## Najnowsza aktualizacja produkcyjna — 20:33 CEST

Dokładny obraz async-input `44e97929...` został zapisany wyłącznie do app0 po
świeżym preflight aktywnego slotu i niezależnie zweryfikowany. Zamknął cztery
pięciominutowe okna bez kolejnego wariantu audio:

| Okno | Wynik licznikowy | Werdykt właściciela / granica |
|---|---|---|
| RMF | 0 nowych stopów, active/idle silence, watchdogów, fallbacków, resetów i paniców; 889 pustych odczytów ringa wejściowego zostało pokrytych przez stabilny PCM | brak zgłoszenia cięcia |
| Radio ZET | 0 nowych underrunów wejścia i 0 awarii wyjścia; ring skompresowany ok. 106–109 KiB | stabilne okno po ograniczonym okresie przełączenia/prefill |
| Powrót RMF | 0 nowych awarii wyjścia mimo 909 pustych odczytów wejścia | właściciel: `ok` |
| RMF po podniesieniu głośności | wszystkie delty awarii 0; wejście, decoded PCM i BT pełne | właściciel: `idealnie` |

To rozdziela dwa poziomy bufora. `input_underruns` RMF oznacza, że decoder przez
chwilę zastał pusty ring skompresowanych bajtów. Nie jest to automatycznie
przerwa produktu: w obu oknach RMF kolejki decoded/BT zachowały zapas, a liczniki
zer PCM/A2DP nie wzrosły. Warunek FAIL pozostaje użytkowy: słyszalne cięcie,
wzrost ciszy wyjścia, stop, watchdog, reset albo utrata zapasu bez odbudowy.

O 20:17 rozpoczęła się pasywna godzina RMF na tym samym hashu. Jest dowodem
architektury, lecz nie może zostać przeniesiona na późniejszy hash UI.

Na jawne polecenie właściciela powstał osobny commit UI `791ebd4...`. Na każdym
ekranie Ustawień zamiast napisu `USTAWIENIA` cały górny pasek pokazuje:

- procent i napięcie akumulatora;
- podpisany pobór albo ładowanie w mA;
- orientacyjny czas `~h min` dopiero po trzech próbkach rozładowania.

PMIC jest czytany wyłącznie przy widocznych Ustawieniach, co 10 sekund. ETA używa
nominalnych 390 mAh i wygładzonego prądu, więc jest informacją orientacyjną, nie
pomiarem laboratoryjnym. Na USB czas jest ukrywany. Zmiana kosztuje 24 B RAM i
6 444 B flash względem `44e97929...`; nie zmienia audio, BT, Wi-Fi, endpointów,
tasków ani kolejek. Dwa czyste buildy dały identyczny obraz `3e7a0cbd...`.
Obraz działającego audio `44e97929...` nie został przy tym wyrzucony ani
nadpisany: rejestr zachowuje go wyłącznie jako `RESTORE_AUDIO_LKG`, a build menu
wyłącznie jako `FLASH_OWNER_PRODUCTION`. Test walidatora odrzuca zamianę ról.

### Finalna delta wielowektorowa

Ta tabela zastępuje bieżące statusy historycznej tabeli niżej; stara tabela
pozostaje zapisem tego, co prowadziło do diagnozy.

| Wektor | Stan na 20:33 | Co jest domknięte | Co uczciwie pozostaje |
|---|---|---|---|
| RMF / ZET / przełączanie | FOCUSED PASS na `44e97929...` | cztery stabilne okna, w tym powrót i głośność | focused rerun na finalnym `3e7a0cbd...`; czas przełączenia nie jest deklarowany jako zerowy |
| Bluetooth/A2DP | FOCUSED PASS / RECOVERY PARTIAL | ciągłe SBC, pełna kolejka, profile-open fenced | wymuszony speaker-off/fallback/powrót 3/3 |
| Wi-Fi i wydajność | STEADY PASS / RECOVERY NOT RUN | RSSI do co najmniej −65 dBm bez utraty wyjścia; socket poza owner loop | wymuszona utrata/powrót Wi-Fi 5/5 |
| CPU / kolejki | PASS W ZMIERZONYM OKNIE | worker core 0 priority 1; decoded/BT stabilne; owner nie blokuje na socket | dokładny finalny hash 60 min oraz 2 h/8 h |
| DRAM / PSRAM / stack | PASS WITH RISK | bieżący DRAM wracał do ok. 23 KiB, PSRAM i stack workera stabilne, brak trendu utraty | historyczne minimum DRAM ok. 4 KiB wymaga obserwacji recovery/endurance |
| Głośność | PASS | kolejki były pełne przed i po zmianie; właściciel `idealnie` | ponowny krótki odsłuch po finalnym flashu |
| Pasek baterii | SOFTWARE PASS | PMIC API, limit 10 s, render PL/EN, ETA wygładzone, +24 B RAM | fizyczny odczyt, kalibracja %, mostek USB-C i powerbank |
| QR Wi-Fi | SOFTWARE PASS / PHYSICAL DEFERRED | duży 184×184 QR na pierwszym i dodatkowym Wi-Fi | właścicielski skan fizyczny później |
| Czas/RTC | SOFTWARE PASS / VISUAL DEFERRED | RTC zapisuje UTC po świeżym SNTP | finalny odczyt godziny po flashu i boot offline/DST |
| Repo/build | PASS | 210/210 Node, 21/21 fault matrix, renderer 18/18, BT gate 5/5, dwa identyczne buildy | finalne ponowienie po metadanych i czysty commit |
| Prywatny final/H4 | CONDITIONAL ONLY | istnieje jeden finalny hash i recovery | forced recovery, PMU/zasilanie/SD/obudowa, exact 60 min, 2 h i 8 h |

### Jak dalej lawirować BT/Wi-Fi bez regresji

Nie lawirujemy już parametrami RF. Stosujemy stały podział odpowiedzialności:

1. Wi-Fi tylko produkuje skompresowane bajty w ograniczonym workerze/ringu.
2. Owner loop dekoduje i steruje, nigdy nie wykonuje długiego odczytu socketu.
3. A2DP pobiera tylko z własnej kolejki PCM; po starcie mediów nie zostawiamy
   sztucznej rezerwy w dekoderze.
4. Profile-open ma jednego właściciela i generację; opóźniony callback nie może
   ruszyć nowej próby.
5. Przełączenie stacji ma osobny etap otwarcia/prefill; ocena steady-state
   zaczyna się po settle i mierzy przyrost, nie stare liczniki kumulacyjne.
6. Zwiększenie głośności nie jest przyczyną bez kolejności dowodu. W starym FAIL
   kolejki były puste wcześniej; w nowym PASS pozostały pełne.
7. Najpierw wybieramy jeden liść telemetryczny, potem najwyżej jedna poprawka i
   jeden rerun. Nie wracamy do AAC, resamplera, bitpool, `PREFER_WIFI`, scoped
   coexistence, low-water restartu ani całych historycznych obrazów.

## Historyczna aktualizacja produkcyjna — 18:48 CEST

Właściciel wskazał właściwą granicę regresji: obraz bezpośrednio przed
`a7ed7f15...`, czyli dokładny `94c25a9e...` ze źródła `44f19e4...`.
`91bf973c...` po usunięciu low-water restartu dał RMF ocenione jako
prawdopodobnie czyste, ale Radio ZET zaczęło słyszalnie charczeć. Ten obraz jest
skwarantannowany na podstawie nieinstrumentowanego werdyktu odsłuchowego
właściciela.

Kostkę przywrócono app0-only do `94c25a9e...` i niezależnie zweryfikowano
digest. Równolegle utworzono jeden zamknięty następca bez kolejnego strojenia:

- źródło `17a4723805badfbcb39956502310e806c9f4c562`;
- obraz `7b6f44b1536d0ab921de7f392016ff3861f042a1453066d694e53da8a4a55855`,
  2 441 040 B;
- dokładna semantyka MP3/PCM/stacji z `94c25...`;
- jedyny dodatek dotyczący BT: single-flight/generation fence na profile-open,
  który adresuje znany panic recovery z 60. minuty;
- dodatki ortogonalne: zapis RTC w UTC po świeżym SNTP i duży QR Wi-Fi;
- brak AAC, resamplera, bounded-SBC wrappera, scoped coex/refill, low-water
  endpoint policy oraz późniejszych zmian discovery/network.

Pełna bramka źródła 208/208, fault matrix 19/19, wykonywalny BT profile gate
5/5 oraz dwa niezależne, bajtowo identyczne buildy przeszły. To zatwierdza
wyłącznie dokładny flash app0 do odsłuchu; nie jest jeszcze fizycznym PASS.

## Historyczna aktualizacja produkcyjna — 18:19 CEST

Pierwotna część raportu poniżej pozostaje dowodem, dlaczego ROM `94c25a9e...`
nie mógł zostać uznany za stabilny. Nie jest już jednak opisem bieżącego ROM-u.
Po audycie wykonano zamkniętą kolejkę zmian, bez wracania do losowej regulacji
buforów:

1. cały profile-open A2DP objęto single-flight i generacją obserwowanej próby;
2. discovery RMF wyniesiono poza owner loop, a zapis LKG uzależniono od
   trwałego zdrowia streamu;
3. poprawiono timeout asynchronicznego skanu Wi-Fi;
4. prywatny owner lane dostał oficjalny deck RMF AAC 48/64 kb/s, dokładny
   resampler 22,05 → 44,1 kHz oraz zapis RTC w UTC po świeżym SNTP;
5. osobno udowodniono, że BALANCE nie daje dość czasu live-paced RMF, a
   historyczne stałe PREFER_WIFI odbierało czas nadajnikowi A2DP;
6. samo krótkie PREFER_WIFI na refill poprawiło sytuację, ale nadal cięło;
7. ograniczenie SBC do bitpool 32 ustabilizowało RMF, ale ZET po przełączeniu
   nadal opróżniał kolejki, bo bezpośredni MP3 nie używał scoped refill;
8. kandydat `fbfc977f...` objął ten sam refill także MP3 i przywrócił duży QR,
   ale ZET nadal produkował PCM wolniej od czasu odtwarzania;
9. zamknięto gałąź strojenia MP3: finalny bounded source używa oficjalnego ZET
   AACp 64 kb/s w prywatnym lane, MP3 zachowując tylko jako fallback.
10. `eda2c800...` nadal ciął RMF i ZET; capture RMF pokazał cykliczne restarty
    przy nadal działającym dekoderze i bez zdarzenia śmierci źródła. Regresją
    okazał się watchdog `sustained-low-water`, dodany po czystym punkcie
    `94c25...`. Usunięto wyłącznie jego restart live streamu.

Obrazy po nieudanych etapach, w tym `fbfc977f...`, są jednoznacznie
skwarantannowane. `94c25a9e...` pozostaje wyłącznie recovery bieżącej
powierzchni i znanym FAIL 60 min. `eda2c800...` jest skwarantannowany.
`91bf973c...` był wtedy zatwierdzonym kandydatem właścicielskim; późniejszy
odsłuch ZET go odrzucił, jak opisano w najnowszej aktualizacji powyżej.

### Bieżący dowód

- pełna bramka: PASS, 212/212 testów Node;
- dwa niezależne czyste buildy owner-production: identyczne bajtowo;
- mapa linkera: AAC obecne, HLS/lab console nieobecne, ogranicznik SBC obecny;
- flash bieżącego obrazu: tylko app0, SHA `eda2c800...`, niezależna weryfikacja
  po zapisie PASS;
- poprzednik `e4672973...`: RMF czysty około 30 min, ale ZET po przełączeniu
  FAIL przez produkcję MP3 wolniejszą od czasu odtwarzania; reset/panic 0/0;
- `fbfc977f...`: 32 starty/stopy, source disconnect, 275 114 aktywnych i
  1 661 382 jałowych ramek ciszy; refill 8 192 ramek dawał około 186 ms PCM,
  ale zwykle trwał 200–878 ms; reset/panic 0/0;
- finalny source AAC: skupione testy 23/23 i pełna bramka 212/212 PASS;
- dwa czyste buildy: identyczny `eda2c800...`, 2 529 360 B, źródło
  `ecf05b5...`; AAC/ogranicznik SBC obecne, HLS/lab nieobecne;
- `eda2c800...`: RMF pięć startów i cztery stopy w pięć minut mimo nadal
  działających refilli i braku odpowiadającej śmierci źródła; właściciel słyszał
  cięcia na RMF i ZET; obraz skwarantannowany;
- minimalny następca: `91bf973c...`, 2 529 296 B, źródło `f7467bb...`; pełna
  bramka 212/212 i dwa czyste identyczne buildy PASS;
- QR: PASS software, fizyczne potwierdzenie właściciela nadal otwarte.

To był zapis historyczny przed odrzuceniem `91bf973c...`. Bieżący kandydat
wraca do owner MP3-only i nadal nie autoryzuje publikacji prywatnej binarki ani
lokalnych logotypów.

## Pierwotny werdykt wykonawczy dla `94c25a9e...` — zapis historyczny

1. Jedna konkretna regresja cięcia RMF na aktywnym Bluetooth została wyjaśniona
   na podstawie stanu zmierzonego na kostce, odtworzona testem wykonywalnym i
   skorygowana jedną zmianą polityki własności PCM. Nie była to jednak jedyna
   możliwa przyczyna cięcia RMF.
2. Poprzedni kod pozostawiał 44 801 poprawnych ramek w kolejce dekodera, ale nie
   przenosił ich do niemal pustej kolejki Bluetooth, ponieważ wymagał naraz
   rezerwy 44 100 ramek i kwantu 1 024 ramek. Głośnik dostawał zera, choć PCM był
   dostępny.
3. Zmiana stacji lub restart źródła mogły wejść w ten stan, lecz nie były jego
   jedyną przyczyną. Na RMF stary ROM ciął przez kolejne 121 sekund bez nowego
   stopu źródła. To zamyka pytanie o cięcie „bez ruszania stacji”.
4. Dokładny kandydat `94c25a9e...` przeszedł skupione 600 sekund RMF: jeden
   rzeczywisty stop/restart źródła, zero przyrostu aktywnej i jałowej ciszy BT,
   pełne odbudowanie obu kolejek oraz czysty odsłuch w końcowym oknie właściciela.
5. Pasywne 60 minut na tym samym ROM-ie obaliło pełny pass. W 2 573 621 ms
   przestał działać callback A2DP i zadziałał pull-watchdog. W 2 594 295 ms,
   2,086 s po rozpoczęciu kolejnego direct reconnect, nastąpił
   `ESP_RST_PANIC` (`reset_reason=4`). Coredump wiąże aktywny tor z
   `BTA_AvOpen -> connect_int -> btc_queue_connect_next`; uszkodzony kontekst
   panica nie pozwala uczciwie wskazać konkretnego assertu ani instrukcji.
6. Po automatycznym powrocie Wi-Fi/RMF/BT obie kolejki później zeszły niemal do
   zera. Przybyło 2 411 520 aktywnych ramek ciszy, około 54,68 s, i 109 821
   jałowych ramek, około 2,49 s. Ten drugi stan ma `decoded=0`, a nie stare
   uwięzione `decoded=44 801`; jest osobnym problemem produkcji PCM/zdrowia
   endpointu.
7. Audyt wykrył ryzyka niezależne od poprawionego BT: bardzo niski chwilowy
   margines DRAM, blokujące skany i trzy sekwencyjne requesty TLS w pętli
   właściciela, zbyt wczesne uznawanie endpointu za zdrowy i zapis LKG do NVS,
   twarde hosty awaryjne, nieaktualne rejestry dowodów oraz niewystarczający
   bezpiecznik dla starych całych obrazów aplikacji.
8. Manifest zasobów nie mierzy obecnego firmware: limit PCM 65 536 B nie jest
   porównywany z dwiema kolejkami PSRAM po 1 048 576 B i buforem drenażu
   524 288 B, a CI uruchamia tylko bramkę hostową, bez kompilacji firmware.
   Zielony `npm run check` nie może więc sam być dowodem zasobów ani binarki.

**Bieżący werdykt prywatnego użytkowania:** `BLOCKED AS STABLE BASELINE`.
Skupiona poprawka PCM pozostaje ważna, ale dokładny ROM nie zaliczył godziny.

**Bieżący werdykt pełnej kwalifikacji i publicznego release:** `BLOCKED`.

## Co zostało faktycznie zmierzone

| Próba | Dokładny obraz | Wynik |
|---|---|---|
| Radio ZET, stary ROM, stabilne 300 s po przejściu | `6b01752f...` | po początkowym ubytku przełączenia brak dalszej ciszy, stopów i eventów źródła; steady-state czysty |
| RMF FM, stary ROM | `6b01752f...` | właściciel słyszał ciągłe cięcia; w 121 s bez nowego eventu źródła przybyło 1 552 512 aktywnych zer, około 35,20 s; decoded=44 801, BT=2 816–6 272 |
| RMF FM, poprawiony ROM, 600 s | `94c25a9e...` | jeden realny stop streamu i 17 eventów źródła; delta active/idle silence 0/0; kolejki wróciły do około 262 144/260 864; końcowy odsłuch właściciela bez przerw |
| RMF FM, pasywny soak 60 min | `94c25a9e...` | **FAIL**; `ESP_RST_PANIC` w 2 594 295 ms po pull-watchdog/reconnect; Wi-Fi +4,731 s, pierwszy odczyt streamu +19,696 s, A2DP media +100,585 s; po reboocie 8 startów/7 stopów źródła, 2 411 520 aktywnych i 109 821 jałowych ramek ciszy; końcowo bufory pełne |
| RMF FM, bieżący steady 180 s | `e4672973...` | **PASS licznikowy**; 3/3 próbki, delta start/stop/active silence/watchdog 0, kolejki ~259–261 tys., reset/panic 0; odsłuch właściciela jeszcze bez jawnego znacznika |
| RMF → ZET → głośniej → RMF | `e4672973...` | **FAIL ZET**; RMF około 30 min czysty, ZET MP3 opróżnił kolejki przed zmianą głośności; ponowne wybranie odzyskało stream; reset/panic 0; obraz skwarantannowany |
| Finalny QR + RMF → ZET → głośniej → RMF | `fbfc977f...` | **FAIL ZET**; 32 starty/stopy, source disconnect i duży przyrost ciszy; refill MP3 nadal wolniejszy od czasu odtwarzania; QR bez fizycznego werdyktu |
| Bieżące powierzchnie operatorów, 2026-07-18 | bez wpływu na kostkę | API RMF dla stacji 5/6/29: HTTP 200, JSON, poprawny TLS; pięć redirectorów StreamTheWorld: MP3 i HTTP 206; oba hosty ESKI: MP3 i HTTP 200 |

`CAPTURE COMPLETE` oznacza poprawne zebranie danych, a nie automatyczny PASS
audio. Odsłuch właściciela i liczniki są zapisywane osobno.

Oczyszczony dowód godziny jest zapisany prywatnie w
`output/hardware-soaks/2026-07-18T09-36-05.444Z-final-audit-rmf-60m.json`:
63 próbki pamięci, 60 próbek audio, 797 eventów, `eventsDropped=0`. Globalna
delta pierwszy–ostatni jest nieważna przez restart; liczby powyżej policzono
osobno przed i po `reset_reason=4`.

## Potwierdzona przyczyna jednego trybu regresji RMF

Stary aktywny drain BT przenosił wyłącznie pełny blok 1 024 ramek i jednocześnie
zachowywał w `decodedFrames` rezerwę 44 100 ramek. Warunek przeniesienia wynosił
więc co najmniej 45 124 ramek. Zmierzony stan awarii miał:

- `decodedFrames = 44 801`,
- `bluetoothFrames = 2 816`,
- aktywną trasę Bluetooth,
- brak nowego stopu źródła przez 121 sekund.

W kolejce dekodera było ponad sekundę prawidłowego PCM, lecz 323 ramki mniej od
progu `44 100 + 1 024`. Callback A2DP opróżniał BT i uzupełniał brak zerami.
Rezerwa, która miała chronić fallback, stała się blokadą żywego wyjścia.

Poprawka `44f19e4` rozdziela dwie fazy:

- przed startem mediów BT rezerwa 44 100 ramek nadal pozostaje po stronie
  dekodera;
- po aktywacji BT rezerwa źródłowa wynosi 0, ponieważ kolejka BT jest pierwszą,
  zachowywaną częścią uporządkowanego fallbacku lokalnego;
- przekazanie jest ograniczone dostępem źródła, miejscem docelowym i maksymalnym
  kwantem, więc nie ma underflow ani przekroczenia pojemności.

Test hostowy zaczyna od dokładnego stanu 44 801/2 816, przenosi PCM do BT i
potwierdza zachowanie sumy ramek. Oddzielny test potwierdza, że standby nadal
zatrzymuje 44 100 ramek dla głośnika lokalnego.

60-minutowa próba wykazała, że nie wolno rozszerzać tego dowodu na każde cięcie
RMF. Po reboocie wystąpił stan z pustym dekoderem i prawie pustą kolejką BT:
to prawdziwy brak produkcji PCM, nie blokada transferu między kolejkami.

## Gdzie popełniłem błąd

Sflashowałem historyczny obraz `729444cc...` ze źródła `ecd69dd`, traktując go
jako punkt porównawczy audio. Było to błędne założenie. To był cały stary obraz
aplikacji, a więc jednocześnie stary renderer, wygląd GUI, zasoby i brak
aktualnego pakietu logotypów. Właściciel zobaczył regresję wizualną.

Konkretnie zawiodły cztery rzeczy:

1. Nie uznałem GUI, renderera, katalogu i lokalnych assets za część tożsamości
   kandydata do regresji audio.
2. Zweryfikowałem hash i granice flasha, ale nie zweryfikowałem semantycznej
   zgodności powierzchni produktu. Narzędzie gwarantowało „dokładnie te bajty”,
   nie „dokładnie ten produkt”.
3. Użyłem bisection całej binarki, mimo że mieliśmy już wystarczające liczniki,
   aby zbudować test wykonywalny dla kolejki PCM bez zmiany ROM-u.
4. Nie przedstawiłem przed flashem manifestu z GUI, logo-packiem, katalogiem,
   schematem konfiguracji, pojedynczą zmianą zachowania i rollbackiem.

To nie była konieczna cena diagnozy. Był to błąd procesu i mój błąd decyzji,
który dołożył zbędną pętlę oraz podważył pewność, co faktycznie działa na kostce.

## Skutek i pełne odzyskanie po błędzie

- Stary obraz był zapisany wyłącznie do `app0` pod `0x10000`.
- Nie zapisano bootloadera, tabeli partycji, `otadata`, `app1`, SPIFFS, coredump
  ani całego NVS.
- Test starego obrazu zatrzymano po około 96 sekundach bez użytecznego werdyktu
  RMF/A2DP. Midpoint `88561ba7...` nigdy nie został sflashowany.
- Normalna ścieżka zdrowego streamu starego obrazu mogła zapisać wartość klucza
  `lkg2_0`. Oczyszczone logi celowo nie pozwalają stwierdzić, czy była to ta sama,
  czy starsza wartość endpointu.
- Nie wykonywano akcji UI, provisioningu, parowania ani ulubionych. Konfiguracja,
  profile Wi-Fi, ulubione i zapamiętana tożsamość BT nie zostały przez tę próbę
  przepisane.
- Dokładny bieżący wtedy obraz `6b01752f...` został natychmiast przywrócony do
  `app0`, a niezależne `verify_flash` potwierdziło zgodność digestu.
- Odczyt tylko do monitorowania potwierdził później `boot build_sha=b198e0a...`.
- Następnie zbudowano i sflashowano jedną poprawkę audio `94c25a9e...`; digest po
  zapisie również został niezależnie potwierdzony.

## Twarde zabezpieczenia, żeby to się nie powtórzyło

1. Historyczne pełne obrazy aplikacji nie są już kandydatami do bisection audio.
   `729444cc...` i `88561ba7...` są trwale oznaczone jako kwarantanna. Również
   `6b01752f...` trafia do kwarantanny: zachowuje bieżące GUI, ale ma potwierdzoną
   regresję RMF i nie jest bezpiecznym przyszłym rollbackiem.
   `94c25a9e...` pozostaje wyłącznie dokładnym obrazem odzyskania bieżącej
   powierzchni po błędnym zapisie. FAIL 60 min wyklucza jego użycie jako
   stabilnego baseline'u lub następnego kandydata.
2. Diagnostyka zachowania zaczyna się od capture, źródłowego diffu i
   wykonywalnego testu dokładnego stanu. Flash jest ostatnim krokiem, nie metodą
   szukania hipotezy.
3. Arbitrarny plik z katalogu archiwów nie może wystarczyć do flasha. Hash musi
   znajdować się w wersjonowanym rejestrze zatwierdzonych obrazów aplikacji;
   obrazy kwarantanny muszą być odrzucane przed kontaktem z urządzeniem.
   Skróty budujące i od razu flashujące są wyłączone; build, przegląd manifestu
   i zapis dokładnego obrazu są trzema oddzielnymi etapami.
4. Przed każdym przyszłym zapisem właściciel dostaje manifest: source SHA, hash i
   rozmiar obrazu, lane, bazę GUI/renderera, obecność logo-packa, hash katalogu,
   schemat konfiguracji, jedną zmianę zachowania oraz dokładny rollback.
5. Po manifeście wymagane jest nowe jawne potwierdzenie. Autoryzacja całej sesji
   nie zastępuje potwierdzenia konkretnej binarki.
6. Każdy kandydat ma jedną zmianę behawioralną i jeden commit. Na FAIL wracamy do
   poprzedniego dokładnego obrazu, bez dokładania następnej poprawki.
7. Po flashu wymagane są kolejno: `verify_flash`, powtarzany boot SHA, kontrola
   bieżącego GUI/logo/katalogu i dopiero potem scenariusz audio.
8. Zgłoszenie właściciela o złym GUI, logo, stacji lub dźwięku jest warunkiem
   stop. Nie kontynuujemy „żeby zebrać jeszcze chwilę danych”.
9. Pełny backup 16 MiB pozostaje prywatny i zweryfikowany; normalne kandydaty są
   zapisywane tylko do jawnie potwierdzonej aktywnej partycji aplikacji.
10. Capture nie może odejmować liczników przez restart urządzenia. Collector
    zapisuje teraz epoki boot, `reset_reason`, osobne delty na epokę i unieważnia
    globalną deltę, gdy w środku próby wystąpi reboot. Przyszłe próby zachowują
    też oczyszczony komunikat panic/watchdog i backtrace. Bieżący proces został
    uruchomiony przed tym rozszerzeniem, więc jego JSON zachował tylko powód
    resetu. Ważny coredump ELF odczytano osobno, tylko do odczytu, z partycji
    64 KiB i zdekodowano dokładnym ELF-em bieżącej binarki; surowa pamięć nie
    trafia do Git.

## Audyt wielowektorowy

| Wektor | Stan | Dowód / ryzyko | Zamknięta następna czynność |
|---|---|---|---|
| Identyfikacja sprzętu i flash | PASS WITH RISK | wykryto właściwy ESP32 rev. 3.1 i 16 MB; backup 16 MiB zweryfikowany; app-only write i digest przechodzą; rejestr zamyka dokładny obraz/purpose/powierzchnię, a skróty build-and-flash są wyłączone; aktywny slot nie jest jeszcze odczytywany | jawny active-slot preflight przed następnym zapisem |
| Boot i watchdog | FAIL ENDURANCE | `ESP_RST_PANIC` w 2 594 295 ms; 20,674 s wcześniej pull-watchdog BT, 2,086 s wcześniej direct reconnect; coredump pokazuje BTC task w `BTA_AvOpen/connect_int/profile queue`, lecz top crashed-context ma nieważny PC; ostatni loop przed resetem miał 185 ms, więc nie był to 30 s owner-loop watchdog | jeden kandydat bezpieczeństwa recovery: single-flight profile open, pełna telemetria stanu/kolejki i 3/3 `pull_watchdog -> fallback -> reconnect`; bez strojenia PCM |
| Wi-Fi i onboarding | PARTIAL PASS | maks. 8 zatwierdzonych profili, WPA2 minimum, brak autojoin open/unknown, lokalny portal z losowym WPA2 i CSRF; recovery bieżącego ROM-u nie zostało wymuszone | 5/5 utrata/odzyskanie Wi-Fi, pomiar czasu i brak nieznanego połączenia |
| Skany i resolver sieciowy | FAIL FOR H4 | `WiFi.scanNetworks(..., 300 ms/channel)` jest synchroniczne; `prefetchRmfPools()` robi do trzech kolejnych requestów TLS po 5 s w callbacku połączenia, także po późniejszym reconnect; po panice zmierzony obrót owner loop trwał 15 050 ms, a resolver nadal zalogował fałszywe `duration_ms=0` | przenieść do ograniczonego workera/result handoff albo jawnie pominąć po starcie BT; czekać ograniczenie na ważny czas i mierzyć każdy krok |
| Powierzchnie stacji | PASS WITH RISK | 3 API RMF, 5 redirectorów STW i 2 hosty ESKI odpowiadają; RMF ma live pool; Eska i awaryjne RMF nadal zawierają twarde hosty | operator resolver dla ESKI i uczciwa dokumentacja awaryjnych hostów; test wszystkich 9 po zmianie |
| Zdrowie endpointu i retry | FAIL FOR PRODUCT CONTRACT | endpoint jest „healthy” po pierwszej ramce, od razu resetuje backoff i zapisuje LKG; watchdog resetuje swój zegar po dowolnym dodatnim postępie, więc cienki/trickle stream może przez długi czas produkować mniej niż konsumpcja, opróżnić oba bufory i nie zostać obrócony; brak per-endpoint score/quarantine; URL z discovery nie ma allowlisty; parser puli nie ma testu, a odpowiedź chunked jest odrzucana | mierzone okno produkcji PCM/bytes/s i low-water dwell musi wymusić reopen/rotację; potem stable healthy/LKG, score/quarantine, walidacja celu i test odpowiedzi |
| NVS i last-known-good | PASS WITH RISK | A/B config i favorites mają CRC/generation; LKG jest zapisywany po każdym pierwszym dekodowanym bloku, a adres/nazwa BT przy każdym `media_started`, nawet gdy wartości są identyczne | porównanie przed zapisem; LKG dopiero po stabilnym oknie; BT identity tylko przy rzeczywistej zmianie, aby ograniczyć zużycie NVS |
| Lokalne audio | PARTIAL PASS | wcześniejsze odtwarzanie lokalne przechodzi; kolejki i test hostowy zachowują porządek fallbacku; fizyczny fallback po poprawce `44f19e4` nie był jeszcze wymuszony | odłączyć głośnik po pełnym buforze: local <=2 s, zero starvation, potem powrót BT <=30 s |
| Bluetooth/A2DP | FOCUSED PCM PASS / ENDURANCE FAIL | Xiaomi Sound Pocket, Classic A2DP/SBC; skupione 600 s czyste mimo restartu źródła, ale godzina zawiera pull-watchdog, panic w torze profile-open, 100,585 s do ponownego `media_started` i późniejszą pustkę obu kolejek; brak uniwersalnej deklaracji | naprawić panic single-flight na podstawie coredump, potem 3/3 watchdog/fallback/reconnect; drugi dokładny model poszerza publiczną macierz, ale nie blokuje tej prywatnej kostki |
| UI, dotyk, renderer, stacje i logo | PASS WITH RISK | bieżący ROM ma aktualny renderer/katalog/logo-pack; hostowe parity/overflow/render tests przechodzą; blokujący networking może zamrozić reakcję do kilkunastu sekund | touch check podczas recovery i zakaz całych historycznych obrazów bez zgodności powierzchni |
| DRAM i PSRAM | FAIL FOR H4 | w trakcie bieżącego soak minimum DRAM spadło z 12 024 B do 4 892 B; bieżące free wróciło do około 22–28 KB, PSRAM wrócił do wcześniejszego poziomu, więc dotąd brak trendu, ale margines chwilowy jest bardzo mały | dłuższy trend, instrumentacja fazy alokacji, reconnect/station matrix i zamrożenie realnego progu dla tej kostki |
| Manifest zasobów | FAIL AS EVIDENCE | `pcmBufferBytesMax=65 536` nie jest egzekwowane i nie opisuje dwóch ringów po 262 144 ramek stereo (po 1 048 576 B) ani bufora drenażu 524 288 B; pola hardware nadal są `NOT_MEASURED`, test jedynie potwierdza ten placeholder, a próg DRAM 61 440 B jest nieosiągnięty przez bieżący lab | rozdzielić budżety public/lab, wyliczać PSRAM z kompilowanych stałych, zapisywać zmierzone minima z exact-image capture i failować na rozjeździe zamiast tylko przenosić JSON |
| Stack i callbacki | FAIL ENDURANCE / THIN STACK | `loop_stack_words=2 088` jest błędną nazwą telemetryczną: w przypiętym porcie ESP32 `StackType_t` ma 1 B, więc wynik oznacza 2 088 B; to tylko 40 B powyżej oczekującego progu 2 048 B; po 3 618 259 ms mediów callback A2DP przestał ciągnąć dane i pull-watchdog zainicjował zakończone panicem recovery | nazwać jednostkę `_bytes`, dodać callback latency/age i generację single-flight; próg stacku ustalić po 3/3 głębokiego recovery |
| Zasilanie, PMU i bateria | NOT MEASURED | firmware nie publikuje stanu PMU/baterii ani low-battery; mostek baterii, powerbank, ładowanie i przerwa USB-C nie są zakwalifikowane | tabela PMU, odłączenie/powrót USB-C, low-battery, powerbank 8 h, brak resetu/brownoutu |
| SD | NOT MEASURED | produkt nie zależy od SD, lecz H1 smoke slotu nie jest zamknięty | jeden jawny test obecności/braku karty; brak zależności boot/playback |
| RTC i czas | PARTIAL PASS | SNTP jest opcjonalne, recovery używa monotonic clock, RTC jest fallbackiem; discovery TLS rusza jednak przed potwierdzeniem synchronizacji systemowego czasu; brak formalnej próby offline/DST | resolver czeka ograniczenie na ważny czas, potem jawnie używa cache/fallback; boot offline, późniejszy sync, restart i DST bez wpływu na audio |
| Prywatność i onboarding security | PASS WITH RISK | brak telemetry/upload/OTA/cloud; portal lokalny, WPA2, CSRF; capture allowlist; Semgrep secrets 0; NVS nie jest szyfrowane, audio leci publicznym HTTP, a URL z uwierzytelnionego discovery nie odrzuca nieznanych hostów/adresów prywatnych | nie deklarować poufności fizycznej; przed release walidować cele streamu, zrobić SCA/decoder review i osobno ocenić secure boot/flash encryption |
| HLS/AAC w bieżącym lane lab | CURRENT LAB ONLY / EXCLUDED FROM FINAL OWNER IMAGE | kod HLS używa `setInsecure()` i AAC/HE-AAC ma nierozstrzygnięte bramki prawne; bieżący RMF używa MP3, ale składniki są w diagnostycznym lab binary | finalny owner-production i public lane są MP3-only; nigdy nie publikować lab binary; osobny CA/transport/legal review przed ewentualnym powrotem kodeka |
| Licencje i logotypy | BLOCKED FOR BINARY RELEASE | public source ma SBOM/notices; lokalne logotypy i lab AAC nie są publicznym artefaktem; pełne prawa/znaki i odpowiadające source nie są domknięte | osobny release review, bez lokalnego logo-packa i bez AAC/HLS |
| Build i reprodukowalność | PASS WITH DRIFT | przypięte PlatformIO/dependencies; public MP3 lane buduje się: RAM 68 588 B, flash 2 230 993 B, bin 2 237 568 B, SHA-256 `e021a5833212f562d30a5f1b2a25a313c65569b916df1ff7d069e37e28d5b6cb`; hash nie zgadza się już ze starym `rc1-candidate.json` | po zamknięciu kodu odbudować 2x, odświeżyć candidate hash, source lock i wymagane evidence |
| Testy i CI | PASS LOCAL / CI NOT RUN | końcowa pełna bramka: 203/203 Node, 7/7 firmware contracts oraz komplet renderer/parity/source rehearsal; source lock 432 pliki; Semgrep security-audit 2 reguły/0 findingów, secrets 43 reguły/0 findingów; workflow uruchamia `npm run check`, ale nie kompiluje firmware; gałąź nie jest wypchnięta | dodać osobny build public lane do CI dopiero po zamrożeniu evidence; uruchomienie CI dopiero po świadomym push/PR |
| Dowody i dokumentacja | PASS WITH DECLARED DEBT | audyt wykrył w publicznym README/User Guide oraz aktywnym README firmware stary katalog, S26, nieistniejące w urządzeniu location/weather i nieistniejący jeszcze score/quarantine; EN/PL, `STATUS`, `CURRENT-MISSION`, trademarki, speaker matrix, endpoint docs i manifest transportu ustawiono na bieżący stan; resource manifest nadal nie jest dowodem fizycznym | zachować rozdział „zmierzone” vs „otwarte”, domknąć capture i commit bez prywatnych danych; datowanych raportów nie przedstawiać jako current truth |

## Najważniejsze ryzyka poza BT

### P1 — pull-watchdog uruchamia recovery zakończone panicem A2DP

W 2 573 621 ms callback A2DP przestał pobierać PCM i pull-watchdog przeniósł
dźwięk na fallback lokalny, rozłączył profil oraz zaplanował recovery. Po
callbacku `DISCONNECTED` nowa próba zaczęła się w 2 592 209 ms. W 2 594 295 ms
urządzenie zbootowało z `reset_reason=4`, czyli `ESP_RST_PANIC`. Nie było flasha,
drugiego monitora ani uśpienia hosta. Ostatnia próbka pętli przed panicem miała
185 ms, więc nie był to 30-sekundowy watchdog owner loop.

Odczytana tylko do odczytu partycja coredump zawiera ważny ELF zgodny z dokładną
binarką. Symbolizacja pokazuje task BTC w:
`BTA_AvOpen -> btc_av_state_idle_handler -> connect_int ->
btc_queue_connect_next -> btc_profile_queue_handler -> btc_thread_handler`.
Kontekst oznaczony jako crashed ma jednak nieważny `PC=0x20000000` i zerowy
stack pointer. To wystarcza, by zamknąć obszar do profile-open po recovery, ale
nie wystarcza do twierdzenia, czy dokładnie zawiódł assert Bluedroid, uszkodzony
stan kolejki czy wyścig starej i nowej operacji.

Pozostaje jeden, a nie otwarta lista kandydatów BT: serializacja single-flight
całego profile open z direct reconnect, pobudki inbound ACL i żądań pochodzących
z callbacków, generacja każdej próby oraz ignorowanie starych callbacków.
Zmierzony przebieg już odczekał 17 081 ms po dwóch callbackach `DISCONNECTED`
przed następnym direct dial. Kandydatem nie jest więc wydłużenie timera, lecz
jedna własność i fencing cyklu życia. Kandydat musi zachować pełny
panic/backtrace i przejść 3/3 `pull_watchdog -> fallback -> reconnect` oraz 15
minut bez restartu. Nie zmienia PCM, GUI, katalogu ani resolvera.

### P1 — po panice wystąpiło prawdziwe głodzenie streamu RMF

Wi-Fi wróciło po 4,731 s, pierwszy odczyt RMF po 19,696 s, a A2DP media dopiero
po 100,585 s i pięciu próbach połączenia. Później licznik aktywnej ciszy zaczął
rosnąć, gdy `decoded_buffered=0`, a kolejka BT spadła do 6 784–6 912 ramek.
Łącznie przybyło 2 411 520 aktywnych ramek ciszy, około 54,68 s. To wyklucza
starą blokadę 44 100 + 1 024 jako przyczynę tego epizodu.

Źródło potrafiło podać małą porcję, wyzerować `lastProgressMs_` i
`sourceDeadSinceMs_`, po czym znowu produkować poniżej konsumpcji. Nie było
eventu `stall-watchdog` ani `source-dead`; dopiero rzeczywiste stop/reopen
obracały endpoint. Po reboocie licznik zakończył godzinę na 8 startach i 7
stopach. Zamknięty kandydat mierzy wejściowe bajty i PCM w oknach 5 s oraz
obraca po low-water dwell niezależnie od pojedynczej sporadycznej ramki.

To wyjaśnia też trop z przełączeniem stacji. `select()` ustawia koło RMF z
powrotem na indeks 0 i najpierw ładuje zapisany LKG. Bez score/quarantine powrót
na RMF może więc ponownie wybrać ten sam cienki endpoint, a pierwsza mała porcja
PCM znów oznaczy go jako healthy. Przełączenie nie jest trwałym recovery.

Nie ma już pola na zmianę rezerwy PCM. Następny kandydat może dotknąć tylko
telemetrii/klasyfikacji i reakcji na udowodniony sustained-underflow; po nim ten
sam RMF oraz kontrolne Radio ZET muszą przejść od minuty zero.

### P1 — blokujące operacje sieciowe w pętli właściciela

Po połączeniu Wi-Fi callback wywołuje trzy sekwencyjne discovery RMF, każde z
connect/read timeoutem 5 s. Ten sam callback działa również po późniejszym
reconnect Wi-Fi, gdy stos BT już istnieje i sam kod stwierdza, że TLS może nie
mieć wymaganych około 40 KB DRAM. W najgorszym legalnym przebiegu UI, watchdog
streamu i pozostałe sterowanie mogą nie dostać pętli przez około 15–17 s.

Callback najpierw jedynie uruchamia asynchroniczny SNTP, a zaraz potem zaczyna
TLS. Po zimnym starcie systemowy czas może nie być jeszcze ważny, więc discovery
może nie przejść weryfikacji certyfikatu i cały boot pozostaje na twardym
fallbacku. Po trzech requestach kod wpisuje do logu stałe `duration_ms=0`, przez
co właściwy koszt jest ukryty w telemetryce resolvera i widoczny dopiero jako
stall całej pętli.

Zakres naprawy jest zamknięty: blokujące scan/TLS trafiają do ograniczonego
workera z przekazaniem wyniku albo są jawnie pomijane po starcie BT. Samo
opakowanie `HTTPClient` w enum lub maszynę stanów nadal blokuje. Cache pooli
powstaje tylko przed pierwszym startem BT lub z workera; osobny test trzech
timeoutów nie może przekroczyć budżetu pętli właściciela.

### P1 — chwilowy margines DRAM 4 892 B

Nie ma dotąd monotonicznego wycieku: bieżące wartości DRAM i PSRAM odbudowały
się. Minimum historyczne spadło jednak do 4 892 B, więc pojedynczy dodatkowy TLS,
callback lub większa alokacja może wejść w OOM/fragmentację. Poprzednie manifesty
z progiem 61 440 B nie opisują realnej fizyki tego builda i nie są egzekwowane.

Nie zgadujemy progu. Kończymy ten soak, potem mierzymy dokładnie: idle, stream
reopen, Wi-Fi reconnect, BT reconnect i 10 zmian stacji. FAIL to reset/OOM,
malejący największy blok lub powtarzalne schodki bez powrotu.

Obecny `resource-budgets.json` nie zamyka tego ryzyka. Pole
`pcmBufferBytesMax=65 536` nie jest sprawdzane przez collector ani testy, podczas
gdy kod alokuje dwa ringi PSRAM po 262 144 ramek stereo, czyli po 1 048 576 B,
oraz bufor drenażu 524 288 B. Test hardware resource probes potwierdza wyłącznie,
że wartości pozostają `NOT_MEASURED`. Ten manifest jest planem, nie dowodem.

Telemetria stosu również wymaga uczciwej interpretacji. Pole
`loop_stack_words=2 088` jest nazwane błędnie: przypięty port ESP32 definiuje
`StackType_t` jako `uint8_t`, więc to 2 088 bajtów historycznego minimum, nie
2 088 słów. Nie ma dowodu przepełnienia, ale wartość leży tylko 40 B ponad
oczekującym progiem manifestu 2 048 B. Nazwę i jednostkę poprawiamy dopiero w
następnym osobnym buildzie; obecnego ROM-u nie zmieniamy podczas obserwacji.

### P1 — historyczny flash guard sprawdzał bajty, nie produkt

`flash-image` uruchamiał zielone testy bieżącego source, a następnie mógł
sflashować zupełnie obcą, starą binarkę z archiwum. To nie wiązało testowanego
source z obrazem. Wersjonowany rejestr zatwierdzonych obrazów i kwarantanna
hashy są wymagane przed jakimkolwiek kolejnym flashem.

### P2 — zbyt wczesne healthy/LKG i brak per-endpoint quarantine

Pierwszy poprawny blok zeruje retry i zapisuje LKG. Endpoint, który poda moment
dźwięku i natychmiast umiera, może więc zapisywać NVS i krążyć w szybkim recovery
bez narastającego backoffu. To wcześniej dało 81 startów w 3 minuty. Osobno
`persistActiveBluetooth()` zapisuje te same `bt_addr` i `bt_name` przy każdym
`media_started`, również po zwykłym reconnect; ten tor też wymaga no-op
suppression. `select()` resetuje koło RMF do zera i wraca do LKG, więc ręczne
wyjście ze stacji i powrót nie omija zapamiętanego cienkiego endpointu.

### P2 — niewalidowany cel zwrócony przez discovery

Odpowiedź `api.rmfon.pl` jest ograniczona rozmiarem i chroniona TLS, ale
wydobyty string URL jest tylko zamieniany z `https://` na `http://`. Firmware
nie wymaga dozwolonego schematu/hosta/portu i nie odrzuca adresów loopback,
link-local ani prywatnej sieci. Przejęty lub błędny resolver mógłby więc skłonić
kostkę do połączenia z dowolnym celem zaakceptowanym przez bibliotekę audio.
Kandydat musi przejść walidację przed startem dekodera; nie dokładamy tej zmiany
do bieżącej poprawki BT.

Ten sam tor nie ma bezpośredniego hostowego testu parsera puli. Dodatkowo
`fetchJson()` wymaga dodatniego `Content-Length`, więc poprawna odpowiedź HTTP
chunked (`getSize() == -1`) zostanie odrzucona i przejdzie na twardy fallback.
To nie tłumaczy obecnej regresji PCM, ale jest zamkniętym ryzykiem przyszłej
zmiany API operatora.

### P2 — twarde hosty i niezgodna dokumentacja

RMF ma poprawne live discovery, lecz także awaryjne hosty `rmfstream`; ESKA ma
dwa bezpośrednie hosty `smcdn`. Dokumentacja twierdziła jednocześnie, że edge
hosty nie są osadzone. Manifest przypisywał CA zwykłym endpointom HTTP. Prawda
projektu musi mówić wprost: są to publiczne, nieuwierzytelnione fallbacki, które
mogą zmienić się niezależnie od firmware.

### P2 — niezamknięte fizyczne podsystemy

Po poprawce nie wymuszono jeszcze lokalnego fallbacku, Wi-Fi reconnectu i cyklu
głośnika. Nie ma kwalifikacji PMU, baterii, powerbanku i SD. Są to otwarte wiersze,
nie ukryte „prawie pass”.

## Pierwotnie skończona kolejka dalszej pracy

### Etap A — zamknięty bez zmiany firmware

1. Godzina RMF zakończyła się pełnym, oczyszczonym capture i jawnym FAIL.
2. `ESP_RST_PANIC` został rozdzielony od brownoutu/zasilania, a coredump został
   odczytany tylko do odczytu i symbolizowany dokładnym ELF-em.
3. Rejestr obrazów, collector, dokumentacja i pełna walidacja hostowa są
   domykane w jednym commicie. Nie wykonano kolejnego flasha.

### Etap B — najwyżej trzy osobne kandydaty firmware

Kolejność jest stała; każdy punkt to osobny kandydat, test i decyzja:

1. bezpieczeństwo recovery A2DP: single-flight profile-open po pull-watchdog,
   pełny backtrace i test 3/3;
2. własność i zaufanie resolvera: przeniesienie blokujących scan/TLS poza owner
   loop, prawdziwe czasy oraz walidacja schematu/hosta/portu/klasy adresu z
   testem chunked;
3. trwałe zdrowie endpointu: okna bytes/PCM, low-water dwell, score/backoff/
   quarantine, stable healthy/LKG oraz no-op suppression zapisów NVS.

Każdy kandydat ma jeden zewnętrzny kontrakt, jeden commit i jeden focused run.
Nie łączymy ich z geometrią PCM, decoder budget ani GUI. DRAM/stack wolno
zmienić tylko po wskazaniu konkretnej alokacji lub przepełnienia, nie jako
czwarty spekulacyjny kandydat.

### Etap C — finalny owner-production i jego fizyczna macierz

Po przejściu kontraktów powstaje jeden dokładny obraz właścicielski:
prywatny RMF AAC 48/64 kb/s z MP3 fallbackiem, dziewięć stacji, lokalny pakiet
logo 9/9, bez HLS i bez laboratoryjnego sterowania przez serial. Osobny public
lane pozostaje MP3-only. Manifest obrazu właścicielskiego wiąże source, binarkę,
renderer, katalog, logo-pack, schemat konfiguracji i rollback. Dopiero ten sam
obraz, bez zmian bajtów między wierszami, przechodzi:

1. lokalny fallback i powrót BT 3/3;
2. utrata/odzyskanie streamu 5/5;
3. utrata/odzyskanie Wi-Fi 5/5;
4. dziewięć stacji, w tym ZET → inna → ZET oraz trzy stacje RMF;
5. touch/UI podczas każdej fazy;
6. PMU, bateria, USB-C, powerbank, SD;
7. 60 min, 2 h i 8 h, zawsze od minuty zero po zmianie.

### Etap D — osobny public release

1. public MP3-only build 2x deterministycznie;
2. nowy candidate hash, SBOM, notices, SCA i corresponding source;
3. bez prywatnego logo-packa, HLS i AAC;
4. druga dokładna klasa głośnika i uczciwa macierz A2DP/SBC;
5. opcjonalny soak 24 h poszerzający zaufanie community;
6. dopiero potem decyzja o publikacji.

## Czego nie robimy ponownie

- żadnego losowego cofania całych historycznych binarek;
- żadnego historycznego LKG jako testu jednej hipotezy audio;
- żadnego wyłączania Wi-Fi modem sleep podczas aktywnego BT;
- żadnego monolitycznego decode refill ani rezerwy ponad fizyczną równowagę
  streamu;
- żadnego dokładania dwóch poprawek przed jednym capture;
- żadnego `H4 PASS`, publicznego obrazu lub uniwersalnej zgodności głośników bez
  odpowiedniego fizycznego wiersza;
- żadnego uznania braku przyrostu liczników za pełny odsłuch bez potwierdzenia
  właściciela.

## Dowody i komendy końcowe

Zamknięty audyt zawiera:

- prywatny, oczyszczony JSON 60 min i prywatny surowy coredump poza Git;
- osobne delty obu epok, czasy recovery, ciszę, minima pamięci i stos BTC;
- `npm run check`: PASS, 203/203 Node i wszystkie bramki hostowe;
- build `core2-public-candidate`: PASS raz, 2 237 568 B,
  SHA-256 `e021a5833212f562d30a5f1b2a25a313c65569b916df1ff7d069e37e28d5b6cb`;
- dokładny `core2-hardware-lab`: lokalny artifact i obraz urządzenia mają
  2 528 976 B oraz SHA-256 `94c25a9e373f2bc0b3dabeaf4af19483362aa9486a7eafd638f25b2d9e562f12`;
- source rehearsal: PASS, 432 pliki; `git diff --check`: PASS;
- `git status --short --branch`;
- werdykt simplify-gate rozdzielający prywatne użycie, H4 i public release.

## Korekta 19:32 — rozstrzygający A/B dokładnego obrazu 94c

Właściciel potwierdził, że aktywną stacją był RMF. Obraz `7b6f44b1...`, który
zachowywał semantykę odtwarzania 94c, nadal ciął. Natychmiast przywrócony i
zweryfikowany bajtowo dokładny `94c25a9e...` również ciął, i to mocniej.

| Obraz | Okno RMF | Start/stop | Aktywna cisza | Idle cisza | Reset/panic |
|---|---:|---:|---:|---:|---:|
| `7b6f44b1...` | 180 s | 5 / 3 | 286 080 ramek | 102 398 ramek | 0 |
| `94c25a9e...` | 180 s | 3 / 2 | 1 243 008 ramek | 159 998 ramek | 0 |

W dokładnym 94c refill miał n=314, p50=346 ms, p90=596 ms, p99=771 ms i
max=838 ms, chociaż produkował około 186 ms PCM. Wcześniejszy czysty przebieg
tego samego obrazu miał tylko sześć refillów powyżej 150 ms w dziesięć minut i
silniejszy link Wi-Fi (-52 do -59 dBm zamiast -67 dBm). To dowodzi, że 94c nie
był deterministycznym LKG; warunki łącza ujawniły brak kontraktu czasowego.

Zamknięta przyczyna architektoniczna: blokujący odczyt ICY i dekodowanie MP3
dzieliły pętlę właściciela, podczas gdy A2DP stale konsumował PCM. Zmiany
endpointów, AAC, SBC i coexistence nie są dalej dozwolone.

Jedyny następca `f243453...` przenosi odczyt sieciowy do jednego workera core 0,
priority 1, z ograniczonym ringiem SPSC 128 KiB w PSRAM. Dekoder, endpointy,
geometria PCM, SBC i polityka radiowa pozostają bez zmian. Dokładny obraz
`44e97929...` ma 2 442 368 B, przeszedł 209/209 testów Node, 20/20 skupionych
testów firmware, 5/5 bramki profilu BT, trzy warianty kompilacji oraz dwa
identyczne bajtowo buildy owner-production. `7b6f44b1...` jest w kwarantannie.

Następna i ostatnia bramka audio jest binarna: RMF, Radio ZET, powrót do RMF;
bez przyrostu aktywnej ciszy, input underrunów, restartów streamu i bez spadku
skompresowanego bufora do zera po settle. QR pozostaje poza dzisiejszą bramką
audio zgodnie z decyzją właściciela.

## Finalny zapis dnia — 21:41 CEST

Werdykt: `CONDITIONAL_QC_PASS`. Na kostce działa exact `3e7a0cbd...` ze źródła
`791ebd4...`; świeży preflight app0, zapis tylko aplikacji, verify digest i boot
SHA przeszły. Dokładny finalny obraz przeszedł stabilne okna RMF 300 s, ZET
180 s i powrót RMF 120 s bez nowych stopów, ciszy wyjścia, watchdogów,
fallbacków, resetów ani paniców. Sam powrót miał jedną ograniczoną przerwę
~1,41 s, po czym liczniki przestały rosnąć.

Poprzednik `44e97929...` przeszedł pełną pasywną godzinę RMF i pozostaje osobnym
`RESTORE_AUDIO_LKG`. Zgłoszoną chwilowo słabszą responsywność Ustawień zapisano
do obserwacji: UI tick 1 ms, flush 107 ms, lecz owner-loop audio ZET osiągnął
1 411 ms. Przypadkowe odłączenie USB odzyskało pracę bez zarejestrowanego resetu,
ale nie jest formalnym PASS mostka baterii. `PRIVATE_CUBE_FINAL=false` i
`H4_PASS=false` pozostają prawdą.

Zatwierdzony kierunkowo tryb lokalnego białego/różowego/brązowego szumu jest
następnym, osobnym kandydatem źródła i UI. Nie wchodzi do obecnego hasha ani
dzisiejszego flasha; wymaga własnego pełnego gate, soak, odsłuchu i osobnej zgody
na zapis urządzenia. Obecnego ROM-u nie wolno nadpisać częściową implementacją.

## Korekta końcowa 22:58 — szum: responsywność cofnięta na rzecz BT

Pierwszy dokładny obraz z trybem szumu `659e56c...` (źródło `97f3e9b...`)
zachował geometrię i politykę działającego radia, Wi-Fi oraz A2DP. Właściciel
potwierdził efekt białego szumu; przerwany na jego polecenie test zawiera 240 s
ustalonego okna bez przyrostu błędów audio. Znane i zaakceptowane ograniczenie:
play/stop/zmiana koloru reagują po kilku sekundach, ponieważ szum korzysta z
istniejącej dużej kolejki PCM radia.

Jednozmianowy następca `77b16bc...` skrócił lokalny blok do 8 192 ramek i
poprawił odczuwalną reakcję, ale fizycznie zepsuł ważniejszy kontrakt produktu.
Po wyjściu z Noise radio zostało na wyjściu lokalnym, rosły starvation, a retry
BT pozostawał odkładany przy jednym zapełnionym bloku. Obraz jest w
kwarantannie z powodem
`BT_AUTO_CONNECT_REGRESSION_AFTER_NOISE_QUEUE_LATENCY_CHANGE`.

Na wyraźną decyzję właściciela przywrócono `659e56c...`: świeży preflight
potwierdził aktywny app0, zapis objął wyłącznie aplikację, a niezależne verify
potwierdziło digest. Bez dotykania kostki 90-sekundowy capture osiągnął
`bt_media_starts=1` w pierwszej próbie oraz zero starvation, retry, fallback,
watchdogów, stopów streamu i resetów. Finalna granica jest zamknięta: wolniejsza
obsługa szumu jest świadomie przyjęta; nie wolno ponownie stroić jej kolejki w
tej samej gałęzi co zakwalifikowane radio/BT.

Artefakt do testów app0:
`output/flashed/owner-production-659e56c236caad050e08220814839f7d395e410223c2cd05f373fc44fded28ba.bin`.
Dowód auto-BT po rollbacku:
`output/hardware-soaks/2026-07-18T20-52-58.365Z-noise-rollback-auto-bt.json`.
Werdykt pozostaje `CONDITIONAL_QC_PASS`; formalny built-in fallback, pełne 60
min dokładnego obrazu z Noise, testy zasilania i H4 nie są relabelowane jako
PASS.
