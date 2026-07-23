# 114 — Runbook publicznego mirrora

[English version](114-public-mirror-runbook.en.md)

Zapis decyzji to `decisions/ADR-011-public-repository-launch.md`. Ten runbook
jest procedurą operacyjną: jak startuje publiczne repozytorium, jak trafia do
niego każda przyszła aktualizacja i jakie niezmienniki pilnują drzewa.

## Model

Repozytorium prywatne pozostaje warsztatem: wszystkie gałęzie robocze,
eksperymenty i dowody. Repozytorium publiczne jest kanonicznym upstreamem i
dostaje dokładnie dwa rodzaje refów — gałąź `main` oraz tagi wydań
`open-radio-*` — wypychane z zachowaniem hashy commitów, więc prowieniencję
wydań zapisaną w manifestach może zweryfikować każdy. Polityka żyje jako dane
w `release/public-mirror-policy.json`.

## Jednorazowa checklista startu (owner)

1. Utwórz puste repozytorium zgodne z `repositoryUrl` w pliku polityki
   (najpierw popraw pole, jeśli nazwa ma być inna; nazwa to decyzja ownera).
2. Na GitHubie: włącz prywatne zgłaszanie podatności (Security Advisories);
   zdecyduj, czy Issues startują włączone i z jakimi szablonami.
3. Z czystego `main` z zieloną bramką uruchom:
   `ALLOW_PUBLIC_PUSH=1 CONFIRM_PUBLISH=YES npm run publish:mirror`
4. Porównaj hashe wypisane przez skrypt z wynikiem `git ls-remote` — muszą
   się zgadzać.
5. Podlinkuj repozytorium ze stron projektu obok pisemnej oferty źródeł.

## Przepływ wydania dla każdej przyszłej aktualizacji

1. Praca dzieje się na prywatnych gałęziach; nic z nich nie jest publiczne.
2. Merge do `main` tylko wtedy, gdy zmiana ma stać się publiczna.
3. `npm run check` musi być zielony — zawiera strażnika publicznego drzewa,
   więc drzewo z zakazaną ścieżką lub treścią nie przejdzie.
4. Publikacja tą samą komendą co start:
   `ALLOW_PUBLIC_PUSH=1 CONFIRM_PUBLISH=YES npm run publish:mirror`
5. Skrypt ponownie uruchamia pełną bramkę, robi skan historii gitleaks (gdy
   dostępny), wypycha wyłącznie dozwolone refy i drukuje weryfikację zdalną.

## Stałe reguły strażnika drzewa

- Nigdy publicznie: `assets-local/` (źródła grafik nadawców), pliki
  `raport-*`, lokalny korzeniowy `CLAUDE.md`, pliki env, klucze prywatne,
  absolutne ścieżki prywatnych workspace'ów. Strażnik wywala całą bramkę,
  jeśli cokolwiek z tego stanie się trackowane.
- Warsztat opuszczają tylko `main` i tagi `open-radio-*`; skrypt publikacji
  z konstrukcji odmawia innych refów i nigdy nie robi force-push.
- Publiczny remote musi mieć nazwę i URL z polityki; niezgodność przerywa.
- Publikacja z gałęzi innej niż `main` albo z brudnym drzewem przerywa:
  bramka musi walidować dokładnie te bajty, które wychodzą.

## Wkład zewnętrzny

Postawa mirror-first wg ADR-011: pull requesty nie są domyślnie mergowane,
bo przyjęty cudzy copyright ograniczyłby opcję dual-licensingu z ADR-003.
Istotny wkład uruchamia jawną decyzję ownera (merge z DCO, przepisanie albo
odmowa) — zapisaną, nie improwizowaną.

## Reakcja na incydent

Jeśli do publicznej historii trafi coś, co nie powinno: traktuj to jako
opublikowane (forki i mirrory mogą to już mieć). Ujawniony sekret rotuj
natychmiast — usunięcie z historii nie jest odzyskaniem. Przepisanie
publicznej historii łamie łańcuch prowieniencji hashy i jest ownerską decyzją
ostateczną; domyślna odpowiedź to commit fix-forward plus udokumentowane
ostrzeżenie.
