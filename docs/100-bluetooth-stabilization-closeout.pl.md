# Domknięcie stabilizacji Bluetooth — 2026-07-16

> **ZASTĄPIONE (2026-07-17):** model rezerw, kandydaci i kroki wznowienia w tym dokumencie są nieaktualne. Bieżąca prawda bazowa: [docs/104](104-cc-stabilization-closeout.pl.md).

## Werdykt

Funkcjonalność Bluetooth jest domknięta na zachowanym kandydacie hardware-lab.
Właściciel wykonał nadzorowany cykl głośnika OFF→ON i potwierdził czysty dźwięk.
Kandydat nadaje się do dalszej prywatnej kwalifikacji. Nie jest to jeszcze PASS
H4 ani publicznego wydania.

Dokładny zachowany firmware:

- SHA-256 binarki: `729444cc8343ed025837a63ab8673c6e364eec4ba324bf5266feea982ec6b5d5`;
- rozmiar binarki: 2 376 960 bajtów;
- commit implementacji: `ecd69dd18364a7233e7874d4040a1a30cd1b4a3e`;
- oczyszczony dowód końcowy:
  `output/hardware-soaks/2026-07-16T17-59-11.979Z-final-bt-off-on-verdict.json`.

Artefakt evidence jest prywatny i ignorowany przez Git. Źródła, testy i ten
zapis decyzji są commitowane.

## Zmierzony cykl końcowy

| Zdarzenie lub licznik | Wynik |
|---|---:|
| Marker włączenia głośnika | 25,620 s |
| Marker właściciela `ready` | 66,370 s |
| Udane przychodzące ACL | 67,104 s |
| Dial A2DP w pętli właściciela | 68,989 s |
| Połączenie A2DP | 69,333 s |
| Gotowość standby | 71,506 s |
| Start mediów Bluetooth | 74,098 s |
| Ready→media | 7,728 s |
| Obserwacja aktywnego Bluetooth | około 166 s, do końca capture 240 s |
| Końcowe kolejki decoded / Bluetooth | 261 888 / 260 864 ramek |
| Delta lokalnego starvation | 0 |
| Delta aktywnej / bezczynnej ciszy Bluetooth | 0 / 0 ramek |
| Delta startów / stopów streamu | 0 / 0 |
| Delta watchdog poboru Bluetooth | 0 |
| Werdykt odsłuchowy właściciela | czysto |

Końcowa próbka zapisała 22 128 bajtów wolnego wewnętrznego DRAM, historyczne
minimum 10 680 bajtów i największy blok 13 812 bajtów. Są to dowody, a nie PASS
budżetu zasobów H4. Stare limity manifestu nadal wymagają jawnego, opartego na
pomiarach re-baseline po testach endurance.

## Potwierdzony łańcuch awarii

Długi ciąg debugowania zawierał kilka różnych usterek, które w głośniku brzmiały
podobnie:

1. Próba połączenia Bluetooth z wyłączonym głośnikiem zajmowała wspólne radio
   na około 5,1 s. Utrata streamu uruchamiała potem synchroniczny reopen trwający
   do około 5,3 s. Bez odpowiedniego zapasu PCM mogło to przerwać także lokalny
   fallback.
2. Warunek dokładnie pełnego ringu Bluetooth ścigał się z konsumentem A2DP.
   Konsument mógł pobrać ramki, zanim owner zobaczył dokładną równość, więc
   poprawne połączenie wielokrotnie kończyło się timeoutem przed mediami.
3. Pasywny listen-hold ACL sam nie kompletował profilu źródła A2DP i dodawał
   długie oczekiwanie. Udane przychodzące ACL musi budzić zwykły dial źródła w
   pętli właściciela.
4. Czas retry był początkowo liczony od żądania abortu. Zwijanie disconnectu
   mogło trwać dłużej i nakładać się z kolejną próbą HCI. Retry jest teraz
   liczone od rzeczywistego callbacku A2DP `DISCONNECTED`.
5. Stały limit pracy dekodera i drainu na obrót pętli właściciela nie utrzymywał
   44,1 tys. ramek/s po reconnect. Kolejka BT pustoszała mimo pozornie aktywnego
   streamu, co dawało cięcia i wrażenie przyspieszonego dźwięku.
6. Nieograniczona lub monolityczna pompa nadrabiania psuła lokalne odtwarzanie.
   Finalny projekt zmienia pompowanie wyłącznie przy aktywnym Bluetooth i
   zachowuje ograniczoną ścieżkę lokalną.

## Zamrożony działający projekt

- Jeden czas życia stosu Bluetooth i jeden owner reconnectu na boot.
- Routing przechodzi na Bluetooth dopiero po callbacku startu mediów.
- Udane przychodzące ACL zapamiętanego peera budzi zwykły lokalny dial źródła
  A2DP; pasywny listen-hold został usunięty.
- Status ACL jest akceptowany tylko przy zerowym dolnym bajcie, co obejmuje
  zaobserwowaną reprezentację ABI Arduino/IDF bez akceptowania page timeout.
- Kadencja retry zaczyna się przy prawdziwym callbacku disconnect A2DP.
- Bramka pre-media używa siedmiu ósmych ringu Bluetooth 262 144 ramek, a nie
  dokładnej równości pełnego bufora.
- Pełna rezerwa decoded 147 456 ramek jest zachowana dla lokalnego fallbacku.
- Przy aktywnym Bluetooth pompa dekodera pracuje do istniejącego high-water.
  Tryb lokalny zachowuje osiem przebiegów, drain aktywny sekcje krytyczne po 256
  ramek, a bezpiecznik ośmiu przebiegów bez postępu blokuje spin owner-loop.
- Głośność pozostaje jednym lokalnym liniowym wzmocnieniem PCM. Firmware nie
  wysyła do głośnika zmian zdalnej głośności absolutnej AVRCP.
- Wbudowany głośnik pozostaje obowiązkowym fallbackiem i wyjściem diagnostycznym.

Nie wolno dodawać kolejnego mechanizmu reconnectu ani stroić buforów bez nowej,
zmierzonej awarii na dokładnie zachowanej binarce.

## Odrzucone podejścia i zachowane wnioski

- Wcześniejszy stabilny wynik poranny nie obalał późniejszej awarii: używał
  innej binarki i innego scenariusza.
- Link-connected nie oznacza media-ready. Kwalifikacja musi osobno zapisywać
  ACL, link A2DP, gotowość standby i start mediów.
- Tekstowe asercje hostowe blokują znane regresje źródła, ale nie dowodzą RF ani
  audio czasu rzeczywistego. Odsłuch właściciela pozostaje obowiązkową bramką.
- Evidence zawsze musi identyfikować dokładny hash i rozmiar binarki. Wyników nie
  wolno dziedziczyć po przebudowie obrazu.
- Buildy hardware-lab są prywatnymi artefaktami kwalifikacji. Publiczne wydanie
  wymaga świeżego buildu public-candidate oraz własnego fallbacku i endurance.

## Zamknięta lista pozostałej kwalifikacji

Przed tymi pomiarami nie planuje się żadnej pracy firmware:

1. Wykonać cykl reconnect 2/3 na dokładnie zachowanej binarce.
2. Wykonać cykl reconnect 3/3 na tej samej binarce.
3. Wykonać obowiązkowe 60 minut MP3→A2DP z jednym wymuszonym recovery streamu.
4. Przejrzeć zmierzone minimum DRAM, największy blok, stos i trend; commitować
   uzasadniony re-baseline budżetu zamiast po cichu obniżać limity.
5. Zbudować niezmienione źródło w torze public-candidate, a przed rozważeniem
   wydania powtórzyć jeden cykl fallbacku i 60-minutowy smoke.

Każdy cykl reconnect oblewa przy słyszalnym cięciu, złej trasie, resecie,
watchdogu, lokalnym starvation, wzroście aktywnej ciszy lub czasie ponad 30 s od
`ready` do mediów Bluetooth. Każda zmiana firmware zeruje licznik cykli.

## Dalszy test głośnika i zestawu DIY

Nadchodzący zakup został opisany przez właściciela jako Soundcore/Anker „Boom
Go 3i”, 15 W, 4800 mAh i 24 godziny odtwarzania, z planem jednoczesnego zasilania
Core2. Są to notatki zakupowe, niezweryfikowane specyfikacje ani wyniki testów.
Obecna allowlista discovery nie może zgadywać po nazwie marketingowej. Po
dostawie trzeba zapisać dokładną etykietę i nazwę rozgłaszaną przez Bluetooth,
dodać najmniejszą znormalizowaną regułę allowlisty i zakwalifikować A2DP/SBC,
reconnect, fallback, głośność oraz wyjście powerbanku.

Dopiero po PASS tego wiersza publiczna dokumentacja EN/PL może polecać zestaw
DIY z dwóch zakupów: kostka Core2 i konkretnie zakwalifikowany głośnik Bluetooth
z funkcją powerbanku. Projekt nadal deklaruje interoperacyjność standardowego
A2DP/SBC, nigdy uniwersalne wsparcie wszystkich głośników.

## Punkt wznowienia

Zacząć od `ecd69dd` bez zmian kodu i bez ponownego flasha. Potwierdzić, że
urządzenie nadal ma binarkę `729444cc…b5d5`, następnie wykonać cykle 2/3 i 3/3,
a potem 60 minut. PASS zamyka tor stabilizacji Bluetooth; FAIL otwiera dokładnie
jedną poprawkę wynikającą z evidence i zeruje macierz.
