# 05 — Audio i Bluetooth na Core2

## Główny tor

```text
official station stream
  -> HTTP/ICY resolver
  -> MP3 decoder
  -> PCM 44.1 kHz / stereo / 16-bit
  -> bounded ring buffer
  -> ESP32 A2DP Source
  -> SBC
  -> remembered Bluetooth speaker
```

## Fallback

Ten sam PCM trafia przez `OutputRouter` do wbudowanego M5Stack Core2 speaker.
W MVP aktywny jest dokładnie jeden output.

## Pairing contract

- Pierwsze uruchomienie: jawny tryb pairing.
- Po wyborze zapisujemy MAC i czytelną nazwę głośnika.
- Kolejne uruchomienia: ograniczona próba reconnect do zapamiętanego MAC.
- Brak BT: local speaker zgodnie z decyzją Q-04.
- Long press: ponowne wejście w pairing.
- Jeden zapamiętany sink w MVP.

## Ryzyka

- Wi-Fi i BT dzielą radio 2.4 GHz.
- Przeciążenie internal RAM może wystąpić mimo wolnej PSRAM.
- Nie każdy głośnik tak samo obsługuje reconnect/AVRCP/absolute volume.
- Streamy o innych sample rates zwiększają koszt CPU przez resampling.
- Metadata i UI nie mogą blokować callbacku audio.

## Metryki testowe

- liczba underrunów,
- długość kolejki PCM,
- reconnect latency Wi-Fi/BT/stream,
- minimum free internal heap,
- free PSRAM,
- reset reason,
- czas ciągłego playbacku,
- maksymalna przerwa słyszalna.
