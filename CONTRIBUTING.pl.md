# Współpraca

[English version](CONTRIBUTING.md)

Projekt wydaje publiczny firmware (0.1, 0.2, aktualnie 0.2.1) zwalidowany na realnym sprzęcie.
Wkład jest przyjmowany jako:

- software na GPL-3.0-or-later,
- oryginalna dokumentacja/grafiki na CC BY-SA 4.0,
- dane katalogowe na CC0-1.0.

Wnosząc wkład, potwierdzasz prawo do przekazania materiału na właściwej
licencji projektu.

## Zasady

- Stabilny rdzeń pozostaje mały.
- Kod, identyfikatory i interfejsy techniczne są po angielsku.
- Publiczna dokumentacja użytkownika zachowuje parytet EN/PL.
- Bez telemetrii, obowiązkowej chmury, automatycznych kanałów aktualizacji i zdalnego wykonywania kodu.
- Bez oficjalnych logotypów stacji bez manifestu praw i udokumentowanej zgody.
- Oryginalne motywy stacji są mile widziane; prywatne assety trafiają do ignorowanego `assets-local/`.
- Bez nagrań, endpointów premium i nieoficjalnych proxy streamów.
- Każdy endpoint stacji ma oficjalne źródło i datę weryfikacji.

## Pull request

1. Większa zmiana ma issue albo RFC.
2. Jeden PR rozwiązuje jeden problem.
3. Zmiana zawiera testy i dowód hardware, jeśli dotyczy urządzenia.
4. Instrukcje EN/PL są aktualizowane razem.
5. Commit zawiera DCO: `Signed-off-by: Imię <email>`.

Sieć, security, USB rescue i katalog `stable` wymagają dwóch review. Pozostałe zmiany
wymagają jednego review maintenera.

## Dodawanie stacji

Podaj operatora, oficjalny player, źródło resolvera, kodek, transport, region,
datę weryfikacji i wynik testu na Core2. `Verified` oznacza test techniczny, a
nie akceptację lub rekomendację nadawcy.

## Dowody społecznościowe

Używaj wyłącznie ograniczonych formatów JSON z `community/schemas/`. Raporty nie
przyjmują swobodnego tekstu, URL-i endpointów, SSID, danych logowania, adresów
Bluetooth, numerów urządzeń, tożsamości słuchacza, PCM ani grafik.

Sprawdź wszystkie przykłady i lokalnie odtwórz oczyszczony pakiet callbacków:

```bash
npm run validate:community
npm run replay:community -- community/fixtures/replay-good.json
```

Dołączaj wyłącznie zwalidowany raport JSON. Wynik `PASS` jest dowodem software
dla wskazanego hasha firmware, a nie ogólną deklaracją zgodności sprzętowej.
Pełny workflow kandydata źródłowego opisuje `REPRODUCIBILITY.pl.md`.
