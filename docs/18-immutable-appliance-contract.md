# 18 — Kontrakt skończonego urządzenia

## Definicja

Radio jest jednofunkcyjnym urządzeniem, którego docelowy stan to `PLAYING`.
Nie jest platformą aplikacyjną, dashboardem chmurowym ani produktem wymagającym
ciągłego rozwoju po wydaniu stabilnym.

## Czego nie ma

- automatycznego OTA,
- obowiązkowych aktualizacji,
- zdalnego konta lub backendu projektu,
- zdalnej telemetrii,
- okresowego pobierania funkcji, kodu lub aktywnej konfiguracji projektu,
- mechanizmu pluginów i sklepu rozszerzeń,
- celowego feature treadmill po osiągnięciu kontraktu v1.0.

## Co jest w firmware

- pełny snapshot dziewięciu stacji,
- resolvery oficjalnych powierzchni nadawców,
- alternatywne endpointy zatwierdzone podczas QC,
- konfiguracja i last-known-good w pamięci urządzenia,
- recovery supervisor i lokalny dziennik przyczyn,
- bezpieczny fallback audio,
- lokalny portal konfiguracji uruchamiany tylko wtedy, gdy jest potrzebny.

## Granica niezależna od nas

Self-healing naprawia awarie mieszczące się w znanym kontrakcie: utratę Wi-Fi,
DNS/HTTP timeout, zmianę hosta zwróconą przez obsługiwany resolver, cichy stream,
underrun, zerwanie A2DP, uszkodzoną konfigurację i restart zasilania.

Nie może sam napisać nowego parsera, dodać nieznanego kodeka, zaakceptować nowego
regulaminu, przejść captive portalu ani dostosować się do przyszłego profilu
Bluetooth nieobsługiwanego przez układ. Zmiana API nadawcy lub całkowite
wyłączenie publicznego streamu może więc wymagać nowego firmware.

## Rekomendowany bezpiecznik

Brak OTA pozostaje nienaruszony. Proponowany jest tylko jawny, ręczny tryb
`USB rescue`: użytkownik świadomie wgrywa podpisany/reprodukowalny obraz po
fizycznym podłączeniu urządzenia. Radio nigdy nie sprawdza samo, czy obraz
istnieje, i nigdy nie aktualizuje się w normalnym działaniu.

Jeśli maintainer odrzuci także USB rescue, dokumentacja musi uczciwie zapisać,
że nieodwracalna zmiana infrastruktury nadawców może zakończyć obsługę części
stacji na danym egzemplarzu.

## Kryterium „skończone”

Projekt może zostać oznaczony jako feature-complete po spełnieniu jednocześnie:

1. dziewięć stacji przechodzi test transportu na hardware,
2. urządzenie przechodzi 24-godzinny soak Wi-Fi + A2DP,
3. przechodzi scenariusze utraty Wi-Fi, streamu, BT i USB-C,
4. wraca po uszkodzeniu aktywnej konfiguracji,
5. obsługuje zatwierdzoną macierz referencyjnych głośników,
6. publiczny obraz jest reprodukowalny z repozytorium,
7. nie ma otwartego P0/P1 w podstawowej funkcji grania.
