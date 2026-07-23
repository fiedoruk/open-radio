# 105 — Zamknięcie finalnego buildu prezentowego i QC-9

[English version](105-final-gift-build-and-qc9-closeout.en.md)

**Data:** 2026-07-17
**Commit źródłowy urządzenia:** `b198e0a` — `Rotate Eska between smcdn hosts instead of pinning one`
**Lane:** `core2-hardware-lab`
**Werdykt użytku prywatnego:** `OWNER ACCEPTED / GIFT READY / IN PRODUCTION USE`
**Werdykt release:** `TO NIE JEST PUBLICZNY RELEASE ANI PASS H4`

To finalny datowany zapis urządzenia po stabilizacji 2026-07-17 i
dziewięciostacyjnym smoke-QC. Commit `c339b2a` był pośrednim zinstrumentowanym
punktem tej samej linii. Finalny obraz urządzenia zbudowano z `b198e0a`, który
był `HEAD main` przed tym wyłącznie dokumentacyjnym closeoutem. Kostka jest
odłączona od hosta deweloperskiego i działa z głośnikiem Bluetooth jako prezent.

## Zaakceptowane zachowanie produktu

- MP3 128 kb/s jest domyślną talią źródeł. Lane hardware-lab zachowuje talię
  HE-AAC/aacp jako automatyczny fallback po serii awarii kandydatów MP3; lane
  publiczny pozostaje MP3-only do osobnej bramki prawnej i zasobowej.
- Każda ścieżka śmierci streamu czyści aktywny endpoint. Ogłoszone martwe źródło
  może otworzyć się ponownie po 2 sekundach, rotacja kandydatów trwa dalej, a
  Eska zmienia dostępne hosty smcdn zamiast przypinać jeden.
- Zapamiętany głośnik Bluetooth Classic A2DP/SBC łączy się automatycznie. Jawny
  skan akceptuje Class-of-Device audio/rendering; w oknie parowania przychodzący
  kompatybilny głośnik może zostać przyjęty i zapamiętany. Nie ma allowlisty nazw
  modeli.
- Coexistence Bluetooth pracuje w trybie zbalansowanym. Głośnik wbudowany Core2
  jest obowiązkowym fallbackiem podczas ograniczonych prób reconnectu.
- „Teraz gra → Zapisz” działa na każdej stacji: wybór seeduje tytuł nazwą
  stacji, a prawdziwy ICY StreamTitle zastępuje go, gdy jest dostępny.
- Sieciowy runtime logotypów stacji jest usunięty. Lane hardware-lab może
  wbudować opcjonalny build-time logo-pack 9/9; buildy publiczne zachowują
  oryginalne dla projektu placeholdery.
- Właściciel zaakceptował MP3 przez Bluetooth jako czyste w finalnym odsłuchu.
  Kostka i głośnik tworzą zamierzony samowystarczalny zestaw prezentowy.

## Ustabilizowane niezmienniki runtime

Aktywny model rezerw to model zamrożony w
[docs/104](104-cc-stabilization-closeout.pl.md), a nie starsze modele z docs/99,
docs/100 lub docs/103.

| Mechanizm | Bieżąca wartość |
|---|---:|
| Praca dekodera na przebieg pętli ownera | 8 192 ramki |
| Podłoga rezerwy lokalnego fallbacku | 44 100 ramek / 1 s |
| Cel standby przed mediami Bluetooth | 88 200 ramek / 2 s |
| Zdekodowana rezerwa wymagana do retry | 44 100 ramek / 1 s |
| Kadencja recovery Bluetooth | losowe 8–20 s |
| Watchdog brudnego dialu | 6 500 ms |
| Watchdog tasku pętli ownera | 30 s |

Monolityczne dopełnianie dekodera, bramki rezerwy powyżej równowagi burstu
live-streamu i page scan podczas aktywnego dialu nie należą do tego modelu.
Te wcześniejsze mechanizmy powodowały martwy dotyk, wielominutowe odraczanie
dialu albo teardown przez stary timeout połączenia wygranego przez inbound BT.

## Zmierzone limity transportu

- W złych falach coexistence Wi-Fi/Bluetooth zmierzony tor TCP LWIP dostarczał
  około 12–14 KB/s. MP3 128 kb/s potrzebuje 16 KB/s, a źródło AAC 48 kb/s około
  6 KB/s. Strojenie buforów nie zastąpi brakującej przepustowości transportu.
- `WiFi.setSleep(false)` przy aktywnym Bluetooth wywołało abort kontrolera. Ta
  mitygacja jest odrzucona.
- Dekodowanie HE-AAC+SBR potrafiło nadal zakłócać transmisję A2DP przy pełnych
  kolejkach i zerowym przyroście wstrzykniętej ciszy. Dlatego MP3 wróciło jako
  talia domyślna, a aacp pozostaje wyłącznie fallbackiem.
- Rzadka drabinka timeoutów DNS/connect LWIP może trzymać jeden przebieg pętli
  przez około 16–17 sekund. QC-9 zobaczyło maksimum 17,1 s raz na 15 minut.
  Zjawisko jest udokumentowane i celowo nietknięte; cache DNS to osobna decyzja.

## Macierz stacji QC-9

Capture `cc-qc9-all-stations` trwał 900 sekund przez Bluetooth na buildzie
`b198e0a`. Nominalne okno każdej stacji wynosiło 90 sekund i zawierało około
10–20 sekund oczekiwanego transientu zmiany/rebufferingu. Wstrzyknięta cisza
jest liczona jako 44 100 ramek na sekundę.

| Stacja | Wstrzyknięta cisza w oknie | Zgony/reopeny streamu | Werdykt |
|---|---:|---:|---|
| RMF FM | 0; trasa lokalna, gdy Bluetooth nadal dzwonił | 0 | OK, bez werdyktu odsłuchu BT |
| Radio ZET | 0 | 0 | **CZYSTE** |
| Antyradio | około 5,8 s, transient plus dwa zgony | 2 | OK z jedną szorstką chwilą |
| Meloradio | około 1,9 s, tylko transient | 0 | **CZYSTE** |
| Złote Przeboje | około 1,8 s, potem 0 | 1 | **CZYSTE** |
| Radio Chilli | około 5,8 s, transient plus wolny start | 3 | OK z jedną szorstką chwilą |
| RMF MAXX | 0, potem około 9,3 s przez dwa zgony edge'a w steady | 2 | OK; chudy wieczorny edge |
| Eska | około 9,4 s przy chudym starcie/odzysku ic1 | 1 | OK; rotacja hostów zadziałała |
| RMF MAXX Club | około 33 s w obserwacji 150 s, 22% | 3 | **NAJSŁABSZE**; chude edge'e MP3 |

Żadna stacja nie utknęła. Każdy zgon streamu zakończył się automatycznym
recovery przez 2-sekundowy reopen source-dead, rotację endpointu i ponowne
napełnienie kolejki. To wynik smoke-QC w zmiennych warunkach RF/CDN, nie pełny
soak.

## Uczciwa interpretacja

- Zaakceptowany prywatny build prezentowy jest operacyjny: dotyk, automatyczny
  Bluetooth, MP3, zmiany stacji, zapis ulubionych i samonaprawa zostały
  zaobserwowane w ustabilizowanej linii.
- Radio ZET, Meloradio i Złote Przeboje były czyste w swoich oknach QC-9.
- RMF MAXX Club jest najsłabszym zmierzonym źródłem. Bieżąca talia fallbacku
  dochodzi do aacp dopiero po przejściu dziesięciu kandydatów MP3; mniejszy próg
  to przyszła zmierzona zmiana firmware, nie część tego closeoutu.
- RMF FM nie ma werdyktu Bluetooth w QC-9, bo jego okno zakończyło się na trasie
  lokalnej, gdy Bluetooth nadal dzwonił.
- QC-9 nie certyfikuje każdego edge'a stacji, środowiska RF, przyszłego
  głośnika ani zasilania. Dowodzi ograniczonego recovery w bieżącej macierzy
  dziewięciu stacji na zaakceptowanej linii buildu prezentowego.

## Zakres i pozostałe bramki

Ten closeout nie autoryzuje żadnej operacji na urządzeniu. Kostka działa
produkcyjnie, a flash, monitor serial, reset i mutacja firmware nie należą do
tego zadania dokumentacyjnego.

Osobnymi bramkami pozostają:

1. Kwalifikacja PMU, baterii wewnętrznej, SD i zewnętrznego powerbanku.
2. Wymuszona macierz recovery Wi-Fi i streamu w kontrolowanych warunkach.
3. Świeże bramki endurance 60 minut, 2 godziny, 8 godzin i 24 godziny.
4. Kwalifikacja A2DP/SBC i wyjścia zasilania per model dodatkowego głośnika.
5. Rebuild public-candidate, przegląd zależności/licencji i kwalifikacja
   publicznego wydania.

Akceptacji prywatnego buildu prezentowego nie wolno przedstawiać jako
uniwersalnej zgodności Bluetooth, zamknięcia H4 ani gotowości publicznego
release.

## Pierwszeństwo dokumentacji

Dla bieżącego buildu prezentowego ten dokument i docs/104 zastępują twierdzenia
o aktywnym kandydacie, modelu rezerw i następnych krokach w docs/93, docs/94,
docs/96, docs/98, docs/99, docs/100 i docs/103. Te pliki pozostają datowanymi
dowodami. Bieżące podsumowanie znajduje się też w `STATUS.md` i
`CURRENT-MISSION.md`.
