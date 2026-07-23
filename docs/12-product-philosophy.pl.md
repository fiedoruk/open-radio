# Filozofia produktu

## Jedno zdanie

**Radio, które po prostu gra. Bez konta, chmury i śledzenia.**

## Zasady

1. **Niezawodność przed funkcjami.** Odtwarzanie jest ważniejsze niż animacje, metadata i integracje.
2. **Zachowanie urządzenia użytkowego.** Włącz, połącz ponownie i wznów bez codziennej konfiguracji.
3. **Local first.** Dane Wi-Fi, stacje, ustawienia i diagnostyka zostają na urządzeniu.
4. **Skończone urządzenie.** Radio nie wymaga ani nie odpytuje backendu projektu, automatycznego OTA ani zdalnego katalogu.
5. **Last-known-good.** Zepsuta konfiguracja, odpowiedź resolvera lub endpoint nie może zniszczyć ostatniego działającego stanu.
6. **Mały zaufany rdzeń.** Każda zależność i task w tle musi uzasadnić koszt dla niezawodności.
7. **Widoczna awaria.** Ekran rozróżnia błąd Wi-Fi, streamu i Bluetooth.
8. **Łagodna degradacja.** Awaria Bluetooth przełącza dźwięk na wbudowany głośnik.
9. **Jawne działanie.** Dokumentujemy endpointy, wersje zależności i ograniczenia.
10. **Społeczność bez lock-inu.** Forki, lokalne stacje i konfiguracja offline pozostają możliwe.
11. **Produkt PL-first, kod EN-first.** Polski jest domyślnym UI, a kod i interfejsy techniczne są angielskie.
12. **Szacunek dla podmiotów trzecich.** Otwieramy własne motywy; oficjalne logotypy wymagają zgody. Bez retransmisji, nagrywania i sugerowania partnerstwa.
13. **Jeden cel recovery.** Lokalny QC zawsze próbuje przywrócić słyszalne granie.

## Co oznacza viral

Viral nie oznacza zbierania danych ani funkcji społecznościowych. Oznacza:

- urządzenie zrozumiałe w dziesięć sekund,
- czytelny ekran aktualnie granej stacji,
- powtarzalny build i gotowe pliki firmware,
- ekran About z linkiem do repo,
- proste pull requesty do katalogu stacji,
- udostępniane obudowy i oryginalne motywy od dnia zero,
- widoczne autorstwo Tomasza Fiedoruka oraz kontrybutorów.

## Poza MVP

- konta,
- dashboardy chmurowe,
- analityka słuchania,
- nagrywanie,
- podcasty i catch-up,
- Spotify i usługi DRM,
- automatyczne OTA i odpytywanie katalogu projektu,
- wiele głośników Bluetooth,
- sterowanie z telefonu,
- publicznie dołączone oficjalne logotypy stacji bez zgody.

Ograniczony wyjątek zatwierdzony przez właściciela: lokalnie syntetyzowany
szum Biały, Różowy i Brązowy jest drugim i ostatnim trybem odtwarzania. Nie
dodaje usługi sieciowej, pobieranego audio, powierzchni rozszerzeń ani zależności
dla grania radia.
