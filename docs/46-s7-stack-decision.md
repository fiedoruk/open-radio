# 46 — S7 measured stack decision

| Dimension | Public candidate | ESP-ADF reference |
|---|---|---|
| Target | M5Stack Core2 | official generic audio-board example |
| Build | PlatformIO + Arduino | ESP-IDF container + ESP-ADF |
| Audio path | HTTP/ICY → MP3/libmad → project PCM router | HTTP → MP3 → ADF BT stream |
| Build result | PASS | PASS |
| Static RAM | 79,140 bytes | not used for candidate decision |
| App/binary size | 1,306,265 app bytes | 1,840,512 byte binary |
| Public codec graph | MP3 only | unresolved binary/service graph |
| Core2 HAL | M5Unified | not integrated |
| Role | leading RC0 | private topology reference |

## Why the smaller lane leads

It directly supports the selected board, has fewer runtime abstractions, gives
the project ownership of fallback behavior and allows a mechanical MP3-only
source filter. The ADF example validates that the topology is conventional,
but integrating its board HAL and clearing its complete binary graph would add
risk without solving a demonstrated Core2 problem.

## What this decision does not claim

- No stream has been played on Core2.
- No Bluetooth speaker has been paired.
- No Wi-Fi/Bluetooth coexistence has been measured.
- No public binary is approved.
- HLS/HE-AAC support is not implemented.

The decision may be reversed after hardware evidence, but only if the smaller
lane fails a defined gate and ADF fixes that exact failure.
