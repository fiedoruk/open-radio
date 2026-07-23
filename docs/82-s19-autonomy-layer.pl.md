# 82 — Warstwa autonomii S19

[English version](82-s19-autonomy-layer.en.md)

## Wynik

S19 domyka wszystko, co można wiarygodnie wykonać i przetestować hostowo bez
uzależniania radia od publicznego dostawcy. Zatwierdzone zabezpieczone Wi-Fi może
automatycznie uruchomić ograniczoną lokalizację IP, małą prognozę pogody i
opcjonalną synchronizację czasu. Warstwa zwraca znormalizowane sugestie
konfiguracji i nigdy nie przerzuca awarii dostawcy do stanu odtwarzania.

## Zachowanie usług

- Lokalizacja IP: dwie próby, timeout 3,5 sekundy, świeży cache 30 dni i stale
  fallback 90 dni dla każdego zatwierdzonego profilu Wi-Fi.
- Pogoda: aktualna temperatura, kod WMO i sześć godzin prognozy do ostrzeżeń o
  opadach; świeży cache 20 minut i stale fallback sześć godzin.
- Czas: opcjonalna synchronizacja `pool.ntp.org` z fallbackiem RTC. Recovery
  nadal używa czasu monotonicznego.
- Globalność: kraj, kandydat języka, strefa, region stacji i współrzędne pogody
  wynikają ze znormalizowanej lokalizacji, a nie z logiki zaszytej pod Polskę.

## Ustawienia ekranu

Ustawienia mają teraz osobną stronę Ekran. Wygaszacz i wyłączenie ekranu można
włączać niezależnie, a wartości zapisują się przez atomowy DeviceConfig V2 A/B.
DTO firmware przenosi te same ograniczone wartości.

Profil domyślny:

- wygaszacz włączony,
- tryb Pulse,
- start po dwóch minutach,
- wyłączenie ekranu włączone,
- panel i podświetlenie wyłączają się po 30 minutach,
- audio, sieć i recovery działają dalej,
- każdy dotyk budzi ekran albo zamyka wygaszacz.

Czasy wygaszacza: 30 sekund, jedna, dwie, pięć i dziesięć minut. Czasy wyłączenia
ekranu: 15, 30 i 60 minut. Tryby: Pulse, Bars i Orbit.

## Granica

Adaptery hostowe, parsery, supervisor cache, kontrakty, GUI, persistence i DTO
firmware są wdrożone i testowane. Fizyczne wiązanie sieciowe firmware pozostaje
wyłączone do pomiaru pamięci TLS, obciążenia schedulera i ciągłości audio podczas
timeoutu dostawcy na Core2. To jedyny pozostały element S19 i wymaga dowodu ze
sprzętu.

## Kontrakt awarii

Najpierw wygrywa świeży cache. Nieudany refresh przechodzi na ograniczony stale
cache. Bez lokalizacji pogoda jest pomijana. Bez wszystkich dostawców radio nadal
używa wbudowanego pakietu kraju i ostatniej działającej stacji. Dostawca nie
dostaje historii słuchania, SSID, tożsamości Bluetooth ani identyfikatora konta.
