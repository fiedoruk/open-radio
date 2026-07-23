# 16 — Polityka EN/PL

## Kanoniczne powierzchnie

- Kod, identyfikatory, API, konfiguracja i komunikaty developerskie: English.
- Domyślny język interfejsu urządzenia: polski.
- Interfejs urządzenia od pierwszego publicznego wydania: polski i English.
- `README.md`: English.
- `README.pl.md`: polski.
- Instrukcje użytkownika i contribution guide: pełne pary EN/PL.
- ADR i niskopoziomowa dokumentacja techniczna mogą być EN-only po ustabilizowaniu projektu.

## Zasada parytetu

Zmiana znaczenia publicznego dokumentu wymaga aktualizacji drugiej wersji w tym
samym PR. Nie wymagamy identycznej liczby słów, ale zakres, ostrzeżenia i kroki
muszą być równoważne.

## Struktura UI

- Wszystkie teksty przez stabilne klucze, bez stringów w logice.
- Polski fallbackuje do English wyłącznie przy brakującym kluczu w buildzie dev.
- Release stable blokuje brakujące klucze.
- Nazwy stacji nie są tłumaczone.
- Błędy techniczne mają krótki tekst użytkowy i osobny kod diagnostyczny.

## Styl

- Polski: prosty, bez anglicyzmów tam, gdzie istnieje naturalne słowo.
- English: krótkie komunikaty, bez marketingowego nadmiaru.
- Nazwy protokołów i formatów pozostają techniczne: Wi-Fi, Bluetooth, MP3, AAC.
