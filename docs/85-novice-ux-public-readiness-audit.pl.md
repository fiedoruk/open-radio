# Audyt UX nowych użytkowników i gotowości publicznej

[English version](85-novice-ux-public-readiness-audit.en.md)

## Zakres

Audyt traktuje podgląd przeglądarkowy i stronę główną repo tak, jak widzą je osoby
bez historii projektu. Obejmuje codzienne sterowanie, onboarding, ustawienia,
recovery, terminologię, publiczne deklaracje i widoczne artefakty rozwoju. Nie
zastępuje walidacji fizycznego Core2.

## Metoda

Użyto dwóch niezależnych perspektyw: nietechnicznego właściciela radia oraz osoby
DIY, która pierwszy raz trafia z GitHub. Przejścia black-box połączono z review
źródeł, inspekcją 320×240, automatycznym overflow i kontrastem, testami zapisu
oraz testami kontraktów firmware host.

## Poprawione problemy

- **P1:** zamknięcie diagnostyki mogło prowadzić do safe mode także po zdrowym wejściu.
- **P1:** wybór Pełny/Minimalny istniał tylko w labie i nie zapisywał się.
- **P1:** niewspierana stacja HLS mogła wyglądać na poprawnie grającą na ekranie głównym.
- **P2:** Wi-Fi w ustawieniach mogło uruchomić onboarding bez pokazania statusu i celu.
- **P2:** zmiana strony ustawień była nieopisanym przyciskiem bez widocznego celu.
- **P2:** przycisk języka w onboardingu opuszczał flow zamiast zmienić język na miejscu.
- **P2:** karta lokalizacji otwierała techniczny „market pack”.
- **P2:** symulator logiki pomijał jasne potwierdzenie pierwszego dźwięku i ukrywał wejście do ustawień.
- **P2:** powtarzane kontrolki miasta i głośnika mogły się nakładać, a akcje canvas nie miały fokusu klawiatury.
- **P2:** README prowadził najpierw do starszego symulatora i ściany oznaczeń milestone.
- **P3:** `CORE2`, kodeki i etykiety builda trafiały do codziennego UI zamiast języka użytkownika.

## Higiena publiczna

Zalecana ścieżka GitHub to teraz README → strona startowa podglądu → GUI albo
instrukcja użytkownika. Oznaczenia milestone pozostają tylko w dowodach
inżynieryjnych. Publiczne deklaracje rozdzielają symulację software, powtarzalność
źródeł i dowód fizyczny. Prywatne ścieżki workspace i pliki pamięci agenta nie są
publiczną instrukcją.

## Pozostałe ryzyka

Odczucie dotyku, kontrast panelu, FPS animacji, pamięć TLS, wpływ sieci na audio,
współdzielenie RF, głośniki, zasilanie, dopasowanie obudowy i endurance pozostają
niezmierzone do przyjścia sprzętu. Finalna nazwa i publiczny kontakt bezpieczeństwa
również pozostają decyzjami bramki release.

## Werdykt

`PASS WITH RISKS` dla software-only UX i wejścia do repo. W audytowanej ścieżce
przeglądarkowej nie ma znanej pułapki dla nowej osoby. Fizyczna użyteczność i
wszystkie deklaracje sprzętowe pozostają jawnie niezatwierdzone.
