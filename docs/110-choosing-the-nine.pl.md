# 110 — Wybór dziewiątki

[English version](110-choosing-the-nine.en.md)

**Cel:** zapis mechanizmu wyboru stacji przez instalatora w wydaniu 0.2
**Dotyczy:** portalu pierwszej konfiguracji, katalogu wkompilowanego, slotów NVS
**Nie autoryzuje:** zapisu urządzenia ani wydania

## Dlaczego wybór jest przed Wi-Fi

W trybie AP+STA ESP32 przenosi swój punkt dostępowy na kanał routera w chwili,
gdy interfejs stacji się kojarzy — i zrzuca wszystkich klientów. Telefon traci
sieć niezależnie od tego, czy serwer żyje. Wszystko, co wymaga telefonu, musi
więc wydarzyć się **zanim** kostka dostanie hasło. Kolejność portalu jest
wymuszona fizyką, nie wybrana: najpierw stacje, na końcu Wi-Fi.

## Dwie ścieżki

Portal otwiera się pytaniem „Jakie stacje ma grać?". **Gotowa dziewiątka** to
jedno dotknięcie — sloty zostają fabryczne i konfiguracja przechodzi od razu do
Wi-Fi. **Wybiorę sam** otwiera listę 290 stacji z wyszukiwarką i paskiem
dziewięciu slotów odwzorowującym ścianę kostki. Dotknięcie stacji zajmuje
pierwszy wolny slot; ponowne dotknięcie zwalnia go. Dziewięć to całość
produktu — nie ma „dodaj więcej".

## Skąd lista i dlaczego jest wkompilowana

Katalog (`ui-contract/catalog/pl-directory.v1.json`) powstaje z sondy
radio-browser, ale **każdy wpis odpowiedział naszej własnej sondzie surowym
gniazdem** — cudzy pomiar nie wchodzi do produktu jako nasza gwarancja. Stan
z 2026-07-21: 290 stacji, 393 endpointy, 76 stacji z alternatywami. Lista jest
wkompilowana, bo na punkcie dostępowym z definicji nie ma internetu — żywy
katalog nie jest opcją w momencie wyboru.

Nazwy są czyszczone z artefaktów społecznościowych (końcowy bitrate, sufiks
„-om", slogany po kresce), a goły numer na końcu jest bitrate'em tylko wtedy,
gdy jest wartością, którą kodery realnie emitują — Radio 357 i Radio 90 to
nazwy stacji.

## Jedno QC dla obu dróg

Stacja wybrana z katalogu rotuje po swoich zweryfikowanych endpointach **na tym
samym kole**, którym rotuje kuratorowana dziewiątka, i tak samo liczy pełny
obieg bez zdrowej ramki. Jakość obsługi nie zależy od tego, którą drogą stacja
trafiła do slotu.

## Kontrakt urządzenia

`GET /api/directory` zwraca indeksy, nazwy i liczbę endpointów — **nigdy
URL-e**: kostka już je ma, portal odsyła numery. `POST /api/slots` przyjmuje
dziewięć indeksów (−1 = zostaw fabryczną) i odrzuca układ **w całości** przy
jakimkolwiek błędzie — połowicznie zastosowany układ to kostka, której ekran
kłamie o tym, co gra. Ekran odświeża się natychmiast przez callback, nie po
restarcie. Stan trwały to dziewięć wartości int16 w NVS (`slots1`) plus bajt
wersji formatu; nieznana wersja znaczy „brak", nie migracja — najgorszy
przypadek to kostka grająca fabryczną dziewiątkę, czyli działające radio.

## Czego wybór z katalogu nie daje

Logotypów. Stacja z katalogu dostaje monogram cięty z pierwszego znaczącego
słowa nazwy (samo „Radio" nie identyfikuje niczego w polskim katalogu).
Pobieranie grafik wymaga internetu i pośrednictwa kostki — to zakres konsoli
po Wi-Fi, razem z relayem. Pełny reset (przycisk w ustawieniach) kasuje też
sloty: `nvs_flash_erase()` czyści całą partycję i kostka wstaje jak nowa.

## Bramka

`npm run check`: 36 bramek, 232 testy, zero błędów. Przejście obu ścieżek
zweryfikowane w przeglądarce przy szerokości 320 px, bez przepełnienia
poziomego na żadnym kroku.
