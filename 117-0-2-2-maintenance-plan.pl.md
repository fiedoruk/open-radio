# Plan serwisowy 0.2.2 — zakres, tory bezpieczne i ścieżka wykonania

[English version](117-0-2-2-maintenance-plan.en.md)

## Dyrektywa nadrzędna: 0.2.1 jest nietykalną bazą

Wydanie 0.2.1 działa w terenie — audio, Wi-Fi, Bluetooth, logotypy runtime i
responsywny dotyk — i ma walidację na obu rewizjach sprzętu Core2. Cały ten
plan podlega jednej zasadzie: **nic nie może pogorszyć tego, co 0.2.1 już
robi.** Opublikowany `open-radio-0-2-1.bin` nigdy nie jest podmieniany ani
przenoszony; powrót do niego musi być możliwy na każdym kroku (artefakt
zostaje na serwerze pobrań, dokładny obraz w archiwum, a próbny rollback jest
częścią bramki wydania poniżej).

## Tory bezpieczne chroniące święte powierzchnie

Cztery powierzchnie wskazane przez właściciela — audio, Wi-Fi, Bluetooth,
logotypy — chronią szyny wykonywalne, nie obietnice:

1. **Lock zamrożonej powierzchni** (`firmware/manifests/audio-surface.lock.json`,
   bramka `check:audio-surface`): pipeline audio, źródło strumienia ICY,
   płot HLS, ring bajtowy, brama profilu Bluetooth, lokalne źródło szumu
   **oraz — od tego planu — runtime Wi-Fi, magazyn logotypów, runtime stacji
   i sloty stacji** są zamrożone po SHA. Każda edycja obala bramkę, dopóki
   lock nie zostanie świadomie przepisany; przepisanie locka to czynność
   recenzowana i wpisana do planu, nigdy efekt uboczny.
2. **Piny zależności po nazwie + kontrola rozwiązanego drzewa**: każda
   biblioteka rozwiązuje się dokładnie raz na dokładnym commicie; podwójna
   instalacja to twardy błąd (`check-resolved-libdeps`), a CI kompiluje
   firmware przy każdym pushu.
3. **Kontrakt determinizmu**: dwa czyste buildy muszą się zgadzać; 104 bajty
   stempla pochodzenia i ścieżka katalogu builda to jedyne udokumentowane
   różnice (`REPRODUCIBILITY.pl.md`).
4. **Granica katalog-jako-dane**: zmiany listy stacji to dane plus generowane
   tabele — nigdy nie modyfikują logiki C++.
5. **Bramka hostowa**: pełny `npm run check` (38 bramek, 238 testów,
   deterministyczny renderer) na każdym commicie i w CI.
6. **Sprzętowa bramka wydania**: żadna binarka nie wychodzi bez macierzy
   urządzeń z Fazy 4, a flashowanie pozostaje jawną czynnością właściciela.

## Inwentarz kandydatów

Pogrupowane tematycznie; każdy punkt oznacza, czy dotyka zamrożonej
powierzchni (**F**) i wymaga rytuału locka.

### A. Niezawodność i higiena (z audytu przedpublikacyjnego 2026-07-23)

- **A1 (F)** Atomowa publikacja logo runtime: każde ukończone logo
  publikowane jako niemutowalny snapshot za wskaźnikiem release/acquire;
  dzisiejsze przypisanie struktury write-once jest formalnie UB, choć osłony
  ograniczają praktyczny skutek do pominiętej klatki.
- **A2 (F)** Walidacja redirectów faviconów: ponowna walidacja hosta po
  przekierowaniu; odmowa celów prywatnych, link-local i loopback.
- **A3 (F)** Warunkowy prefetch discovery RMF: pobierane tylko pule
  faktycznie używane przez skonfigurowaną dziewiątkę. Pula 29 zostaje —
  RMF Club jest wybieralny z katalogu.
- **A4** Kontrakt PNG/JPEG: QC faviconów przyjmuje JPEG, a urządzenie
  dekoduje tylko PNG; jako logo-capable oznaczane są wyłącznie ikony
  naprawdę dekodowalne.
- **A5** Usunięcie z obrazu osadzonej ścieżki builda i historycznego
  literału fixture (`-ffile-prefix-map`; źródła są już czyste) — jednorazowa
  zmiana bazy determinizmu, opisana w notach wydania.
- **A6** Inżynieria wydania: tag annotated (i podpisany, jeśli klucze
  pozwolą), manifest kanoniczny pisany w chwili cięcia, dowód zimnej
  reprodukcji w checkliście wydania.

### B. UX portalu konfiguracji (dwa niezależne zgłoszenia z terenu)

- **B1** Zniesienie limitu 80 wierszy listy w wyborze stacji (renderowanie
  progresywne plus jawna zachęta „…i N kolejnych — wpisz nazwę").
- **B2** Pole szukania bezpośrednio nad wynikami (pas slotów przesunięty lub
  przyklejony), żeby trafienia były widoczne na telefonie bez przewijania.
- **B3** Wyraźny licznik całości katalogu w nagłówku wyboru.

### C. Odświeżenie katalogu (zwiad 2026-07-23)

- **C1** Ulepszenia sondy: do trzech przekierowań w tym samym schemacie
  podczas QC; zmierzony content-type ważniejszy niż deklarowany kodek ze
  spisu; tolerancja wpisanego bitrate 0, gdy zmierzony strumień spełnia
  politykę.
- **C2** Uczciwość tierów: tier z najlepszej z trzech sond o różnych porach
  dnia — kilka regionalnych stacji publicznych siedzi 0,03–0,04 pod progiem
  B z pojedynczej sondy.
- **C3** Kandydaci na nowe stacje (każdy przechodzi sondę QC i test na
  urządzeniu przed wydaniem): Radio Silesia, Radio Jasna Góra, Radio Kraków
  oraz Radio 357 przez mount revma MP3 po czystym HTTP (przekierowania
  nadające token — katalog przechowuje goły mount, nigdy URL z tokenem).
- **C4** Odpowiednie odświeżenie zestawu faviconów (tylko PNG wg A4).

### D. Otwarte diagnozy (okna urządzeniowe; najpierw diagnoza, fix tylko gdy ograniczony)

- **D1** Pobrania logo obok żywego strumienia padają po około dwóch
  połączeniach; serial z bootu z licznikami per-reason powinien wskazać
  warstwę.
- **D2** Spadek największego wolnego bloku DRAM do ~5 KB podczas wybierania
  Bluetooth.
- **D3** Kadencja ponowień parowania (15 s) i akumulacja underrunów wejścia
  przy przełączaniu stacji na trasie Bluetooth — obserwowane, nigdy
  słyszalne; dane z soaku zdecydują, czy jakakolwiek zmiana jest zasadna.

### E. Dług narzędziowy

- **E1** Lane `core2-onboarding-only`: naprawa albo jawne wycofanie.

### F. Poza zakresem 0.2.2

Żadnych zmian dekodera, żadnego TLS audio (terytorium 0.3), żadnego AAC,
żadnego redesignu UI, żadnych nowych funkcji poza danymi katalogu i polerką
portalu. Wszystko, co dotyka zamrożonych powierzchni poza wymienionymi
punktami A, jest domyślnie poza zakresem.

## Ścieżka wykonania

- **Faza 0 — najpierw szyny (wykonana wraz z tym planem):** zamrożona
  powierzchnia rozszerzona o pliki Wi-Fi/logo/stacji; plan w repo.
- **Faza 1 — praca wyłącznie hostowa:** punkty B i C z testami; pełna bramka
  zielona; zero dotkniętych plików zamrożonych.
- **Faza 2 — poprawki zamrożonej powierzchni:** każdy punkt A jako osobny
  commit z własnym przepisaniem locka, podanym powodem i niezależną recenzją
  drugiego agenta przed scaleniem.
- **Faza 3 — inżynieria wydania:** A5/A6; udokumentowana nowa baza
  determinizmu.
- **Faza 4 — bramka sprzętowa (okna właściciela):** macierz flashowania
  fabrycznie świeżych kostek na każdej rewizji Core2 dostępnej w chwili
  bramki (dziś v1.0 i v1.1; nadchodząca v1.3 dołącza od ręki), smoke dziewięciu stacji plus stacje z konsoli
  (w tym kandydat 357), pełny pass pobierania logo, cykle reconnect
  Bluetooth, recovery Wi-Fi, 60-minutowy soak (domknięcie długo otwartego
  B1), potwierdzenie czasu na baterii na obrazie wydania (pierwszy pomiar
  właściciela 2026-07-23: ~2,5–3 h przy 140–190 mA) oraz próbny
  rollback do 0.2.1.
- **Faza 5 — publikacja:** osobne GO właściciela; 0.2.1 pozostaje serwowane
  obok.

**Reguła stopu:** każdy sygnał regresji świętej powierzchni w Fazie 4
zatrzymuje wydanie; rollback do 0.2.1, root-cause z najwyżej trzema próbami
naprawy i dopiero wtedy powrót do bramki.

## Definicja ukończenia

0.2.2 wychodzi tylko, gdy zachodzi wszystko naraz: pełna bramka hostowa
zielona; kompilacja firmware w CI zielona; dwa zimne buildy odtwarzają hash
wydania; każdy dotknięty plik zamrożony ma zrecenzowany wpis locka; macierz
urządzeń z Fazy 4 zapisana z pokryciem obu rewizji sprzętu; noty wydania
wymieniają każde pozostałe znane ograniczenie; ścieżka rollbacku do 0.2.1
udowodniona, nie zakładana.
