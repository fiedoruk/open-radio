# 106 — Finalny loop zamknięcia prywatnej kostki

[English version](106-final-private-cube-closeout-loop.en.md)

**Cel:** kanoniczny, skończony proces odbioru gotowej kostki właściciela
**Dotyczy:** jednego M5Stack Core2, docelowego głośnika A2DP/SBC i docelowego
zestawu USB-C/powerbank
**Nie autoryzuje:** zapisu urządzenia, publicznego release, publikacji paczki ani
deklaracji uniwersalnej zgodności Bluetooth

Datowany
[audyt wielowektorowy z 2026-07-18](../hardware/FINAL-MULTIVECTOR-AUDIT-2026-07-18.pl.md)
jest zapisem incydentu i rejestrem dowodów. Ten dokument jest bieżącym kontraktem
wykonawczym. Gdy występuje różnica, zastępuje kolejkę prac z docs/99 i datowanych
raportów zamknięcia.

## Cztery niezależne werdykty

| Werdykt | Znaczenie | Stan przy przyjęciu dokumentu |
|---|---|---|
| `BT_FOCUSED_PASS` | Dokładny obraz z paskiem baterii `3e7a0cbd...` przeszedł stabilne RMF, Radio ZET i powrót RMF; powrót miał jedną ograniczoną przerwę ~1,41 s. | PASS tylko focused |
| `PRIVATE_CUBE_FINAL` | Dokładny obraz właścicielski przeszedł pełną macierz poniżej na tej kostce, docelowym głośniku i docelowym zasilaniu. | BLOCKED |
| `H4_PASS` | Dokładny finalny obraz przeszedł bramki recovery, zasobów i endurance z kompletnym dowodem. | BLOCKED |
| `PUBLIC_RELEASE_READY` | Osobny publiczny, logo-free lane MP3 przeszedł bramki prawne, źródłowe, reprodukowalności i kompatybilności. | BLOCKED i nie blokuje prywatnej kostki |

Skupiony pass Bluetooth nie oznacza passu całej kostki. Odbiór prywatny nie
oznacza gotowości publicznego release.

## Zamknięta architektura i zasady anty-regresji

Drzewo losowego strojenia jest zamknięte. Bieżący owner lane zachowuje sześć
stałych własności:

1. **Bluetooth:** każde otwarcie profilu A2DP jest single-flight i należy do
   jednej obserwowanej generacji próby; stare callbacki nie mogą zakończyć
   nowszej próby. To jest ograniczenie na panic znaleziony w
   `BTA_AvOpen -> connect_int -> btc_queue_connect_next`, nie kolejny retry delay.
2. **PCM:** przed startem mediów dekoder zachowuje rezerwę fallbacku; po starcie
   A2DP kolejka Bluetooth jest właściwą zachowaną rezerwą, więc dekoder nie może
   blokować poprawnych ramek progiem `44 100 + 1 024`.
3. **Wi-Fi i MP3:** odczyty ICY wykonuje jeden niskopriorytetowy worker na core 0,
   który zasila ograniczony ring 128 KiB w PSRAM. Pętla właściciela dekoduje i
   steruje, ale nie czeka już po 500 ms na socket. Krótkie puste odczyty RMF są
   diagnostyką wejścia; FAIL powstaje dopiero przy wzroście ciszy PCM/A2DP,
   stopach albo słyszalnym cięciu.
4. **Współdzielenie radia:** zostaje standardowa zbalansowana koegzystencja.
   Stałe `PREFER_WIFI` głodziło nadajnik A2DP, a doraźne przełączanie polityki
   tylko przesuwało problem. Nie wracamy do modem-sleep, bitpool, AAC,
   resamplera ani scoped-coex bez nowego, jednoznacznego dowodu.
5. **Stacje i recovery:** przełączenie stacji może mieć jeden ograniczony okres
   otwarcia/buforowania, ale późniejsze okno musi mieć zerowy przyrost błędów.
   Nie wolno restartować nadal połączonego źródła tylko dlatego, że chwilowo ma
   low-water; `sustained-low-water` był osobną regresją.
6. **UI baterii:** PMIC jest czytany tylko podczas widocznych Ustawień, raz na
   10 sekund. Procent i napięcie są pomiarem kontrolera; czas jest oznaczonym
   `~` szacunkiem po trzech próbkach prądu. Ta ścieżka nie zmienia audio, BT ani
   Wi-Fi, lecz zmienia bajty obrazu i dlatego wymaga własnego focused QC.

Dokładny `94c25a9e...` pozostaje tylko recovery i znanym FAIL. Obraz
`44e97929...` przeszedł RMF -> ZET -> RMF, głośność i pasywną godzinę RMF. Został
zachowany jako osobny `RESTORE_AUDIO_LKG`. UI-only `3e7a0cbd...` jest odrębnym,
bieżącym `FLASH_OWNER_PRODUCTION` i przeszedł własną bramkę focused
RMF -> ZET -> RMF. Walidator nie pozwala użyć jednego obrazu w roli drugiego;
starsza godzina pozostaje dowodem wyłącznie dla swojego hasha.

Każdy przyszły FAIL wybiera najpierw jeden zmierzony liść: wejście skompresowane,
dekoder PCM, kolejkę BT, profil A2DP, Wi-Fi albo UI/PMIC. Dozwolona jest jedna
poprawka tego liścia i jeden rerun. Drugi FAIL blokuje lane; nie otwiera ruletki
buforami, endpointami lub koegzystencją. DRAM, PCM i stack zmieniamy wyłącznie po
dowodzie konkretnej alokacji, przepełnienia lub monotonicznej utraty.

## Finalny obraz właścicielski

Po przejściu wszystkich wymaganych kandydatów powstaje jeden dedykowany lane
owner-production:

- odtwarzanie MP3-only z bieżącym katalogiem dziewięciu stacji;
- sprawdzony lokalny pakiet logotypów 9/9;
- bez dekodera HLS/AAC i bez laboratoryjnego sterowania przez serial;
- fallback na głośnik wbudowany i zapamiętany głośnik Classic A2DP/SBC;
- bez pobierania logo w runtime, telemetrii, OTA i zależności od prywatnej usługi.

Manifest zapisuje commit źródłowy, SHA-256 i rozmiar aplikacji, lane, tożsamości
renderera i katalogu, schemat konfiguracji, digest logo-packa, jedyną zmianę
zachowania oraz dokładny rollback. Przed jakąkolwiek decyzją o zapisie obraz jest
budowany dwa razy, a bajty aplikacji są porównywane.

Każdy przyszły zapis ma osobną bramkę: czysty i zacommitowany rejestr obrazów,
dokładny hash na allowliście i poza kwarantanną, potwierdzony aktywny slot
aplikacji, manifest pokazany właścicielowi, jawna zgoda na tę binarkę, zapis tylko
aplikacji, niezależne `verify_flash`, kontrola boot SHA i wizualna kontrola
powierzchni 9/9. Bieżący task ani sesja nigdy nie dają zbiorczej zgody na flash.

## Fizyczna macierz odbioru

Poniższe wiersze wykonuje się raz na dokładnym finalnym obrazie właścicielskim.
Między wierszami nie powstaje nowy obraz.

| Wektor | Wymagany wynik |
|---|---|
| Trasy audio | Głośnik wbudowany i docelowy Bluetooth przechodzą; wymuszona utrata BT daje lokalny dźwięk do 2 s i wraca do BT do 30 s, 3/3 |
| Recovery streamu | Wymuszona utrata/reopen streamu przechodzi 5/5 bez restartu, martwego UI i trwałej ciszy |
| Recovery Wi-Fi | Utrata/powrót przechodzi 5/5 do 60 s; brak połączenia z nieznaną lub otwartą siecią |
| Stacje | Przechodzi wszystkie dziewięć, w tym `Radio ZET -> inna stacja -> Radio ZET` i trzy stacje RMF |
| Sterowanie | Dotyk, głośność, ulubione i nawigacja odpowiadają podczas recovery streamu, Wi-Fi i Bluetooth |
| Konfiguracja | Przechodzą boot offline, późniejszy sync czasu i recovery uszkodzonej konfiguracji; jedna destrukcyjna próba resetu/re-onboardingu wymaga osobnej zgody właściciela i planu odtworzenia |
| Sprzęt | Przechodzą display, dotyk, głośnik, mostek baterii, ładowanie, powrót USB-C, docelowy powerbank oraz smoke z kartą SD i bez niej |
| Obudowa | Finalna obudowa nie tłumi dźwięku/wentylacji, pozwala używać sterowania i kabla; brak nadmiernego ciepła, resetu termicznego lub przerwy zasilania |
| Zasoby | Brak resetu, panic, watchdoga i OOM; brak monotonicznego spadku DRAM/PSRAM/największego bloku; telemetria stacku ma poprawne bajty, a callback/owner loop mieści się w zmierzonym budżecie |
| Dowód | Są dokładny SHA, komplet próbek okresowych, `eventsDropped=0`, zero nieplanowanych restartów i znaczniki odsłuchu właściciela |

Liczniki są oceniane osobno dla każdej epoki boot. Restart w środku capture
unieważnia deltę pierwszy–ostatni i powoduje FAIL szczebla, nawet gdy odtwarzanie
później samo wróci.

## Drabina endurance

Dokładny finalny obraz przechodzi kolejno:

1. **60 minut:** ciągłe odtwarzanie z jednym wymuszonym recovery streamu.
2. **2 godziny:** ciągłe odtwarzanie z jednym wymuszonym recovery Wi-Fi i jednym
   cyklem utrata BT/fallback/powrót.
3. **8 godzin:** docelowy głośnik i docelowy powerbank, w tym kontrolowana przerwa
   USB-C zmostkowana baterią.

Pasywne 60 minut bez wymuszonego recovery jest ważnym dowodem stabilności, ale
nie wypełnia pierwszego szczebla H4. Pasywna godzina poprzednika różniącego się
wyłącznie UI nie przechodzi na hash finalny; pozwala jedynie zawęzić focused QC
nowego obrazu i uczciwie nadać warunkowy werdykt dnia.

Każdy przebieg ma odsłuch właściciela blisko początku, środka i końca.
Automatyczne recovery jest zapisywane, ale nie zamienia restartu w PASS. Każda
zmiana bajtów firmware zaczyna wszystkie dotknięte szczeble od minuty zero;
zmiana wyłącznie dokumentacyjna nie.

Soak 24 h i drugi dokładny model głośnika poszerzają zaufanie
publiczne/community. Nie blokują tej jednej prywatnej kostki.

## Pakiet zamknięcia

Produkcję zamykamy dopiero, gdy jeden commit zawiera lub wskazuje:

- manifest finalnego obrazu, dokładne hashe, zweryfikowany prywatny rollback i
  oczyszczone capture każdego szczebla;
- ukończone wiersze stacji, głośnika, recovery, PMU/zasilania, SD, obudowy i
  zasobów;
- zaktualizowane `STATUS.md`, `CURRENT-MISSION.md`, datowany audyt, speaker
  matrix, dowód zasobów i ten dokument;
- wyniki `npm run check`, jawnego buildu owner-lane PlatformIO, parity
  dokumentacji, source rehearsal, kontroli prywatności i `git diff --check`;
- czysty worktree oraz potwierdzenie zamknięcia capture/buildów i własności portu
  szeregowego.

Closeout kończy się czterema jawnymi werdyktami: `BT_FOCUSED_PASS`,
`PRIVATE_CUBE_FINAL`, `H4_PASS` i `PUBLIC_RELEASE_READY`. Push, PR, publiczna
binarka i release pozostają osobnymi decyzjami właściciela.

## Warunkowe zamknięcie dnia i `exit`

Repozytorium może zostać czysto zamknięte przed ukończeniem pełnego H4, jeżeli:

- finalny exact image przeszedł boot/digest, RMF -> ZET -> RMF, głośność i
  owner-audible focused QC bez crasha lub przyrostu ciszy;
- każda niewykonana próba recovery, zasilania i endurance pozostaje jawnie
  `NOT_RUN`/`DEFERRED`, a `PRIVATE_CUBE_FINAL=false` i `H4_PASS=false`;
- dokumentacja wskazuje, który dowód należy do poprzednika UI-only i nie
  przenosi jego godziny na nowy hash;
- pełna bramka repo, source rehearsal, `git diff --check`, simplify gate i
  czysty worktree przechodzą, a proces capture zwalnia port.

Taki stan nazywa się `CONDITIONAL_QC_PASS`, nie produkcyjnym H4. Pozwala zrobić
bezpieczny `exit` z działającą kostką i skończonym repo, pozostawiając zamkniętą,
policzalną listę testów fizycznych na kolejny termin.

## Warunki stop i zasady anty-pętli

Zatrzymujemy się natychmiast przy restarcie, panic, brownout, watchdogu, OOM,
utracie dowodów, złym GUI/logo/katalogu, nieznanej sieci, trwałej ciszy lub cięciu
słyszanym przez właściciela. Zapisujemy dokładny obraz i pierwszy wiersz FAIL;
nie kontynuujemy tylko po to, aby zebrać nominalny PASS.

Nie powtarzamy bisection całych historycznych obrazów, ruletki buforami,
wyłączania modem sleep, monolitycznego decode refill, zmian feature/UI ani kilku
poprawek zachowania w jednym obrazie. Nie uruchamiamy pełnego endurance dla
obrazu, który nie przeszedł focused testu i krótkiej macierzy fizycznej.
Zablokowany wiersz pozostaje uczciwie zablokowany do naprawy dokładnej przyczyny;
nie otwiera nieograniczonej pętli poszukiwań.
