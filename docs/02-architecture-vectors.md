# 02 — Wektory implementacji Core2

## A) PlatformIO + Arduino + M5Unified — rekomendowany start

- Najkrótsza droga do display/touch/speaker i pierwszego radia.
- Oficjalny profil `m5stack-core2` i aktywnie utrzymywane M5Unified.
- Oficjalny przykład M5Unified WebRadio daje punkt startu HTTP/ICY -> MP3 -> speaker.
- A2DP Source wymaga adaptera PCM i bounded ring bufferu.
- Najpierw ma przejść 24-godzinny soak; dopiero potem zostaje stackiem stable.

## B) ESP-IDF + ESP-ADF — fallback stabilności

- Oficjalne pipeline'y audio, taski, ring buffery i eventy.
- Lepsza kontrola pamięci, coexistence i reconnectów.
- Więcej integracji Core2 oraz wyższy koszt wejścia.
- Uruchamiamy, jeśli wariant A nie przejdzie po trzech sensownych poprawkach.

## C) Dodatkowy hardware audio

- Niepotrzebny w MVP.
- Rozważany tylko jeśli jednoczesne Wi-Fi+A2DP na jednym ESP32 okaże się niestabilne.
- Nie może być przypadkowym obejściem błędu software.

## Decyzja

Startujemy A. B jest jawnie zaprojektowanym fallbackiem. C pozostaje poza MVP.

## Moduły firmware

```text
StationCatalog -> StreamResolver -> Decoder -> PcmNormalizer -> PcmQueue
                                                     |
                                                     v
                                              OutputRouter
                                              /          \
                                      Bluetooth          Core2 speaker

RecoverySupervisor observes all modules; UiPresenter consumes state only.
```
