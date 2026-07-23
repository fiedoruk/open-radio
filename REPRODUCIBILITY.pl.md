# Powtarzalność

[English version](REPRODUCIBILITY.md)

Archiwa źródłowe są powtarzalne bitowo, a wydany firmware 0.2.1 odtwarza się
bajt-w-bajt poza stemplem pochodzenia przy zachowaniu trzech parametrów builda
(wszystkie zmierzone 2026-07-23):

1. **Piny zależności, po nazwie.** Każda biblioteka z
   `firmware/manifests/dependencies.lock.json` musi rozwiązać się dokładnie
   raz; M5GFX jest przypięty wpisem *nazwanym*
   (`M5GFX=https://github.com/m5stack/M5GFX.git#ad9b814…`, zawartość
   identyczna z rejestrowym 0.2.25). `scripts/check-resolved-libdeps.mjs`
   zatrzymuje build przy każdym dryfie lub podwójnej instalacji.
2. **Ścieżka katalogu builda.** Dwa stringi assertów frameworka osadzają
   absolutną ścieżkę toolchainu, więc pełna zgodność bajtowa wymaga tej samej
   ścieżki builda (przyszłe wydanie zneutralizuje to przez
   `-ffile-prefix-map`).
3. **Stempel commita gita.** Build osadza `git rev-parse HEAD`; budowa źródeł
   0.2.1 spod innego commita różni się dokładnie 104 bajtami pól pochodzenia
   (hash ELF w deskryptorze aplikacji, 40-znakowy identyfikator commita i
   końcowy hash obrazu). Po wyłączeniu tych pól obrazy są identyczne bajtowo;
   budowa na samym tagu wydania daje pełną równość.

## Weryfikacja kandydata

```bash
npm run check
```

Polecenie sprawdza kontrakty, własność plików generowanych, testy
Node/C++/renderera, parytet dokumentacji, reguły prywatności raportów oraz dwie
deterministyczne próby obu archiwów RC1.

Ignorowane lokalne wyniki to:

- `dist/open-radio-core2-rc1-source.tar`,
- `dist/open-radio-core2-rc1-community-kit.tar`,
- `output/firmware/s11-rc1-evidence.json`.

Kanonicznym manifestem źródeł jest `release/rc1-source-lock.json`. Maintainer
aktualizuje go wyłącznie po przejrzeniu zamierzonych zmian:

```bash
npm run rehearse:rc1:write
npm run rehearse:rc1
```

## Odtwarzanie dowodów kontrybutora

```bash
npm run validate:community
npm run replay:community -- community/fixtures/replay-good.json
```

Replay jest lokalny i nie wykonuje operacji sieciowych, serial, Bluetooth,
flashowania, logowania ani publikacji. `STALE_FIRMWARE`, `SCHEMA_REJECTED` i
`PRIVACY_REJECTED` są ograniczonymi kodami błędów dla narzędzi.
