# Audyt zgodności pikselowej emulatora

[English version](86-emulator-pixel-parity-audit.en.md)

## Korekta

Poprzedni audyt błędnie przedstawiał trzy tryby renderowania i font 5×7 jako
gotowy widok urządzenia. Sprawdzał geometrię współrzędnych, ale nie wymuszał
jednej kanonicznej ścieżki produkcyjnej. Ten dokument zastępuje tamten wniosek.

## Ścieżka kanoniczna

GUI Lab zawiera teraz dokładnie jeden widoczny
`<canvas width="320" height="240">`. Nie ma zakładek renderera, trybu projektu
SVG ani sterowania powiększeniem. Jego rozmiar CSS również wynosi 320×240
pikseli CSS. Każdy piksel urządzenia pochodzi z `/api/renderer-frame`, który
uruchamia hostowy build tego samego renderera C++ RGB565 linkowanego do targetu
Core2. Przeglądarka tylko dekoduje tę klatkę i maluje ją na canvasie.

Typografia korzysta z generowanego atlasu Inter 600 z dołączonego fontu na
licencji OFL. Ikony są tymi samymi kompilowanymi maskami co w firmware. Wewnątrz
framebufferu urządzenia nie ma zamiany na font przeglądarki.

## Zmierzony wynik programowy

| Obszar | Wynik | Znaczenie |
| --- | --- | --- |
| Struktura canvasa | PASS | Jeden widoczny canvas 320×240; testy odrzucają stare zakładki i tryb SVG. |
| Źródło klatki | PASS | Widoczna klatka urządzenia pochodzi wyłącznie z endpointu renderera C++ RGB565. |
| Typografia | PASS | Firmware i emulator współdzielą generowany atlas glifów Inter 600. |
| Pokrycie ekranów | PASS | 26 ekranów obejmuje PL/EN i Light A/Dark B: 104 warianty. |
| Determinizm | PASS | Dwa świeże buildy hostowe dają identyczny wynik bajt w bajt dla 104 wariantów. |
| Granice tekstu | PASS WITH RISKS | Testy granic renderera przechodzą; kontrolowane elipsy są liczone, lecz czytelność panelu jest niezmierzona. |
| Flow dotyku | PASS WITH RISKS | Tap, hold i poziomy swipe są testowane hostowo; zachowanie fizycznego dotyku jest niezmierzone. |
| Fizyczny ekran | NOT MEASURED | Kolor panelu, jasność, kąty widzenia, skalowanie i kalibracja dotyku wymagają sprzętu. |

Kanoniczny SHA-256 macierzy 104 klatek to
`bae568ccafc26d7217883268ce68354fb1961547daa8940ba9d691efec228d23`.
Hash domyślnej klatki to `f5edbcd318f51527`.

## Dokładne znaczenie 1:1

Jeden piksel framebufferu RGB565 odpowiada jednemu pikselowi bitmapy canvasa, a
canvas zajmuje 320×240 pikseli CSS. To dokładna inspekcja pikseli logicznych.
Nie gwarantuje, że jeden piksel framebufferu odpowiada jednemu fizycznemu
pikselowi monitora, bo zoom przeglądarki, device-pixel ratio i kompozycja systemu
operacyjnego są zewnętrzne. Nie odtwarza też optyki panelu Core2.

## Werdykt

Zgodność logicznego framebufferu ma wynik **PASS WITH HARDWARE RISKS**. Emulator
jest teraz jednym uczciwym programowym odwzorowaniem tego, co firmware zleca
ekranowi. Nazwanie całego wyniku „pixel perfect na Core2” nadal byłoby fałszem,
dopóki nie przejdzie fizyczna bramka porównawcza.

## Bramka sprzętowa

1. Flashować dopiero po jawnej zgodzie bramki dostawy sprzętu.
2. Porównać sfotografowane klatki Core2 z tymi samymi goldenami C++.
3. Sprawdzić orientację, clipping, czytelność Inter i każdy touch target.
4. Zmierzyć jasność, zachowanie kolorów IPS i timing animacji pod obciążeniem audio.
5. Zapisać korekty panelowe jako zmierzoną kalibrację, a nie założenia.
