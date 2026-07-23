# 66 — System pixel-perfect GUI

[English version](66-pixel-perfect-gui-system.en.md)

## Podstawa sprzętowa

Źródło prawdy GUI celuje w [M5Stack Core2](https://docs.m5stack.com/en/core/core2): 2-calowy ekran IPS 320×240 ze sterownikiem ILI9342C i dotykiem pojemnościowym. Projekt używa jednego stałego viewportu landscape i kolorów zgodnych z RGB565. Nie deklaruje fizycznego parytetu kolorów, dotyku ani timingu przed walidacją sprzętową.

Przeglądarkowy GUI Lab działa pod `http://127.0.0.1:4173/gui-lab/` po uruchomieniu `npm run simulator`. Uzupełnia logiczny symulator awarii; nie zastępuje wspólnego renderera firmware.

## System pikselowy

`ui-contract/gui/core2-pixel-system.v1.json` jest maszynowym kontraktem geometrii. Wszystkie boksy ekranów mają całkowite współrzędne w 320×240, bazową siatkę 2 px i minimalny interaktywny obszar 44×44. Dokładne insety rysowanych elementów są zapisane osobno od ich prostokątów dotyku. Ekran dzieli się na pasek statusu 28 px, obszar treści 156 px i dolny pasek akcji 56 px.

GUI Lab maluje kanoniczny framebuffer C++ RGB565 w dokładnym rozmiarze 320×240 pikseli CSS. Każda współrzędna źródłowa jest pikselem urządzenia, a podgląd nie skaluje framebufferu. W viewportcie urządzenia nie ma scrolla.

## Motyw jasny i ciemny

Oba motywy są kompletnymi wariantami tego samego layoutu i flow. Jasny A używa neutralnego, kontrastowego tła na dzień. Ciemny B ogranicza duże jasne powierzchnie i jest domyślnym motywem produktu. Niebieski Open Radio (`#3689FF` w ciemnym / `#0B63CE` w jasnym) jest stałym kolorem brandu dla kontrolek i nawigacji; oryginalne kolory stacji służą wyłącznie ich tożsamości. Wybór motywu zmienia tylko tokeny; nawigacja, geometria dotyku, priorytet informacji i zachowanie recovery są identyczne.

Zwykły i przygaszony tekst jest automatycznie sprawdzany względem tła, powierzchni i warstwy raised z minimum 4,5:1 według [wytycznych kontrastu W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Tekst przycisków stacji jest sprawdzany względem każdego akcentu tym samym progiem.

## System ikon

Projekt używa kompilowanego podzbioru [Tabler Icons](https://github.com/tabler/tabler-icons), przypiętego do wersji `3.44.0` i commita `6d128ed935d4546607b1e4d5d08c8b27bdbe7758`. Źródła zachowują oryginalny view box 24×24, stroke 2 px i licencję MIT. Dokładna licencja jest w `ui-contract/icons/TABLER-LICENSE.txt`.

Przeglądarka czyta lokalny `ui-contract/icons/tabler-core2.svg`. Firmware nie może zawierać parsera SVG ani pobierać ikon w runtime. Wybrany motyw jest offline konwertowany z tych samych ścieżek do małych masek monochromatycznych, barwionych lokalnymi tokenami RGB565.

## Tożsamość i logotypy stacji

Każda stacja ma oryginalną tożsamość zastępczą w `ui-contract/gui/station-identities.v1.json`: monogram, akcent, drugi akcent, czytelny foreground i prosty motyw geometryczny. Dzięki temu każda karta jest kompletna bez kopiowania grafiki nadawcy.

Oficjalne grafiki nadawców nigdy nie są bundlowane; od wydania 0.2 urządzenie samo pobiera logotypy stacji w runtime zgodnie z `decisions/ADR-010`, przechowując je wyłącznie na urządzeniu. Oryginalne monogramy, motywy geometryczne i lokalne kolory RGB565 pozostają pełną tożsamością zapasową, gdy logo brakuje — każda karta jest kompletna bez bundlowanych grafik nadawców.

## Mapa ekranów i flow

GUI Lab obejmuje now playing, bezpośrednie sterowanie głośnością, siatkę stacji 3×3, ustawienia, recovery Wi-Fi, fallback Bluetooth, niewspierany transport, safe mode, lokalną diagnostykę i wszystkie trzy kroki onboardingu. Wskaźnik głośności na pełnym ekranie głównym otwiera dedykowany ekran 0–100% z suwakiem oraz 44-pikselowymi kontrolkami zmniejsz, gotowe i zwiększ. Safe mode otwiera ograniczoną lokalną diagnostykę i utrzymuje wyłączone radia sieciowe do lokalnej naprawy. Skan Bluetooth uruchomiony przez użytkownika przyjmuje dowolnego kandydata Classic A2DP rendering/audio wystawionego przez przypięty stack zamiast dopasowywać nazwy modeli; pierwsze zaakceptowane połączenie zostaje zapamiętane po adresie. Niewspierane wpisy HLS nigdy nie pokazują stanu grania. Poprzednia, następna i automatyczny fallback wybierają tylko wspierane wpisy MP3. Utrata Bluetooth bez aktywnego zapamiętanego głośnika jest no-op; przy aktywnym Bluetooth dźwięk pozostaje na głośniku wbudowanym.

Ekrany recovery mają jeden komunikat, jedno krótkie wyjaśnienie i jedną główną akcję. UI nie wymaga od użytkownika nadzorowania automatycznego powrotu Wi-Fi, streamu ani głośnika.

## Ścieżka do firmware

Oba motywy generują już stałe renderera i tokeny RGB565, a sześć ścieżek Tabler generuje kompilowane maski 24×24. Ciemny B jest również domyślnym motywem fixture renderera. Kanoniczny emulator urządzenia i firmware współdzielą jeden deterministyczny atlas Inter 600 generowany offline z dołączonego źródła na licencji OFL. Kiara korzysta z assetu CC0 `Pixel cat` autora `scofanogd`, redukowanego offline do 154 czteropoziomowych szarych przebiegów i renderowanego bez dekodera obrazów oraz alokacji heap. Kandydat publiczny nie ma parsera fontów ani SVG w runtime. Od wydania 0.2 firmware ma ograniczoną ścieżkę dekodowania PNG używaną wyłącznie przez pobieranie logotypów stacji w runtime (`decisions/ADR-010`); logotypy żyją w pamięci urządzenia, nigdy w publikowanym obrazie.

Parytet wymaga fixture framebufferów dla każdego ekranu w PL i EN, deterministycznych hashy, testów overflow oraz zdjęć urządzenia obok wzorca. GUI Lab jest więc dokładną specyfikacją wizualną, a nie dowodem, że fizyczny panel IPS już ją odwzorowuje.

## Gate akceptacyjny

`npm run qa:gui` sprawdza geometrię viewportu, zgodność z siatką, targety dotyku 44 px, kontrast motywów i niebieskiego brandu, kontrast akcentów stacji, kolejność katalog–identity, wyłączony runtime grafik i politykę wbudowanej typografii, obecność kanonicznego logo, akcje ustawień, pin wersji, overflow, packi krajowe oraz zakaz zdalnych assetów. `npm run check` pozostaje pełną bramką zamknięcia repozytorium.

Hardware H1 sprawdza clipping, fizyczną czytelność, transformację dotyku, jasność i kolory; H2/H3 sprawdzają ten sam flow recovery z audio lokalnym i Bluetooth. Sam wynik przeglądarkowy nie odblokowuje żadnej deklaracji sprzętowej ani release.
