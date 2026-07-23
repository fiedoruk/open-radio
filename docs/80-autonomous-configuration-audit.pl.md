# 80 — Audyt autonomicznej konfiguracji

> Stan implementacji został rozszerzony w S19. Zasady audytu pozostają ważne;
> adaptery hostowe i ograniczone cache opisuje dokument 82.

[English version](80-autonomous-configuration-audit.en.md)

## Werdykt

Poprzednia interpretacja prywatności była zbyt szeroka. Minimalizację danych
potraktowała jak zakaz bezpośrednich zapytań do publicznych usług i kazała
użytkownikowi wybierać informacje, które urządzenie może ustalić samo. Poprawna
zasada brzmi: najpierw automatyzacja, dane lokalne gdy to możliwe, jawny opis
niezbędnego ruchu zewnętrznego, cache i zawsze działające radio offline.

## Pipeline lokalizacji

Po uruchomieniu zatwierdzonego zabezpieczonego Wi-Fi `AUTO_OPTIMIZE` startuje bez
pytania. Preferuje ręczną korektę, świeży zapis dla tego profilu Wi-Fi,
lokalizację urządzenia onboardingowego gdy przeglądarka może ją legalnie podać,
zatwierdzone pozycjonowanie Wi-Fi, geolokalizację IP bez klucza i fallback
pakietu kraju. Dokładniejsze dostępne źródło może zastąpić słabszy wynik.

## Prawda o danych zewnętrznych

Geolokalizacja IP nie może być całkowicie lokalna bez dużej i często
aktualizowanej bazy IP. Bezpośrednie zapytanie zawsze ujawnia dostawcy publiczny
IP. Pogoda ujawnia IP i współrzędne. Pozycjonowanie Wi-Fi ujawniłoby pobliskie
BSSID i siłę sygnału. To użyteczny ruch konfiguracyjny, a nie analityka, ale nadal
jest transferem danych i dlatego opisujemy go wprost.

## Inne poprawione nadmierne blokady

Opcjonalny SNTP jest dozwolony dla zegara i RTC; recovery nadal używa czasu
monotonicznego. Kraj, strefa, kandydat języka i region stacji pochodzą z
automatycznej lokalizacji. Lokalny panel Pro może pokazać aktualny SSID/lokalny
IP, dokładność lokalizacji i host endpointu. Redakcja obowiązuje eksport i
community evidence. Endpointy ulepszeń mają maszynową allowlistę zamiast
globalnego zakazu URL w firmware.

## Zachowane ograniczenia

Radio nadal nie dołącza automatycznie do nieznanej/otwartej sieci, nie wysyła
historii słuchania, nie uruchamia analityki projektu, nie wymaga konta ani
projektowego backendu, nie odpytuje OTA/katalogu, nie bundluje logotypów bez praw,
nie łączy obcego głośnika i nie pozwala, by błąd pogody/lokalizacji zatrzymał
audio. To nadal uzasadnione granice niezawodności, zgody, prawa i sekretów.

## Implementacja

`ui-contract/location/auto-location.v1.json` definiuje ranking źródeł, refresh,
storage i ruch zewnętrzny. `location/auto-location.mjs` deterministycznie wybiera
najlepszy świeży wynik. Domyślna konfiguracja włącza automatyczne przybliżenie;
onboarding pokazuje je jako aktywne, z możliwością korekty lub wyłączenia. GUI
oznacza miejscowość pogodową jako `AUTO`.

## Obecna granica

Mechanizm wyboru i GUI są testowane hostowo. Adaptery live IP, pozycjonowania
Wi-Fi, SNTP i pogody nie weszły jeszcze do RC1 firmware. Pozycjonowanie Wi-Fi w
stylu Google jest obsługiwanym źródłem, ale domyślnie wyłączonym, bo dostępne API
wymaga klucza/billingu i wysyła pobliskie BSSID. Włączymy je dopiero po wyborze
dostawcy i bezpiecznym projekcie sekretu.

## Następna bramka

Najpierw implementujemy adapter IP bez klucza, potem niezależne adaptery pogody
i opcjonalnego SNTP z ograniczonymi supervisorami. Na Core2 mierzymy pamięć TLS,
timeouty, cache, recovery i ciągłość audio podczas każdej awarii dostawcy, zanim
włączymy je w fizycznym kandydacie.
