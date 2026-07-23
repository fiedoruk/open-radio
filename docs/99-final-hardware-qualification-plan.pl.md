# 99 — Plan końcowej kwalifikacji sprzętowej i domknięcia

> **ZASTĄPIONE:** modele rezerw, kandydaci i kroki wznowienia w tym datowanym
> dokumencie są historyczne. Kanonicznym skończonym procesem wykonawczym jest
> teraz [docs/106](106-final-private-cube-closeout-loop.pl.md), a bieżący
> niezmiennik Bluetooth zapisuje [docs/104](104-cc-stabilization-closeout.pl.md).

English version: [99-final-hardware-qualification-plan.en.md](99-final-hardware-qualification-plan.en.md)

**Start wykonania:** 2026-07-16 08:30 CEST
**Planowane domknięcie:** około T0 + 39 h po przejściu pełnej drabiny
**Właściciel:** Tomasz Fiedoruk
**Tryb wykonania:** nadzorowane czynności fizyczne, autonomiczny build, zapis
dowodów, analiza i dokumentacja

## Stan początkowy

- H0: identyfikacja, prywatny backup fabryczny 16 MiB i weryfikacja rollbacku
  przechodzą.
- Ekran, dotyk, lokalne MP3 i odtwarzanie A2DP/SBC przez zapamiętany Xiaomi
  Sound Pocket przechodzą na fizycznym Core2.
- Obraz laboratoryjny z 2026-07-16 usuwa przypadkowe podwójne tłumienie: suwak
  urządzenia stosuje jedno lokalne liniowe wzmocnienie PCM i nie wysyła zdalnej
  głośności absolutnej AVRCP. Właściciel fizycznie potwierdził zakres 17–57–17
  bez ciszy i bez skoku do 100% po cyklu zasilania głośnika.
- Bramka repo przechodzi 192 testy Node, wszystkie hostowe zestawy firmware,
  deterministyczny renderer, rehearsal źródła i build hardware-lab.
- H4 pozostaje otwarte. Eksperymentalny kandydat z 2026-07-16 osiągnął
  1 153 792 pustych ramek aktywnego A2DP i właściciel słyszał powtarzalne
  przerwy. Ten obraz ma wynik FAIL i nie wolno go używać do dalszej macierzy.
- Z historii sesji odtworzono bit w bit wcześniejszy stabilny obraz o SHA-256
  `0c673848f8dd7de758aeb9513bf5644ec063c9d4252f51f2e36c22161ae42600`.
  Pozostaje zmierzonym punktem cofnięcia, a nie bieżącym kandydatem. Obraz
  hardware-lab `0ab0595616…bfc336` potwierdził nową rezerwę lokalną, ale oblał
  aktywne A2DP przyrostem 775 424 ramek ciszy w 60 sekund. Jego następca z jedną
  zmianą podniósł wyłącznie limit nadrabiania aktywnego PCM i miał SHA-256
  `4a3b82315bc8cbeaa839a92a2aa4ec9634196d30208677b1b38acb390c5b7b35`.
  Przeszedł pełną bramkę programową i kompletny 60-minutowy pasywny przebieg
  A2DP z zerowym przyrostem aktywnej ciszy, starvation, watchdogów poboru i
  restartów stosu. Jeden naturalny stop/start streamu został zamaskowany bez
  aktywnej ciszy, a właściciel potwierdził czysty odsłuch w 39. minucie. Następnie
  oblał drugi cykl fallbacku: po reconnect kolejka BT spadła z 201 600 do 10 880
  ramek, a aktywna cisza wzrosła o 672 000 ramek. Zmierzona przyczyna to limit
  czterech przebiegów pompy dekodera, nie poprawiony już drain A2DP. Następny
  kandydat podniósł ten ograniczony limit pompy dekodera do ośmiu przebiegów.
  Jego SHA-256 hardware-lab to
  `44ede76e686ffaf319435a958d11fae495b865560ee79e779d76f08c23d779c1`.
  Potwierdził lokalny fallback bez starvation i jeden reconnect 6,04 s, ale
  oblał aktywne odtwarzanie po reconnect: właściciel słyszał przerwy, kolejka BT
  spadła do 7296 ramek, a aktywna cisza osiągnęła 1 983 104 ramki. Rezerwa
  dekodera pozostawała przy low-water, co dowodzi, że oba stałe limity pracy na
  obrót pętli właściciela nadal zmieniały opóźnienie pętli sieciowej w limit
  przepustowości audio. Następca usuwa ten sztuczny limit jako jedną korektę do
  poziomu bufora: aktywny drain pracuje do pełnej kolejki BT albo wyczerpania
  PCM, a pompa dekodera może odbudować pełną rezerwę 147 456 ramek i nadal
  zatrzymuje się na high-water. Jego SHA-256 hardware-lab to
  `e8d07bbd47a021cfb7beec71235440be9ee7f9dd983d48d46fdc1d7c17c514e9`.
  Strzeżony flash i lokalny smoke przechodzą. Świeży cykl fallbacku 1 przechodzi
  z recovery `ready`→media 4,22 s, zerowym lokalnym starvation, zerowym
  przyrostem aktywnej ciszy i stabilnymi pełnymi rezerwami. Cykl 2 oblewa potem
  odsłuchowo: aktywny drain opróżnił rezerwę fallbacku dekodera do zera, aktywna
  cisza wzrosła o 1 677 568 ramek, a właściciel słyszał cięcie i pozorne
  przyspieszenie. Następca przypisuje własność rezerwy jawnie: high-water
  dekodera to pełny ring 262 144 ramek, a aktywny drain może kopiować wyłącznie
  PCM ponad zachowaną rezerwę fallbacku 147 456 ramek. Jego SHA-256
  hardware-lab to
  `9ef7fd8af1f1070c85232ae4ce5486bd2409ac1304b3febc528da480256f8a2a`;
  został sflashowany, ale odrzucony przed dopuszczeniem Bluetooth. Po około 90
  sekundach lokalnego playbacku starvation wzrosło do jednego, a starty/stopy
  streamu osiągnęły 13/12. Przyczyną była monolityczna pompa dekodera z 228
  przebiegami, która monopolizowała pętlę właściciela. Następca przywraca
  stabilne osiem przebiegów i przygotowuje kolejkę Bluetooth przed startem
  mediów, gdy wybrane pozostaje wyjście lokalne. Zarówno heartbeat zależności,
  jak i probe firmware są zablokowane do pełnej kolejki BT i zachowania 147 456
  zdekodowanych ramek. Jego SHA-256 hardware-lab to
  `64e263aa18e91f1ef37b1d979e3482b116cccdb049faf39bbc902c81127f49a8`,
  rozmiar 2 374 496 B; 192/192 testów, pełna bramka repo, rehearsal źródła i
  przypięty build hardware-lab przechodzą. Jego 180-sekundowy smoke lokalny
  przeszedł, ale pierwsza granica Bluetooth potrzebowała 51,858 s od `ready`
  głośnika do mediów po trzech kolejnych timeoutach page po 5,122 s. Tor audio
  pozostał czysty podczas tych prób. Niezależny audyt 4 wskazał
  deterministyczną kolizję reconnectu: przypięte źródło A2DP wyłącza page scan,
  gdy zapamiętany głośnik początkowo wywołuje kostkę. Eksperyment bez zmiany
  kodu po factory reset głośnika usunął jego zapamiętany stan inicjatora i dał
  trzy szybkie słyszalne połączenia na trzy, wspierając diagnozę. Następca
  pozostawia kostkę connectable, lecz non-discoverable, akceptuje przychodzące
  A2DP tylko od zapamiętanego adresu i adoptuje przychodzący event CONNECTED do
  maszyny stanów przypiętej biblioteki przed normalną bramką mediów. Nie
  zmieniono żadnego bufora, dekodera, rezerwy retry ani progu routingu audio.
  Jego SHA-256 hardware-lab po pełnej bramce to
  `6487a6fe1b3793e36775287bba50345aa7e6ad27998a513ffa9e65af78558b64`,
  rozmiar 2 375 216 B; 192/192 testów, pełna bramka repo, rehearsal źródła,
  skupione kontrakty i przypięty build przechodzą. Został sflashowany raz i
  przeszedł świeży lokalny smoke 180 s podczas 11 prób do wyłączonego sinka z
  zerem starvation, restartów streamu, aktywnej ciszy i watchdogów. Cykl
  reconnectu 1 przeszedł w 9,629 s od ready głośnika do mediów, ale cykl 2
  oblał: link zajął 127,622 s od ready, a media nie wystartowały przed końcem
  300-sekundowego capture. Przyjęte linki miały etykietę `local`; nie
  potwierdzono wiarygodnie ścieżki inicjowanej z głośnika. Czasy prób stały się
  też mieszane (5–22 s), więc diagnoza page scan z audytu 4 jest najwyżej
  częściowa. Ten obraz P0 jest odrzucony z kwalifikacji; bufory audio i routing
  pozostają zamrożone, bo ich liczniki były czyste w obu cyklach.
- Bieżący zestaw zmian pozostaje lokalny do zakończenia dowodów, dokumentacji,
  source locka, commita i synchronizacji CI.

## Kontrakt końcowej akceptacji

Kostka jest finalna dopiero wtedy, gdy każdy obowiązkowy wiersz niżej ma dowód
pomiarowy. Recovery, które kiedyś kończy się sukcesem, ale przekracza limit
czasu, jest porażką, nie częściowym przejściem.

| Obszar | Wymagany wynik |
|---|---|
| Boot i rollback | normalny boot, brak pętli resetów, zweryfikowany prywatny rollback pozostaje używalny |
| Audio lokalne | 60 minut z jednym wymuszonym recovery streamu, brak słyszalnej przerwy poza recovery |
| Główny Bluetooth | Xiaomi A2DP/SBC, głośność 5–100%, brak podwójnego tłumienia PCM |
| Recovery Bluetooth | trzy z trzech cykli na jednym dokładnym kandydacie; fallback lokalny do 2 s od callbacku rozłączenia; powrót A2DP do 30 s od gotowości głośnika |
| Recovery Wi-Fi/streamu | pięć z pięciu; brak rebootu, nieznanego połączenia i utraty zapamiętanego głośnika; playback wraca do 60 s od dostępności Wi-Fi |
| Stacje | wszystkie dziewięć pozycji startuje albo pokazuje uczciwy, ograniczony błąd operatora; metadane nie są zmyślane |
| Zasilanie i storage | mostek baterii, powerbank, fakty PMU, smoke SD i fallback znanej dobrej konfiguracji przechodzą |
| Drugi głośnik | dokładny model/rewizja nadchodzącego Soundcore/Anker zapisane; A2DP/SBC, fallback, reconnect i zasilanie kostki zmierzone |
| Zasoby | zero resetów watchdog; brak monotonicznego spadku pamięci; liczniki kolejek/watchdog w budżecie |
| Endurance | bramki 60 min, 2 h, 8 h i 24 h przechodzą po kolei |
| Domknięcie źródła | dowody EN/PL, dokładny hash/rozmiar binarki, czysty diff, pełny check, commit i zielone CI |

Zapisany manifest wymaga obecnie co najmniej 61 440 B wolnego wewnętrznego
heapu, największego bloku 32 768 B, 2 048 B zapasu stosu tasku audio i nie
więcej niż trzech underrunów na godzinę. Poprzednie próbki laboratoryjne były
poniżej obu progów DRAM. H4 nie może przejść, dopóki implementacja ich nie
spełni albo oddzielny przegląd oparty na pomiarach nie zastąpi ich uzasadnionymi
bezpiecznymi limitami.

## Rejestr wykonania — stan 2026-07-16 18:51 CEST

Ta tabela jest jedynym licznikiem kwalifikacji. Historyczny pojedynczy sukces
potwierdza sens punktu cofnięcia, ale nie podnosi wyniku świeżej macierzy 5/5.

| Punkt | Stan | Licznik / dowód | Następne wyjście |
|---|---|---|---|
| Plan, capture i prywatność | PASS | plan EN/PL; testy capture PASS | bez zmian zakresu |
| Dokładny kandydat audio | REJECTED | `6487a6fe…558b64`, 2 375 216 B sflashowany raz; bramka software i lokalny smoke 180 s PASS, reconnect 1 PASS, cykl 2 ready→link 127,622 s i brak mediów w capture | niezależny read-only re-audyt, potem jeden minimalny następca; nie flashować ponownie tego obrazu jako kandydata |
| Bluetooth bez przerw | BLOCKED ON RE-AUDIT | diagnostyczny cykl P0 1 PASS w 9,629 s; cykl 2 FAIL; licznik kwalifikacji wraca do 0/5; oba przyjęte linki oznaczone `local` | potwierdzić rzeczywistą ścieżkę inicjatora/profilu, potem pięć fizycznych cykli z zerową deltą aktywnej ciszy |
| Fallback BT → lokalny → BT | TIMING FAIL / AUDIO PASS | lokalny fallback, bufory i liczniki pozostały zdrowe, ale P0 nie dał ograniczonego powrotu; próby trwały od 5 do 22 s | utrzymać mechanizmy audio zamrożone; powrót do 30 s w świeżym 5/5 na jednym zrecenzowanym następcy |
| Wi-Fi i stream recovery | NOT MEASURED | 0/5 | pięć powrotów do 60 s |
| Stacje i metadane | NOT MEASURED | 0/9 fizycznie | tabela dziewięciu wyników |
| Lokalna tożsamość stacji | SOFTWARE PASS / FIZYCZNE OCZEKUJE | dziewięć oryginalnych dla projektu kolorów/monogramów; sieć grafik usunięta w S26 | dziewięć czytelnych fizycznie tożsamości w sweepie stacji |
| PMU, bateria, powerbank i SD | NOT MEASURED | 0/4 grup | dowody bez rebootu i bez zależności od SD |
| Budżet zasobów | BLOCKED | `dram_min=3732 B` i największy blok `4596 B` pochodziły z odrzuconego kandydata `9ef7fd8a`; stabilny runtime zmierzył później około `dram_min=17 204 B` | bieżącą prawdę utrzymują docs/104 i docs/105; uzasadnione limity potwierdzić przez 8 h |
| Drugi głośnik | BLOCKED | sprzęt w drodze; opis zamówienia podany przez właściciela: Soundcore/Anker „Boom Go 3i”, 15 W, 4800 mAh, 24 h, planowane zasilanie kostki | po dostawie: etykieta, dokładna nazwa BT, test A2DP/SBC i wyjścia powerbanku |
| Endurance | IN PROGRESS | pasywne BT 60 min PASS z jednym naturalnym recovery streamu; obowiązkowa bramka lokalna/wymuszona nadal 0/60 min; 0/2 h, 0/8 h, 0/24 h | cztery obowiązkowe bramki po kolei |
| Repo i CI | IN PROGRESS | lokalne testy PASS; commit/CI czekają | czysty diff, commit i zielone CI |

## Rozliczenie audytu CC 5 i cyklu diagnostycznego

Audyt CC 5 został wykonany w wymaganej kolejności bez zmiany rozmiarów
buforów, pompy dekodera, rezerwy retry, wolumenu, routingu ani progów standby.
Pierwszy obraz instrumentacyjny `532c5686…39729` ujawnił błąd samego pomiaru:
czysty page-timeout rejestrowany w callbacku po około 5,13 s był odczytywany
przez supervisor około 0,8 s później i fałszywie klasyfikowany jako `dirty`.
Timestamp został przeniesiony do callbacku bez zmiany zachowania audio.

Następca `6dab43fbfbf6eb941d74f242695fcf4d9ec884c316e99ae16d21114fa9b9ba71`,
2 376 560 B, przeszedł 192/192 testów, pełną bramkę repo, build i strzeżony
flash. Powtórzony smoke lokalny 180 s przeszedł: 11/11 prób miało
`clean_timeout` 5,131–5,146 s, nie uruchomił się żaden listen-hold,
`local_starvations=0`, aktywna cisza i watchdog poboru pozostały zerowe, a
`dram_min` wyniosło 17 332 B.

Jeden cykl diagnostyczny zakończył się FAIL przed macierzą 5/5. Marker
`speaker-ready` zapisano przy 53,610 s. Przy 59,021 s kontroler zgłosił
przychodzące ACL z sukcesem HCI i bez aktywnego dialu
(`dial_age_ms=4294967295`, `stat=256`), ale A2DP nie skompletowało się samo.
Lokalna próba rozpoczęta przy 67,354 s doprowadziła do A2DP CONNECTED przy
67,885 s, czyli 14,275 s po `ready`. Następnie każda zaakceptowana sesja
kończyła się po dokładnie 5 s jako `timeout_phase=buffer`; nie wystąpiło ani
jedno `standby_ready` ani `media_started`. Jedenaście pełnych powtórzeń
CONNECTED → buffer timeout → disconnect spowodowało widoczne na GUI
`local ↔ BT`, słyszalne zrzucanie oraz wzrost `local_starvations` do 11.

Wniosek jest rozdzielony: ograniczony reconnect ACL/A2DP przez lokalny dial
działa, ale zamrożona faza pre-media standby nie potrafi przygotować pełnej
kolejki przed pięciosekundowym timeoutem. Listen-hold nie został uruchomiony,
bo próby przed gotowością głośnika były czyste, a pierwsza próba po gotowości
zakończyła się sukcesem linku. Macierz pozostaje 0/5, soak 60 min nie został
uruchomiony, a kandydat `6dab43fb…b9ba71` jest odrzucony. Następny krok wymaga
jawnej decyzji właściciela, czy odmrozić wyłącznie fazę pre-media standby do
jednej korekty, czy utrzymać zamrożenie i cofnąć eksperyment; nie wolno
improwizować kolejnego mechanizmu reconnectu.

## Werdykt końcowej naprawy Bluetooth — 2026-07-16 20:03 CEST

Ta sekcja zastępuje wiersze bieżącego kandydata we wcześniejszym ledgerze;
historia odrzuconych kandydatów pozostaje dowodem i nie jest przepisywana.
Dokładny kandydat hardware-lab ma SHA-256
`729444cc8343ed025837a63ab8673c6e364eec4ba324bf5266feea982ec6b5d5` i
2 376 960 B. Jego rehearsal źródła to
`feff065b45b5892ee2446bb20199e9d26f8026f6c1f02fc550e561562c1f7452`.
Strzeżony flash zweryfikował każdy zapisany segment po pełnej bramce repo
192/192.

Końcowa naprawa zamyka trzy zmierzone błędy zamiast dodawać kolejny schemat
retry:

1. Bramka pre-media A2DP przyjmuje poziom siedmiu ósmych kolejki BT, nadal
   zachowując pełną rezerwę fallbacku 147 456 zdekodowanych ramek. Usuwa to
   niemożliwy wyścig dokładnej równości z pełnym ringiem, gdy task A2DP już
   pobierał PCM.
2. Pasywne listen-holdy zostały usunięte. Udane inbound ACL zapamiętanego
   głośnika natychmiast budzi normalny lokalny dial źródła A2DP w pętli
   właściciela. Zaobserwowane ABI Arduino/IDF koduje sukces ACL jako `0x100`, a
   page timeout jako `0x104`, dlatego dial uruchamia tylko zerowy dolny bajt
   statusu. Opóźnienie retry jest liczone od rzeczywistego callbacku A2DP
   `DISCONNECTED`, nie od wcześniejszego żądania abortu, którego zwijanie może
   trwać dłużej niż samo opóźnienie.
3. Wyłącznie podczas aktywnego Bluetooth pompa dekodera pracuje do istniejącego
   high-water zamiast kończyć po ośmiu przebiegach ramki MP3. Tryb lokalny
   zachowuje stabilny limit ośmiu przebiegów, aktywny drain zachowuje pełną
   rezerwę fallbacku i sekcje krytyczne po 256 ramek, a bezpiecznik ośmiu
   przebiegów bez postępu wyklucza zapętlenie tasku właściciela.

Kompletny oczyszczony dowód
`2026-07-16T17-59-11.979Z-final-bt-off-on-verdict.json` wskazuje dokładną
binarkę powyżej. Właściciel włączył głośnik przy 25,620 s i oznaczył gotowość
przy 66,370 s. Udane inbound ACL przyszło przy 67,104 s; dial pętli właściciela
skompletował A2DP w 345 ms, `standby_ready` wystąpiło przy 71,506 s, a media
ruszyły przy 74,098 s. Ready→media wyniosło więc **7,728 s**, w limicie 30 s.
Aktywny Bluetooth pozostał wybrany do końca pełnego capture 240 s. Końcowe
kolejki dekodera i BT miały 261 888 i 260 864 ramek. Delty wyniosły
`local_starvations=0`, starty/stopy streamu `0/0`,
`bt_active_silence_frames=0`, `bt_idle_silence_frames=0` oraz
`bt_pull_watchdogs=0`; właściciel potwierdził czysty odsłuch.

**Werdykt:** dokładny obraz hardware-lab przechodzi ten końcowy funkcjonalny
cykl Bluetooth OFF→ON i usuwa odtworzone niedopełnienie audio po reconnect.
Pozostaje kandydatem sprzętowym. To **nie jest jeszcze PASS release ani H4**:
po wcześniejszych nieudanych następcach właściciel skrócił planowaną macierz z
5/5 do 3/3, a na tym finalnym SHA wykonano jeden pełny cykl. Świeżo pozostały
2/3 cykle reconnect oraz obowiązkowa bramka 60 min z jednym wymuszonym recovery
streamu. Żadna kolejna zmiana firmware nie może odziedziczyć tego PASS; zmiana
binarki zeruje te liczniki.

## Rozliczenie niezależnego audytu — audyt CC 4

Lokalny, ignorowany przez Git raport CC pozostaje szczegółowym zapisem audytu.
Ta tabela jest kanoniczną listą dalszych prac, aby żadne znalezisko istotne dla
release nie zależało od lokalnego pliku ani pamięci sesji.

| Znalezisko | Decyzja i moment wykonania | Dowód zamknięcia |
|---|---|---|
| Siedem nieudanych prób trwało 5,121–5,123 s, a ten sam recovery 51,858 s powtarzał się między buildami | Regresja bufora audio jest wykluczona, ale proponowane wyjaśnienie page scan klasycznego Bluetooth było niepełne. P0 włączył nasłuch connectable/non-discoverable zapamiętanego peera i adopcję stanu incoming, lecz po PASS 9,629 s dał ready→link FAIL 127,622 s z mieszanymi próbami 5–22 s | P0 `6487a6fe…558b64` ODRZUCONE. Przed kolejną zmianą zachowania ponownie zbadać call graph przypiętego profilu, trwałość scan mode i wiarygodność instrumentation inicjatora |
| Kandydat `9ef7fd8a…6f8a2a` zachowywał rezerwę dekodera, ale jego monolityczna pompa 228 przebiegów wywołała jedno lokalne starvation i 13/12 startów/stopów streamu po około 90 sekundach, przed dowolnym testem BT | Potwierdzona regresja przepustowości lokalnej. Przywrócić stabilne osiem przebiegów; budować zapas BT tylko w fazie standby przed mediami; zablokować probe biblioteki i firmware do gotowości kolejki BT i rezerwy fallbacku | Następca `64e263aa…f49a8` musi przejść co najmniej 180 sekund lokalnego playbacku przed dopuszczeniem BT, potem pokazać `standby_ready` przed mediami i utrzymać 147 456 zdekodowanych ramek bez przyrostu aktywnej ciszy |
| Kandydat `e8d07bbd…c514e9` usunął stałe limity nadrabiania, ale aktywny drain po reconnect zużył rezerwę fallbacku dekodera do zera; aktywna cisza wzrosła o 1 677 568 ramek, a właściciel słyszał cięcie/pozorne przyspieszenie | Potwierdzony błąd własności rezerwy. Ustawić aktywny high-water dekodera na pełny ring 262 144 ramek i pozwolić drainowi kopiować tylko ramki ponad zachowaną rezerwę 147 456 | `9ef7fd8a…6f8a2a` zamknął niezmiennik rezerwy, ale wprowadził osobną regresję lokalną; zachować niezmiennik w `64e263aa…f49a8` i zrestartować macierz od 0/5 |
| Kandydat `44ede76e…d779c1` podniósł pompę dekodera do ośmiu przebiegów, ale nadal nie zasilał A2DP po reconnect; kolejka BT spadła do 7296, aktywna cisza osiągnęła 1 983 104 ramki, a PCM dekodera pozostawał przy low-water 147 456 | Potwierdzona wspólna przyczyna: stała praca dekodera i drainu na obrót pętli właściciela. Zastąpić oba limity jedną korektą do poziomu bufora; istniejące high-water i sekcje krytyczne BT po 256 ramek pozostają | Następca `e8d07bbd…c514e9` ma utrzymać aktywną ciszę +0 i odbudować obie rezerwy po każdym reconnect; macierz restartuje od 0/5 |
| Kandydat `4a3b823…b7b35` utrzymał stabilne A2DP przez 60 minut, ale po drugim reconnect produkował tylko około 30 tys. ramek/s; kolejka BT spadła 201 600→10 880, a aktywna cisza wzrosła o 672 000 ramek mimo formalnie działającego streamu | Potwierdzony limit przepustowości po stronie dekodera: cztery przebiegi ramki MP3 na obrót pętli właściciela. Eksperyment z ośmioma przebiegami nie zamknął klasy limitu na obrót; zastępuje go korekta do poziomu bufora | Zachować historyczny PASS 60 min, ale nie promować tej binarki i nie liczyć izolowanego reconnect PASS do świeżej macierzy |
| Aktywny drain A2DP kandydata `0ab0595…fc336` był ograniczony do 4096 ramek na obrót pętli właściciela, około 31 tys. ramek/s przy zmierzonym rytmie pętli sieciowej wobec wymaganych 44,1 tys. ramek/s | Zamknięte w `4a3b823…b7b35` jedną zmianą: limit nadrabiania 8192 ramek przy zachowaniu sekcji krytycznych po 256 ramek | PASS: kompletny 60-minutowy capture `bt-steady-60m-candidate-4a3b823`, aktywna cisza +0 i kolejka 261 632→260 864; macierz fizyczna restartuje od 0/5 |
| Potwierdzony łańcuch awarii fallbacku: konkurencja próby BT, utrata streamu i synchroniczny reopen | Przyjęte; mechanizmy rezerwy, retry i mostu pozostają niezmienione w następnym kandydacie, który musi przejść scenariusz awarii jako pięć niezależnych cykli po 300 s | 5/5 z zerem lokalnych zagłodzeń, aktywnej ciszy A2DP i watchdogów poboru; słyszalny PASS w każdym cyklu |
| H1: do 512 KiB kopiowane pod jedną sekcją krytyczną w moście BT→local | Nie uruchomiło go odsłuchowe FAIL `44ede76e…`, bo towarzyszył mu przyrost aktywnej ciszy i pusta kolejka BT. Nadal mierzyć; tylko słyszalna przerwa przy czystych licznikach uruchamia chunkowanie | Pięć czystych odsłuchowo cykli; po uruchomieniu poprawki świeże 5/5 na obrazie z jedną zmianą |
| H2: retry czeka na dokładnie pełny ring dekodera | Zmierzono 51,86 s FAIL po trzech odrzuconych próbach i 6,04 s PASS w następnym cyklu, bez nadmiernego retry deferral. Zamrozić próg i mierzyć każdy świeży cykl przed zmianą kolejnego mechanizmu | Każdy powrót do 30 s; każda zmiana progu restartuje macierz od 0/5 |
| Evidence nie miało tożsamości buildu | Zamknięte po stronie hostowego capture bez zmiany audytowanego firmware: każdy nowy JSON zapisuje lane, SHA-256 i rozmiar binarki | Pola artefaktu evidence są identyczne z artefaktem strzeżonego flasha |
| Nadchodzącego Soundcore nie było w allowliście discovery | Zamknięte w S26: jawny skan używa filtra Class of Device audio/rendering i nie wymaga profilu nazwy modelu. Zapamiętanie nadal wymaga udanego startu mediów A2DP | Fizyczny wynik A2DP/SBC, głośności, reconnectu i wyjścia zasilania dokładnie dostarczonej sztuki przed przejściem fazy E |
| Obecne progi manifestu DRAM są wyższe od zmierzonego steady state | Nie obniżać po cichu. Wykonać inżynierski re-baseline po bramce 60 min i potwierdzić brak monotonicznego spadku do końca 8 h | Uzasadnione zapisane limity, dowód stosu/największego bloku i jawna decyzja H4 |
| Obraz hardware-lab różni się od lane public-candidate | Obraz lab jest ważny wyłącznie dla prywatnej kwalifikacji. Przed release zbudować niezmienione źródło jako `core2-public-candidate` | Hash lane publicznego oraz jeden cykl fallback i 60-minutowy smoke na tej binarce |
| Synchroniczny open streamu i skan Wi-Fi mogą blokować pętlę właściciela | Zapisywać maksymalny stall loop/audio, a każdą przerwę playbacku lub watchdog traktować jako FAIL; przy ciągłym audio opisać ograniczone znane zachowanie | Brak watchdog/resetu i słyszalnej przerwy, z maksymalnymi stallami w dowodzie endurance |
| Polityka oszczędzania energii Wi-Fi jest niejawna | Przed release przejrzeć i przypiąć zamierzoną politykę koegzystencji; nie zmieniać jej podczas zamrożonej macierzy BT | Jawna polityka w źródle oraz bramka build/test |
| Niezależny audyt nie zmierzył SCA zależności | Przed końcowym commitem/release uruchomić zatwierdzoną analizę zależności bez publikowania zdalnego snapshotu monitor | Brak nierozliczonego blokera HIGH/CRITICAL albo jawna decyzja właściciela |
| Twierdzenie o zestawie DIY z dwóch zakupów | Opublikować dopiero po tym, jak jeden dokładny głośnik A2DP/SBC z wyjściem powerbanku zasili kostkę w wymaganych testach zasilania i endurance | Rekomendacja EN/PL wskazuje zakwalifikowany wiersz macierzy i nie obiecuje uniwersalnej zgodności |

## Harmonogram wykonania

`T0` oznacza przyszły zakończony, zweryfikowany flash następcy po niezależnym
przeglądzie. Poprzedni T0 `6487a6fe…558b64` zakończył się FAIL cyklu reconnectu
2. Harmonogram nie przesuwa kryteriów i nie udaje, że
przeterminowane okno przeszło. Błąd bramki zatrzymuje dalszą drabinę; czas staje
się oknem poprawki i retestu.

| Okno | Praca | Fizyczna czynność właściciela | Dowód wyjścia |
|---|---|---|---|
| przed T0 | read-only re-audyt, jedna minimalna korekta, dokładny snapshot, pełna bramka, build i backup | pozostaw główny głośnik OFF dopiero po pełnej bramce następcy | nowy dokładny hash, pełna bramka PASS i rozliczone wnioski audytu |
| T0–T0+15 min | strzeżony flash i obserwacja bootu lokalnego | obserwuj ekran i audio | zweryfikowane segmenty, brak pętli resetów |
| T0+15–40 min | trzy cykle głównego głośnika | OFF 10 s, ON i `ready` na sygnał | 3/3 bez przerw i w limicie |
| T0+50–90 min | pięć przerw zatwierdzonego Wi-Fi | wyłącz/przywróć AP na sygnał | 5/5 recovery sieci/streamu |
| T0+90–115 min | sweep dziewięciu stacji | wybierz stacje | tabela 9/9 i uczciwe błędy |
| T0+130–170 min | PMU, bateria, powerbank, SD i konfiguracja A/B | czynności fizyczne na sygnał | dowody zasilania i storage |
| T0+170–210 min | kwalifikacja nadchodzącego Soundcore/Anker | podaj dane etykiety, włącz, sparuj i podłącz zasilanie kostki | drugi wiersz macierzy i dowód powerbanku |
| T0+3.5–4.5 h | bramka 60 min z jednym recovery streamu | jedna przerwa sieci na sygnał | próbki minutowe i PASS/FAIL |
| T0+4.75–6.75 h | bramka 2 h BT z jednym recovery Wi-Fi | jedna przerwa sieci | podsumowanie 2 h |
| T0+7–15 h | bramka 8 h na powerbanku z jednym cyklem głośnika | powerbank i jeden cykl | podsumowanie 8 h |
| T0+15–39 h | 24 h endurance niezmienionego kandydata | normalna konfiguracja | pełne podsumowanie 24 h |
| T0+39–40.5 h | synchronizacja źródła i dowodów | końcowe potwierdzenie | czyste repo, zielone CI, werdykt |

## Faza A — korekta reconnectu i obserwowalności

1. Zachować jeden czas życia stosu Bluetooth i jednego zewnętrznego właściciela retry.
2. Utrzymać page scan dla zapamiętanego peera, pozostając non-discoverable.
   Odrzucać inicjowany przez peer link A2DP, jeśli jego adres nie jest zapisanym
   zatwierdzonym adresem, oraz adaptować zaakceptowany przychodzący event
   CONNECTED do maszyny stanów przypiętego źródła przed zwykłym dispatcherem.
3. Zastąpić nieprzyjazny pierwszy rytm 30/60 s stałym, ograniczonym rytmem
   gotowości: po każdej nieudanej próbie czekamy 8 s, bez starzenia do 12/20 s.
   Razem ze zmierzonym czasem samej próby utrzymuje to kolejną próbę w
   kontrakcie 30 s od gotowości. Przed każdą próbą wymagamy dwóch
   slotów lokalnego playbacku i pełnej rezerwy zdekodowanego PCM w PSRAM;
   gotowość sprawdzamy co 250 ms bez zużywania próby retry.
4. Podczas aktywnego A2DP utrzymywać kolejkę BT i rezerwę dekodera. Przed
   startem mediów zachować stabilną pompę ośmiu przebiegów, pozostawić wybrane
   wyjście lokalne i przenosić do kolejki BT wyłącznie PCM ponad rezerwę
   fallbacku 147 456 ramek. Zablokować obie ścieżki startu mediów do pełnej
   kolejki BT. Przy rozłączeniu zachować kolejność kolejek jako most BT→local
   oraz natychmiast napełnić dwa bloki M5Unified dające około 5,94 s playbacku.
   Jeśli bufor standby nie zdąży w 5 s albo dopuszczone media nie wystartują w
   10 s, rozłączyć link i ponowić próbę po 2 s zamiast utrzymywać niemy link.
5. Resetować rytm dopiero po `AUDIO_STARTED`, a nie po samym linku.
6. Zapisywać monotoniczne czasy rozłączenia, próby, inicjatora, połączenia i
   startu mediów;
   nigdy nazw, adresów, SSID ani endpointów.
7. Dodać testy kontraktu walidacji przychodzącego peera, adopcji stanu, rytmu,
   limitu, bramki rezerwy audio, jednego właściciela i punktu resetu.
8. Zachować natychmiastowy fallback lokalny i wykluczyć podwójne wyjście.
9. Uruchomić maksymalny simplify gate, pełny check repo, build hardware-lab,
   deterministyczny rehearsal źródła i strzeżony flash.

## Faza B — interaktywna macierz recovery

Dla każdego z trzech cykli głównego głośnika zapisać liczniki bazowe, wyłączyć
głośnik na dziesięć sekund, potwierdzić audio lokalne, włączyć go i czekać na
start mediów. Cykl przechodzi tylko przy dokładnie jednym fallbacku, bez resetu,
starvation lokalnego głośnika, pętli watchdogu poboru, podwójnego wyjścia i z
osiągniętym celem czasu.

Dla każdego z pięciu cykli Wi-Fi głośnik pozostaje włączony; zatwierdzona sieć
znika na czas obserwacji utraty, a następnie wraca. Urządzenie nie może dołączyć
do nieznanej/otwartej sieci, utracić zapamiętanego głośnika ani wymagać dotyku.
Stream i A2DP muszą wrócić w zadeklarowanych granicach.

## Faza C — sweep treści i funkcji opcjonalnych

Katalog przechodzi w kanonicznej kolejności. Zapisujemy wynik startu, czas do
pierwszego audio, zgłoszony kodek/rate/kanały, obecność metadanych i użycie
fallbacku. Brak `StreamTitle` jest poprawny; zmyślona metadana nie jest. Dane
endpointów operatora pozostają lokalne i nie trafiają do dowodów w Git.

Grafiki stacji są poza bieżącym runtime produktu. Sweep sprawdza lokalną,
oryginalną dla projektu tożsamość kolorem, monogramem i geometrią bez pobierania
obrazów, dekodowania ani stanu cache.

## Faza D — zasilanie, PMU, SD i persystencja

1. Zaobserwować fakty PMU i baterii wewnętrznej na USB-C.
2. Krótko odłączyć upstream USB-C i wykazać mostek baterii bez rebootu; po
   przywróceniu potwierdzić ciągłość playbacku.
3. Powtórzyć na docelowym powerbanku z jedną kontrolowaną przerwą.
4. Włożyć znaną dobrą kartę SD bez sekretów, potwierdzić detekcję i wyjąć po
   smoke; SD nie może stać się zależnością bootu ani playbacku.
5. Sprawdzić recovery konfiguracji A/B przez zatwierdzoną testową mutację tylko
   najnowszego slotu. Starszy zatwierdzony slot musi się wczytać. Nigdy nie
   kasować całego flasha ani nie nadpisywać backupu fabrycznego.

## Faza E — kwalifikacja głośników

Główny wiersz to Xiaomi Sound Pocket `MDZ-37-DB`. Drugim ma być nadchodzący
Soundcore/Anker opisany w zamówieniu jako „Boom Go 3i”. Oficjalna strona podaje
15 W, 24 h pracy i wyjście powerbanku 4800 mAh, a FAQ kodeków wymienia SBC i
AAC. Są to deklaracje dostawcy, nie wynik fizyczny. Profil nazwy nie jest
potrzebny: jawny skan używa standardowego Class of Device audio/rendering i
negocjacji A2DP. Po dostawie należy odczytać dokładny model/rewizję z etykiety.
Każdy wiersz zapisuje tylko model/rewizję, wynik A2DP/SBC, zachowanie głośności,
fallback, czas recovery i werdykt kwalifikacji. Adresy Bluetooth są zabronione.

Język zgodności pozostaje oparty na interoperacyjności A2DP/SBC. Wynik dwóch
głośników nie staje się twierdzeniem o każdym obecnym i przyszłym modelu, a
produkty wyłącznie LE Audio pozostają poza kontraktem Core2.

## Faza F — drabina endurance

Bramka 60 min obejmuje lokalny playback i jedno wymuszone recovery streamu.
Bramka 2 h używa Bluetooth i jednego recovery Wi-Fi. Bramka 8 h używa docelowego
powerbanku i jednego cyklu głośnika. Bramka 24 h używa dokładnie finalnego
kandydata bez zmian kodu, schematu konfiguracji i zależności po starcie.

Co minutę zachowujemy wyłącznie oczyszczone wartości: czas, trasę, starty/stopy
streamu, próby/retry/fallbacki/starty mediów Bluetooth, aktywną/bezczynną ciszę,
callbacki/watchdogi poboru, wolny/minimalny/największy blok DRAM, wartości PSRAM,
zapas stosu pętli i maksymalny zgłoszony czas loop/audio/UI. Oceniamy delty, nie
tylko ostatnią linię.

## Przepływ dowodów i prywatność

- Surowy serial pozostaje lokalny i ignorowany jako `*.log`; nigdy nie trafia do Git.
- Narzędzie capture przepuszcza tylko dozwolone rekordy `memory`, `audio_qc`,
  stanu połączenia, retry, startu mediów, formatu i reset reason oraz redaguje ID.
- Każda sesja tworzy oczyszczone podsumowanie JSON i przejrzany werdykt Markdown
  w `hardware/`.
- SHA-256 i rozmiar binarki są dowodem publicznym; hashe backupu fabrycznego,
  adresy urządzeń, tożsamość Wi-Fi, dane logowania i endpointy są prywatne.
- `hardware/speaker-qualification-matrix.json` wychodzi z `NOT_MEASURED` dopiero
  po przejściu odpowiadającego mu fizycznego wiersza.

## Warunki zatrzymania i rollback

Zatrzymujemy bramkę przy każdym panicu, resecie watchdog, pętli bootu, wycieku
credential/ID, połączeniu z nieznaną siecią, nieograniczonej pętli retry, braku
fallbacku lokalnego, podwójnym wyjściu, monotonicznym spadku pamięci, uszkodzonym
UI albo wzroście liczników poza budżetem. Zachowujemy ślad awarii, diagnozujemy,
poprawiamy, uruchamiamy pełną bramkę i zaczynamy dany szczebel od minuty zero.

Fizyczna pętla start/reconnect `64e263aa…f49a8` jest twardą granicą przeglądu.
Każde słyszalne cięcie, pozorne przyspieszenie, miganie trasy BT→local→BT albo
recovery poza limitem zatrzymuje dalsze poprawki i flashe. Zachowujemy dokładną
binarkę, diff i zanonimizowane evidence oraz przekazujemy je do niezależnego
niezależnego przeglądu drugiego agenta przed dalszym wdrożeniem.

Rollback pozostaje zweryfikowanym prywatnym obrazem fabrycznym 16 MiB przez
strzeżony skrypt i jawne potwierdzenie rollbacku. Plan nie zawiera erase-all,
eFuse, OTA, publicznego uploadu ani release.

## Końcowe domknięcie

Po przejściu każdego szczebla aktualizujemy `STATUS.md`, `CURRENT-MISSION.md`,
dowody sprzętowe EN/PL, macierz głośników, pomiary zasobów i hash kandydata.
Odtwarzamy deterministyczny RC1 source lock, uruchamiamy `npm run check` i
`git diff --check`, przeglądamy pełny simplify gate, robimy świadomy commit i
wymagamy zielonego CI. Dopiero wtedy projekt może zgłosić `H4 PASS`; publiczna
binarka i szerokie twierdzenie o zgodności pozostają oddzielną decyzją release.
