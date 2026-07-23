# Wsparcie

[English version](SUPPORT.md)

Publiczne wydania 0.1, 0.2 i aktualne 0.2.1 są żywe i zwalidowane sprzętowo na urządzeniu
referencyjnym; oficjalne binarki pochodzą wyłącznie z `fiedoruk.pl/os/`.
Tracker zgłoszeń pojawi się wraz z publikacją repozytorium — do tego czasu
raporty idą kanałami opisanymi niżej.

## Obsługiwane raporty

- Wyniki Bluetooth używają `community/schemas/bluetooth-compatibility-result.schema.json`.
- Wyniki stacji używają `community/schemas/station-playback-result.schema.json`.
- Oczyszczone trace callbacków używają `community/schemas/callback-replay-packet.schema.json`.

Przed udostępnieniem raportu uruchom `npm run validate:community`. Nie dołączaj
swobodnego tekstu, danych Wi-Fi, SSID, URL-i endpointów, adresów Bluetooth,
logów serial, identyfikatorów urządzeń, historii słuchania, PCM ani cudzych grafik.

## Granice

Zgłoszenia bezpieczeństwa podlegają `SECURITY.md` i w przyszłości trafią na
prywatny kontakt. Własne buildy, niewspierane kodeki, głośniki wyłącznie LE Audio
i płytki inne niż Core2 pozostają poza kontraktem wsparcia. Wynik społecznościowy
dotyczy tylko podanego hasha firmware i klasy możliwości.
