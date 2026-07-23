# 67 — Marka, globalny katalog i bramka jakości GUI

[English version](67-brand-global-gui-qc.en.md)

## Zakres

Polska pozostaje startowym packiem danych, a nie zakodowaną granicą produktu.
UI, resolver i schema packa muszą przyjmować ograniczone katalogi stacji dla
różnych krajów bez dodawania chmury, instalacji packów w runtime ani
automatycznych zdalnych aktualizacji.

## Typografia wbudowana

Renderer produkcyjny używa jednego dołączonego atlasu Inter 600. Jest on
generowany offline z dołączonego źródła na licencji OFL i współdzielony przez
kanoniczny emulator urządzenia oraz firmware. Nie ma pobierania ani parsera
fontu w runtime.

## Logo kanoniczne

**Signal Cube A2** jest wybranym i jedynym aktywnym znakiem produktu. Korzysta z
dwóch fal transmisji w negatywie i bocznego beaconu w kostce urządzenia. System
zawiera wariant podstawowy, negatyw, monochromatyczny i micro dla 20-32 px oraz
zdefiniowane pole ochronne. Alternatywne znaki eksploracyjne nie są częścią
aktywnego UI.

## Flow ustawień

Ustawienia urządzenia mają dwie lokalne strony zoptymalizowane pod dotyk. Szybkie
ustawienia obejmują Wi-Fi, Bluetooth, głośność, jasność, motyw i język. Ustawienia
systemowe obejmują region/katalog, About Pro, diagnostykę oraz lokalne ścieżki
naprawy Wi-Fi i Bluetooth. Każda karta wykonuje akcję; rutynowa opcja nie wymaga
edycji źródeł, terminala, konta ani dashboardu w chmurze.

## Packi krajowe

`catalog-pack.schema.json` definiuje kod kraju, domyślny i wspierane języki UI,
lokalizowane etykiety regionu, referencje katalogu/identity, limit stacji i
politykę offline. `pl-PL.v1.json` jest pierwszym wbudowanym packiem; ogólny
przykład pokazuje, jak maintainer może przygotować inny kraj podczas buildu.
Instalacja w runtime i zdalna aktualizacja pozostają wyłączone.

## Panel About Pro

Lokalny ekran About Pro pokazuje produkt/wersję, kanał source-lock, software-only
status sprzętu, wyłączoną telemetrię, foundera i stronę. Prowadzi do lokalnej
diagnostyki zamiast konta w chmurze lub zdalnego dashboardu. Ekran rynku pokazuje
aktywny pack, kraj, liczbę stacji i języki UI.

## QC GUI i UX

`npm run qa:gui` jest skoncentrowaną bramką zamknięcia: geometria pikseli,
targety dotyku, kontrast, lokalne assety, wbudowana typografia, kanoniczne
warianty A2, akcje ustawień, tożsamość stacji, walidacja packa krajowego i testy
GUI/stanu/resolvera. Przegląd w przeglądarce dodatkowo sprawdza oba motywy,
PL/EN, About Pro, pack rynku i interaktywne ścieżki w rzeczywistym viewportcie
320×240. Każdy loop GUI uruchamia także pełne `npm run check`, `git diff --check`
i przegląd Simplify Gate w trybie max.

## Przekazanie do firmware

Renderer hostowy pobiera już generowane tokeny RGB565 Jasnego A i Ciemnego B,
domyślnie używa Ciemnego B i korzysta z generowanych masek Tabler 24×24.
Dołączony atlas Inter jest finalną ścieżką typografii firmware. H1 na fizycznym
Core2 pozostaje zablokowane do dostawy sprzętu; tekst OFL i suma kontrolna źródła
są zapisane w repozytorium.
