# 11 — Rejestr decyzji Tomka

Odpowiedz krótko na sekcję `Pozostało do decyzji`. Pozostałe odpowiedzi zostały
wyprowadzone wprost z rozmowy z 2026-07-13 i nie wymagają ponownego potwierdzania.

## Decyzje już zamknięte

| ID | Decyzja | Stan |
|---|---|---|
| Q-03 | Po starcie automatycznie gra ostatnia działająca stacja. | ACCEPTED |
| Q-04 | Brak BT uruchamia wbudowany speaker; reconnect trwa w tle. | ACCEPTED |
| Q-05 | Wiele znanych Wi-Fi; lokalny portal tylko dla nowej sieci/braku profilu. | ACCEPTED |
| Q-06 | Jeden zapamiętany głośnik BT jako aktywny sink. | ACCEPTED |
| Q-07 | Stabilność i kompatybilność ważniejsze od maksymalnego bitrate. | ACCEPTED |
| Q-08 | Po utracie USB-C radio działa z baterii i ostrzega. | ACCEPTED |
| Q-09 | GPL-3.0-or-later code, CC BY-SA docs/artwork, CC0 catalog. | ACCEPTED |
| Q-10 | `Tomasz Fiedoruk`, 2026, `https://fiedoruk.pl`, także ekran About. | ACCEPTED |
| Q-12 | PoC open source dla samodzielnych buildów; nie gotowy produkt na sprzedaż. | ACCEPTED |
| Q-13 | Brak automatycznych aktualizacji katalogu; embedded snapshot + oficjalne resolvery. | ACCEPTED |
| Q-14 | Zero analityki wychodzącej; diagnostyka lokalna pozostaje funkcją produktu. | ACCEPTED |
| Q-15 | Wewnętrzny proof etapuje 6 MP3 + 3 HLS, publiczny zakres to pełne 9/9. | ACCEPTED |
| Q-17 | Po recovery radio automatycznie gra ostatnią działającą stację. | ACCEPTED |
| Q-18 | Brak OTA; ręczny USB rescue pozostaje fizycznym bezpiecznikiem. | ACCEPTED |
| Q-19 | Publicznie oryginalne motywy; oficjalne logotypy tylko prywatnie lub po zgodzie. | ACCEPTED |
| release | Source + reprodukowalny binary po audycie zależności. | TARGET LOCKED |

## Pozostało do decyzji

## Q-01 — region stacji lokalnych — RUNTIME

RMF MAXX, Radio ESKA i Złote Przeboje mają warianty regionalne.

- A) automatycznie wybierany ogólnopolski/najbardziej neutralny stream,
- B) konkretny region/miasto,
- C) region wybierany w ustawieniach.

Decyzja nie blokuje projektu. Emulator i urządzenie dobierają region z
automatycznej lokalizacji po zatwierdzonym Wi-Fi. `Cała Polska` pozostaje
fallbackiem offline, a użytkownik może później poprawić wynik w ustawieniach.

## Q-02 — „chillout” — WORKING DECISION

- A) chodzi o Chillizet,
- B) chodzi o inną stację lub kanał internetowy.

Przyjęto Chillizet jako stację z listy startowej, dopóki Tomasz nie wskaże innej.

## Q-11 — nazwa projektu

`Open Radio Core2` jest nazwą roboczą i zawiera cudzy znak produktowy.

- A) tworzymy niezależną, własną nazwę marki,
- B) pozostajemy przy czysto opisowej nazwie technicznej.

**Rekomendacja:** A. Nazwa nie powinna zawierać RMF, ZET, ESKA, M5Stack ani Core2.

## Q-16 — głośnik referencyjny

Podaj producenta i dokładny model pierwszego głośnika Bluetooth. Ten model będzie
obowiązkowym urządzeniem testowym dla pairing, reconnectu, power-cycle, głośności
i 24-godzinnego soak testu.

**Odpowiedź właściciela, 2026-07-14:** główny kandydat to Xiaomi Sound Pocket
`MDZ-37-DB`; drugim urządzeniem macierzy jest MOZOS Outdoor-Xtreme. Dokładną
rewizję MOZOS trzeba odczytać z etykiety przed H3. Oba urządzenia pozostają
niezakwalifikowane do czasu fizycznego testu A2DP/SBC.

## Q-20 — publiczny kontakt security

Podaj adres e-mail albo potwierdź, że przed publicznym repo pozostawiamy
`SECURITY.md` bez aktywnego kanału i nie publikujemy release.

## Najkrótsza odpowiedź

Możesz odpisać jednym blokiem:

```text
Q-11: chcę shortlistę / moja nazwa: ...
Q-16: <model głośnika>
Q-20: <e-mail / później>
```
