# S22 dopracowanie interakcji GUI

[English version](90-s22-gui-interaction-polish.en.md)

Data: 2026-07-14

> Korekta sprzętowa 2026-07-15: właściciel przywrócił jawną lokalną akcję
> pobierania logotypów stacji. Firmware nie bundluje tych plików; jedno kliknięcie
> pobiera przypięte JPEG/PNG nadawców bezpośrednio do pamięci urządzenia.
> Aktualne dowody zapisano w raporcie uruchomienia H1.

## Zamknięte programowo

- Fizyczny mockup Core2 ma neutralną szarą ramkę zewnętrzną zamiast pomarańczowego koloru ze zdjęcia produktu AWS.
- Wskaźnik głośności na pełnym ekranie głównym kończy się na x=312, zachowując prawy margines siatki 8 px, ma osobny target 76×44 i otwiera pełny ekran sterowania 0–100%.
- Ekran głośności obsługuje bezpośrednie wskazanie na pasku oraz akcje zmniejsz, gotowe i zwiększ o rozmiarze co najmniej 44 piksele. Wartość zero trafia teraz do głośnika M5 jako zero, zamiast być wymuszana na niezerowe minimum diagnostyczne.
- Ustawienia systemowe mają akcję `Logotypy`. Jedno kliknięcie pobiera wszystkie brakujące pliki w tle, pokazuje `x/9`, sprawdza typ, rozmiar i SHA-256, a następnie przechowuje przekonwertowany cache 64×64 RGB565 wyłącznie na urządzeniu.
- Wygaszacz Kiara korzysta z assetu CC0 `Pixel cat` autora `scofanogd`. Dokładne bajty źródła, licencja i SHA-256 są zapisane; renderer używa 154 deterministycznych czteropoziomowych przebiegów szarości bez dekodera PNG ani alokacji heap.
- Flow przeglądarki i firmware nadal korzystają z tego samego renderera C++ i zgodnych kontrolerów JavaScript/C++.

## Historyczne dowody S22

- `npm run validate:gui`: 92 boksy geometrii, 9 stacji, 21 ikon.
- `npm run validate:ui`: 10 ekranów hitboxów; każdy zadeklarowany target przechodzi minimum 44 pikseli.
- Renderer: 28 ekranów produkcyjnych, 112 wariantów motyw/język, zero truncation w przejrzanych klatkach.
- Parytet kontrolera: 8 scenariuszy i 61 snapshotów.
- Suite Node: 172 testy zaliczone.
- Warianty firmware: 5 buildów zaliczonych.
- Kandydat publiczny: binarka 2 276 592 bajty; 2 270 017 bajtów flash programu; 116 116 bajtów RAM; deterministyczny SHA-256 `eab57cfe40d427092c340f97407d86cec8819f3cfed3c7110d42f1ac3ae26f62`.

## Nadal zablokowane na sprzęt

Dowody software nie mogą potwierdzić fizycznej transformacji dotyku, dokładności krawędzi, koloru panelu, rzeczywistej krzywej głośności, jakości głośnika wbudowanego, działania A2DP, recovery Wi-Fi ani endurance. H1 musi więc zacząć się od smoke display/touch/speaker/battery, a potem przejść 60-minutową bramkę grania i recovery przed jakąkolwiek deklaracją gotowości sprzętowej.
