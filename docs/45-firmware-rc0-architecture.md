# 45 — Firmware RC0 architecture

## Build lanes

`firmware/public-candidate` is the leading Core2 build. It compiles the real
ICY/MP3 decoder path, a project-owned bounded PCM queue, the built-in speaker
adapter, the A2DP Source queue and all four onboarding assets. It deliberately
does not connect or play on boot without a validated stored configuration.

`firmware/adf-reference` reproduces Espressif's official HTTP → MP3 → A2DP
example. It proves reuse feasibility but is not a Core2 application and is not
eligible for the public rehearsal bundle.

## Runtime boundaries

1. `DeviceStore` loads the newest valid A/B configuration or enters onboarding
   or safe mode.
2. `NetworkAdapter` selects only approved opaque profiles; open, unknown and
   captive networks never autojoin.
3. Resolver policy discovers a current endpoint from an official surface and
   persists only sanitized last-known-good state.
4. `Mp3StreamPipeline` converts HTTP/ICY MP3 into 44.1 kHz, stereo, 16-bit PCM.
5. `OutputRouter` selects exactly one output. A failed Bluetooth write disables
   BT preference and immediately tries the local speaker.
6. `RuntimeSupervisor` maps configuration, network, capability, stream and
   output facts to one bounded recovery action.
7. `BoardUi` renders the existing shared product states; unsupported HLS is a
   visible state, not a hidden retry loop.

## Memory ownership

- Decoder PCM queue: `4096 × 4 = 16,384` bytes.
- A2DP PCM queue: `4096 × 4 = 16,384` bytes.
- Local speaker rotating blocks: `3 × 256 × 4 = 3,072` bytes.
- HTTP input buffer: `32,768` bytes allocated only while a stream is active.

The first three buffers total `35,840` static bytes. The dynamic input buffer
and decoder state require hardware heap evidence before playback is claimed.

## Immutable-appliance behavior

No OTA, cloud control plane, telemetry or remote catalog update exists. Local
onboarding assets and the nine-station presentation catalog are compiled into
the image. Endpoint discovery is live, but boot and last-known-good playback do
not depend on a project backend.
