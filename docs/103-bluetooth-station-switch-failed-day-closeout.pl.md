# 103 — Zamknięcie nieudanego dnia Bluetooth i przełączania stacji

> **ZASTĄPIONE (2026-07-17):** model rezerw, kandydaci i kroki wznowienia w tym dokumencie są nieaktualne. Bieżąca prawda bazowa: [docs/104](104-cc-stabilization-closeout.pl.md).

English version: [103-bluetooth-station-switch-failed-day-closeout.en.md](103-bluetooth-station-switch-failed-day-closeout.en.md)

## Werdykt

Sesja 2026-07-16 kończy się wynikiem **FAIL / BASELINE NIEPOTWIERDZONY**.
Nie ma podstaw do twierdzenia, że Bluetooth, dotyk albo przełączanie stacji są
stabilne. H4 i publiczny release pozostają zablokowane.

Repo wraca do `main` na `5b61b66`. Na Core2 pozostawiono rebuild źródła
hardware-lab z commita `ecd69dd`, SHA-256
`0d62d10ba09ec0fae7a76718640c2dc7f32a3c1734ca2d044fa6b83ceb026433`,
2 376 960 bajtów. Flash zweryfikował zapis i zachował NVS, lecz po tym flashu
nie uzyskano końcowego werdyktu właściciela dla dotyku ani czystości audio.
Rebuild nie jest bitowo identyczny z historycznie zaliczoną binarką
`729444cc…b5d5`; tej różnicy nie wolno ukrywać.

Dokładnie pozostawiony obraz jest zachowany prywatnie pod
`output/rollback/ecd69dd-hardware-lab-rebuild-0d62d10b.bin`.

## Odrzucone obrazy i zmiany

| Wersja | SHA-256 / rozmiar | Wynik i powód odrzucenia |
|---|---|---|
| S26 public-candidate | `ac3bda38…583950`, 2 232 656 B | Zmiana stacji zablokowała owner loop na 4 303 ms, z czego audio zajęło 4 102 ms. Po awaryjnym ponownym flashu właściciel zgłosił cięcie i całkowicie niedziałający dotyk. S26 nie jest bezpiecznym rollbackiem operacyjnym. |
| S27 | `cb05f9a5…994d`, 2 232 688 B | Ograniczenie dekodowania do 4 096 ramek skróciło maksymalny loop do 572 ms, lecz po 55 s nadal była trasa lokalna, stos BT nie wystartował, a lokalne starvation wynosiło 1. Rezerwa pre-BT budowała się zbyt wolno. |
| S28 | `c00b6917…9752`, 2 232 688 B | Automatyczny BT osiągnął media dopiero około 46,445 s od startu capture. Sweep stacji skończył się blokadą loop 10 253 ms (audio 10 251 ms), 11 dodatkowymi startami streamu, 2 błędami i 4 stopami. Właściciel zgłosił zwiechę, niedziałający dotyk i cięcie. |
| S29 | `028a9d32…3064c`, 2 233 392 B | Asynchroniczny resolver RMF kompilował się i przechodził testy skupione, ale nie przeszedł końcowej bramki/source-locka i nigdy nie został sflashowany. Zmiany cofnięto. |
| Błędny rollback | S26 `ac3bda38…583950` | Wybrano udokumentowany public-candidate zamiast ostatniego fizycznie czystego toru audio. Objawy natychmiast wróciły. |
| Obraz pozostawiony | rebuild `ecd69dd`, `0d62d10b…26433`, 2 376 960 B | Flash zakończony i zweryfikowany, ale wynik fizyczny po flashu pozostaje niepotwierdzony. To punkt diagnostyczny na jutro, nie PASS. |

## Co wiemy, a czego jeszcze nie wiemy

Potwierdzone z evidence:

- pełne odbudowanie wielosekundowego ringu PCM w jednym `AudioGenerator::loop`
  może monopolizować owner loop przez około 4,1 s i zagłodzić dotyk;
- próba BT do wyłączonego głośnika może zająć wspólne radio około 5,1 s, a
  synchroniczny reopen streamu kolejne około 5,3 s;
- strojenie tylko limitu ramek przenosi błąd między responsywnością UI,
  szybkością przygotowania BT i ciągłością audio;
- S28 utrzymał zerową deltę aktywnej ciszy A2DP, ale nadal zawiesił owner loop,
  więc sam licznik active-silence nie dowodzi responsywności produktu.

Silna hipoteza, jeszcze nie dowód etapowy: blokada 10,253 s w S28 pochodzi z
synchronicznego discovery/open endpointu RMF. Brakuje timerów rozdzielających
resolver, connect, pierwszy read i start dekodera, więc jutro nie wolno od razu
wdrażać kolejnego resolvera jako „potwierdzonej” naprawy.

Osobno nierozwiązane pozostają: długi czas automatycznego łączenia BT, chwilowe
przełączanie local↔BT, zgłoszone niedziałające `Teraz gra → Zapisz`, dotyk
podczas problemu streamu oraz zachowanie po kilku szybkich zmianach stacji.

## Błędy procesu

1. Zmieniano kolejne mechanizmy przed utrwaleniem jednego działającego artefaktu
   rollbacku dostępnego jako plik binarny.
2. S26 został błędnie nazwany bezpiecznym rollbackiem mimo znanego stall 4,303 s.
3. Jeden build próbował jednocześnie zmienić budżet dekodera, zachowanie kolejek
   i resolver. Utrudniło to jednoznaczne przypisanie wyniku.
4. Ocena „gra” była chwilami traktowana zbyt szeroko; nie zastępuje osobnych
   bramek dotyku, trasy, czasu połączenia, starvation i zmiany stacji.
5. Rebuild `ecd69dd` nie odtworzył historycznego SHA. Został poprawnie nazwany
   rebuildem, ale oznacza to, że historycznego PASS nie można odziedziczyć.
6. Po ostatnim flashu zabrakło końcowego odsłuchu i testu dotyku; stan urządzenia
   na exit musi więc pozostać `NOT MEASURED`.

## Zamknięty plan startu jutro

1. **Zero zmian kodu i zero flasha na starcie.** Użyć pozostawionego obrazu
   `0d62d10b…26433` i włączonego zapamiętanego głośnika.
2. Bez otwierania portu przez pierwszą minutę sprawdzić: reakcję dotyku,
   lokalne audio, automatyczny BT i czas do mediów. Zanotować cztery osobne
   wyniki; „gra” nie zalicza automatycznie dotyku.
3. Dopiero potem uruchomić jeden 300-sekundowy capture diagnostyczny wskazujący
   zachowany plik binarny. Otwarcie seriala wywoła reset i jest częścią testu.
4. W capture wykonać dokładnie: start bez dotyku, test dotyku podczas connectu,
   trzy zmiany stacji niermfowych, jedną zmianę na RMF oraz jeden zapis
   `Teraz gra → Zapisz`. Każdy krok ma osobny marker właściciela.
5. PASS diagnostyczny wymaga jednocześnie: dotyk reaguje, brak resetu/paniki,
   max owner loop poniżej 1 000 ms, local starvation 0, active silence delta 0,
   route BT stabilna i automatyczne media do 30 s od gotowości głośnika.
6. Jeśli test obleje, następna zmiana dodaje wyłącznie timery etapów
   resolver/connect/read/decode. Nie zmienia buforów, reconnectu ani routingu.
7. Dopiero po pomiarze jednego etapu wolno wykonać jedną poprawkę i powtórzyć
   cały test od zera. Macierz 3/3 zaczyna się dopiero po PASS diagnostycznym.

## Odłożone funkcje produktu

- Splash, polish obu home screenów i większy picker dziewięciu stacji pozostają
  opcjonalne po zamknięciu niezawodności.
- Automatyczne zapamiętywanie wielu zatwierdzonych Wi-Fi, automatyczny
  zapamiętany A2DP, onboarding hotspotu oraz bezpieczny reset całej historii
  pozostają wymaganiami produktu, ale nie są jutrzejszym pierwszym torem.
- Soundcore/Anker z funkcją powerbanku wymaga osobnej kwalifikacji dokładnego
  modelu, nazwy rozgłaszanej, A2DP/SBC, reconnectu i zasilania Core2.

## Warunek wznowienia

Zacząć od tego dokumentu, obrazu `0d62d10b…26433` i kroku 1 powyżej. Nie
korzystać ze starego closeoutu S25 jako bieżącego PASS. Nie flashować S26–S29.
Nie kontynuować H4 ani release, dopóki jeden dokładny obraz nie przejdzie
diagnostyki dotyku, streamu i Bluetooth razem.
