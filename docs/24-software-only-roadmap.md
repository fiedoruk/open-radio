# 24 — Autonomiczna roadmapa software-only

## Mandat

Do czasu dostawy M5Stack Core2 Codex prowadzi samodzielnie bezpieczne loopy T1/T2
w tym projekcie. Każdy loop kończy testami i dokumentacją. Zatrzymanie następuje
wyłącznie przed T3, publikacją release, flashem urządzenia lub wymaganiem fizycznego
dowodu hardware.

## Loop S1 — UI simulator baseline — COMPLETE

- Canvas 320x240,
- trzyetapowy onboarding,
- dziewięć oryginalnych proceduralnych motywów,
- stations/settings/About/diagnostics,
- recovery scenarios,
- testy state machine i browser screenshots.

## Loop S2 — UI contract hardening — COMPLETE

1. Dodać JSON Schema dla `UiSnapshot` i `UiCommand`.
2. Oddzielić render snapshot od reducer logic.
3. Zdefiniować wszystkie hitboxy jako dane, nie kod Canvas.
4. Dodać fixtures dla każdego system state, PL/EN i BT/local.
5. Dodać overflow audit dla najdłuższych tekstów.

**Exit:** fixture matrix kompletna, schema rejection tests i brak hardcoded command side effects w rendererze.

Plan wykonawczy: `docs/25-loop-s2-ui-contract-hardening.md`.

## Loop S3 — shared renderer path — COMPLETE

1. Utworzyć platform-neutral `ui-core` w C++.
2. Renderować deterministyczny bufor RGB565 320x240.
3. Przygotować host port zapisujący PPM/PNG lub hash framebufferu.
4. Zachować te same layout constants, fixtures i message keys.
5. Zaplanować WASM port bez instalowania globalnego toolchainu.

**Exit:** ten sam fixture daje stabilny hash na dwóch kolejnych buildach host.

Plan wykonawczy: `docs/26-loop-s3-shared-renderer-path.md`.

## Loop S4 — catalog and resolver simulator — COMPLETE

1. Zamknąć schema dziewięciu stacji i regionalnych wariantów.
2. Oddzielić canonical resolver od transient endpointu.
3. Zasymulować primary, alternate, timeout, 404 i stale response.
4. Zaimplementować health score, quarantine i last-known-good w host modelu.
5. Testować 6 MP3 i 3 HLS jako różne capability classes.

**Exit:** każda stacja ma source, transport, prawa do artwork i scenariusz recovery.

Plan wykonawczy: `docs/29-loop-s4-catalog-resolver.md`.

## Loop S5 — persistence and recovery model — COMPLETE

1. Wersjonowany config schema.
2. Atomic draft -> validate -> commit.
3. Dual-slot last-known-good.
4. Corrupt config, interrupted write i schema migration fixtures.
5. Boot-loop/safe-mode policy.

**Exit:** host tests dowodzą powrotu do ostatniego dobrego configu po każdej symulowanej awarii zapisu.

Plan wykonawczy: `docs/32-loop-s5-persistence-recovery.md`.

## Loop S6 — network onboarding prototype — COMPLETE

1. Statyczny mock lokalnego portalu Wi-Fi.
2. Bezpieczny model wielu profili bez sekretów w fixtures.
3. Scan/selection scoring i captive-portal boundary.
4. PL/EN flow i powrót po utracie zasilania.
5. Security review wejść i logów.

**Exit:** pełny onboarding można przejść przeglądarkowo bez przechowywania prawdziwych haseł w repo.

Plan wykonawczy: `docs/38-loop-s6-network-onboarding.md`.

## Loop S7 — software RC0 and hardware-ready integration — COMPLETE

1. Dwa pinned toolchainy i evidence-based wybór prowadzącego stacku.
2. Wspólne adaptery bez duplikowania UI, resolvera, network i persistence.
3. Jeden zintegrowany firmware RC0 z wygenerowanymi assetami projektu.
4. MP3-first compile path z local speaker oraz A2DP za OutputRouter.
5. Clean-cache build, binary/resource evidence i deterministic hashes.
6. Dependency inventory, SBOM-style matrix, notices i license stop-gates.
7. Local release rehearsal bez publikacji i bez prywatnych artefaktów.
8. End-to-end fault injection oraz pełny host regression.
9. Hardware validation matrix: UI, audio, RF, powerbank, memory i soak.
10. Exact build/backup/flash/rollback/smoke packet bez wykonania flasha.

**Exit:** jeden spójny firmware RC0 i kompletny hardware-arrival packet albo
precyzyjny blocker; nie kończymy na samych manifestach lub pierwszym compile.

Plan wykonawczy: `docs/44-loop-s7-reproducible-firmware-spikes.md`.

## Loop S8 — firmware service parity and hostile-input hardening — COMPLETE

1. Generować C++ golden vectors z istniejących kontraktów resolver/network/persistence.
2. Dodać host/ESP adapter store A/B bez prawdziwych credentiali.
3. Skompilować politykę wyboru Wi-Fi i retry w torze firmware.
4. Skompilować resolver MP3 z parserami odpowiedzi oficjalnych powierzchni.
5. Dodać lokalny onboarding route table i bezpieczne DTO zapisu konfiguracji.
6. Połączyć snapshot UI z rendererem ekranowym Core2 bez zmiany layout contract.
7. Fuzzować corrupt config, niepełny HTTP, przepełnienia i nieznane enumy.
8. Zmierzyć alokacje, kolejki, retry timers i single-output invariants na hoście.
9. Dodać compile variants: no-BT fallback, no-network onboarding i safe mode.
10. Utrzymać dwa czyste buildy, release rehearsal i hardware packet w zieleni.

**Exit:** firmware compile graph obejmuje realne usługi polityki i golden-vector
parity bez credentiali, połączenia z siecią, flasha albo twierdzeń hardware.

Plan wykonawczy: `docs/51-loop-s8-firmware-service-parity.md`.

## Loop S9 — runtime orchestration and deterministic soak — COMPLETE

- Jeden właściciel stanu aplikacji, bounded kolejki/timery/diagnostyka.
- Cztery soaki obejmujące 2100 wirtualnych minut i 621 zdarzeń awarii.
- Parytet JavaScript/C++ oraz jawny safe mode po korupcji konfiguracji.

Plan wykonawczy: `docs/54-loop-s9-runtime-orchestration-soak.md`.

## Loop S10 — hardware callback ingress and replay — COMPLETE

- Jeden mailbox o pojemności 16 dla siedmiu klas producerów.
- Dziesięć trace i 98 faktów z rollover, restartami i saturacją.
- Fizyczne latency, heap, stack i underrun pozostają `NOT_MEASURED`.

Plan wykonawczy: `docs/57-loop-s10-hardware-adapter-ingress-replay.md`.

## Loop S11 — RC1 source freeze and community kit — COMPLETE

- Deterministyczny manifest i lock źródeł z własnością plików generowanych.
- Ścisłe raporty Bluetooth, stacji i replay bez prywatnych payloadów.
- Dwa identyczne archiwa source-only oraz dwa identyczne community kits.
- Instrukcje contribution, support i reproducibility utrzymane w EN/PL.

Plan wykonawczy: `docs/61-loop-s11-rc1-source-freeze-community-kit.md`.

## Loop S12 — private repository baseline and CI — COMPLETE

- Reviewed baseline on private `main` with no public release.
- Read-only GitHub Actions permissions and SHA-pinned official actions.
- Complete Node/C++ host gate on pushes and pull requests.
- CODEOWNERS plus explicit owner-decision proposals.
- RC1 source policy includes the reproducible CI definition.

Plan wykonawczy: `docs/64-loop-s12-private-repository-ci.md`.

## Software-only broad closeout — COMPLETE

- Shared RGB565 renderer linked into the actual Core2 target.
- Deterministic Inter 600 atlas with bounded UTF-8 handling for the declared
  Polish and English character set.
- Device boot no longer fabricates healthy storage, network, resolver, stream
  or Bluetooth facts; empty storage enters configuration-required state.
- Time policy closed with monotonic device time and no NTP dependency.
- Xiaomi and MOZOS qualification records prepared without compatibility claims.
- H0 backup/rollback packet validated without serial, network or device I/O.
- Final clean-build firmware evidence: 1,298,832 bytes, SHA-256
  `0b09b88bdd50dbd8b606bdbb0c14f97492b25b39397226f63058938ca726dbaf`.

This was the S12 closeout boundary. S15-S18 and the current
`BUILD / SOFTWARE-ONLY` instruction supersede its blanket host-loop stop.
Continue only work that can be validated without pretending to have physical
evidence. Closeout snapshot: `docs/65-software-only-hardware-ready-closeout.md`.

## Hardware gate

Po dostawie: display/touch transform, RGB565 parity, physical readability,
speaker, battery/PMU, A2DP, Wi-Fi coexistence, powerbank oraz soak. Żaden wynik
emulatora nie promuje automatycznie tych obszarów do PASS.
