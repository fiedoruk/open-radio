# Audio dependency and codec license audit — 2026-07-13

Status: **DECISION INPUT / NOT LEGAL ADVICE**

This document is a technical open-source compliance audit. It separates facts
found in upstream license files from conclusions that require qualified legal
review. It does not clear patents, trademarks, Bluetooth qualification or
broadcaster rights.

## Executive verdict

1. **Preferred public MP3 path:** M5Unified + ESP32-A2DP + Arduino Audio Tools
   and/or the MP3-only parts of ESP8266Audio is directionally compatible with a
   `GPL-3.0-or-later` firmware, provided the complete corresponding source,
   license texts, notices and build/install information are shipped.
2. **Private hardware spike:** ESP-ADF + `esp_audio_codec` may be evaluated on
   Core2 because both licenses expressly permit use with Espressif products.
   This is not a public-release clearance.
3. **Public binary stop:** do not publish a GPL firmware binary statically
   linked with the prebuilt `esp_audio_codec` archives before a written
   compatibility decision. The archives are not accompanied by corresponding
   source and their license adds an Espressif-only field-of-use restriction.
4. **AAC/HE-AAC stop:** do not publish an AAC/HE-AAC firmware binary using
   either Espressif's binary codec or ESP8266Audio's Helix code before both a
   copyright-license review and a patent-route decision. Open-source copyright
   licensing does not grant all AAC patent rights.
5. **No dependency is approved by name alone.** Pin exact versions, generate an
   SBOM from the final link graph and audit all optional codec modules actually
   included by the build.

## Observed current versions

The versions below are upstream observations on 2026-07-13, not versions
installed in this repository.

| Component | Observed current release | Maintenance evidence | Pinning rule |
|---|---:|---|---|
| [ESP-ADF](https://github.com/espressif/esp-adf/releases/tag/v2.8) | `v2.8`, 2026-03-17 | Maintained; upstream says `v2.8+` is updated only on `release/v2.x` | Pin release tag and recursive submodule commits; never use `master` for this line |
| [esp_audio_codec](https://components.espressif.com/components/espressif/esp_audio_codec) | `2.6.0`, 2026-07-01 | Current Espressif Component Registry release | Pin exact component version and preserve the generated component lock/checksum |
| [M5Unified](https://github.com/m5stack/M5Unified/releases/tag/0.2.18) | `0.2.18`, 2026-07-09 | Maintained release | Pin tag/commit in PlatformIO lock data |
| [ESP32-A2DP](https://github.com/pschatzmann/ESP32-A2DP/releases/tag/v1.8.11) | `v1.8.11`, 2026-05-30 | Maintained release | Pin tag/commit; do not follow `main` |
| [Arduino Audio Tools](https://github.com/pschatzmann/arduino-audio-tools/releases/tag/v1.2.5) | `v1.2.5`, 2026-06-23 | Maintained release | Pin tag/commit and enumerate enabled optional codecs |
| [ESP8266Audio](https://github.com/earlephilhower/ESP8266Audio/releases/tag/2.4.1) | `2.4.1`, 2025-10-23 | Current release; repository still active in 2026 | Pin tag/commit; treat bundled codec directories as separate licensed components |

Version freshness is not a safety or license verdict. Recheck this table before
the first hardware build and again before any public source or binary release.

## Primary license evidence

| Dependency or codec | Upstream fact | Direction for `GPL-3.0-or-later` | Private Core2 spike | Public GPL source | Public GPL binary |
|---|---|---|---|---|---|
| [ESP-ADF license](https://github.com/espressif/esp-adf/blob/release/v2.x/LICENSE) | `ESPRESSIF MIT License`; use is granted on Espressif products and the notice must be retained | **Review required.** It is not standard MIT and carries a hardware field-of-use condition | **Allowed by text** on Core2/ESP32, subject to notices | Publish upstream code under its own license, not as if it were GPL-only | **Blocked pending review** of the additional restriction and final static-link composition |
| [esp_audio_codec license](https://github.com/espressif/esp-adf-libs/blob/master/esp_audio_codec/LICENSE) | `LicenseRef-Espressif-Modified-MIT`; exclusive Espressif use; redistribution for non-Espressif products prohibited | **High-risk combination.** Prebuilt static archives plus a field-of-use restriction do not provide GPL corresponding source | **Allowed by text** on Core2/ESP32; no redistribution conclusion | A GPL application may document an external optional dependency, but must not claim this codec is GPL/open-source | **STOP** until written compatibility and source-offer analysis |
| [M5Unified license](https://github.com/m5stack/M5Unified/blob/master/LICENSE) | Standard MIT; retain copyright and license | Directionally compatible | Yes | Yes | Yes, with notice |
| [ESP32-A2DP license](https://github.com/pschatzmann/ESP32-A2DP/blob/main/LICENSE) | Apache-2.0 | Directionally compatible with GPLv3; retain license, notices and modification statements | Yes | Yes | Yes, with Apache obligations |
| [Arduino Audio Tools license](https://github.com/pschatzmann/arduino-audio-tools/blob/main/License.txt) | GPLv3; README identifies the project as GPLv3 | Same copyleft family; distribute the combined firmware under GPLv3-compatible terms | Yes | Yes | Yes, if complete corresponding source and GPLv3 obligations are met |
| [ESP8266Audio root license](https://github.com/earlephilhower/ESP8266Audio/blob/master/LICENSE) | GPLv3; README says bundled code includes separately sourced codecs | Root direction is compatible, but file-level licenses control bundled codec code | Yes | Yes, after component inventory | MP3 path is plausible; AAC path remains stopped |
| [ESP8266Audio libmad header](https://github.com/earlephilhower/ESP8266Audio/blob/master/src/libmad/mad.h) | libmad declares GPL version 2 **or later** | Can be conveyed under GPLv3 with the combined firmware | Yes | Yes | Yes, subject to full GPL source/notices |
| [ESP8266Audio Helix AAC file](https://github.com/earlephilhower/ESP8266Audio/blob/master/src/libhelix-aac/aacdec.c) | File header applies RealNetworks Public Source License or a separately obtained RCSL | **Review required.** RPSL Exhibit B lists GPL but expressly warns reciprocal terms may prevent combinations | Personal/internal R&D is expressly distinguished in RPSL; still retain the license text and do not infer patent clearance | Source publication creates RPSL notice, modification and external-deployment duties | **STOP** pending RPSL/GPL and AAC patent review |

### Important fact: `esp_audio_codec` is binary-heavy

The current `esp_audio_codec` component contains architecture-specific static
archives, including `libesp_audio_codec.a` and `libesp_audio_simple_dec.a`, and
advertises MP3, AAC-LC, HE-AAC and HE-AACv2 decoding. Its component license is
not Apache-2.0 and not standard MIT. The separate [ESP-ADF copyrights page](https://docs.espressif.com/projects/esp-adf/en/latest/COPYRIGHT.html)
lists historical third-party MP3/AAC source licenses, but it also says file
headers take precedence. That page must not be used to relabel the current
prebuilt `esp_audio_codec` archives as Apache-2.0.

## Codec-specific risk

### MP3

Facts:

- [Fraunhofer IIS states](https://www.iis.fraunhofer.de/en/ff/amm/consumer-electronics/mp3.html)
  that its and Technicolor's MP3 licensing program ended on 2017-04-23.
- ESP8266Audio's MP3 implementation includes libmad under GPL-2.0-or-later.
- Ending one licensing program does not itself prove that every possible patent
  claim in every jurisdiction is cleared.

Technical decision:

- MP3 via the GPL libmad path is the lowest-risk public-binary codec candidate.
- Preserve libmad attribution and source; do not state “MP3 is patent-free
  worldwide.”

### AAC, HE-AAC and HE-AACv2

Facts:

- Via Licensing Alliance was still adding device manufacturers to its
  [AAC patent pool in 2026](https://www.via-la.com/wp-content/uploads/2026/03/Honor-AAC-press-release_022726.pdf).
- The `esp_audio_codec` README advertises AAC-LC, HE-AAC and HE-AACv2 but its
  copyright license does not grant all third-party standard-essential patents.
- ESP8266Audio states that its AAC decoder comes from Helix under RPSL and that
  commercial use still needs the usual AAC licensing review.
- [RPSL 1.0](https://spdx.org/licenses/RPSL-1.0.html) requires notices, public
  source for externally deployed modifications, object-code notices and
  contains broad derivative-work terms. It separately makes the user
  responsible for required third-party patent rights.

Technical decision:

- AAC/HE-AAC may be exercised in a controlled private hardware spike to measure
  RAM, CPU and stream compatibility.
- No AAC/HE-AAC binary, release image or “license-cleared” claim may be
  published until the project records a written copyright compatibility
  decision and a patent route for the intended jurisdictions and distribution
  model.
- If no acceptable route exists, first public release remains MP3-only and the
  three HLS/HE-AAC stations stay explicitly unsupported rather than silently
  shipping a questionable codec.

### SBC for A2DP

ESP32-A2DP/ESP-IDF provides the software path for standards-based A2DP Source
using SBC. Apache-2.0 code licensing does not by itself settle Bluetooth SIG
qualification, marks or product-listing requirements. Treat those as a separate
pre-release review; never turn this dependency audit into a claim of
compatibility with every present or future speaker.

## Distribution obligations and artifacts

Before any public binary, generate the following from the exact locked build:

1. `sbom.spdx.json` or `sbom.cdx.json` with package name, version, source URL,
   commit/checksum, license expression and relationship to the firmware.
2. `THIRD_PARTY_NOTICES.md` containing every retained MIT, Espressif, Apache,
   GPL, libmad and, if present, RPSL notice.
3. A machine-readable dependency lock: PlatformIO lock data plus ESP-IDF
   `dependencies.lock` where applicable.
4. Complete corresponding source for the exact binary, including project code,
   modified dependency source, build scripts, configuration and required
   installation information under GPLv3 where applicable.
5. A reproducible build manifest: target, toolchain, SDK, dependency commits,
   configuration, firmware hash and size.
6. A modification ledger for Apache-2.0 and RPSL-covered files.
7. An in-device `About / O projekcie` notice screen and a copy of notices in the
   source release. RPSL object-code wording is mandatory if Helix is present.
8. A codec bill of materials showing what is linked, not merely what a parent
   library can optionally support.

Do not use `NOASSERTION`, a repository badge or a parent project's root license
as the final SBOM license for bundled codec code.

## Stop-gates

| Gate | Required evidence | Result if missing |
|---|---|---|
| `G-LIC-01` final link map | Linker map and component-level SBOM for the exact firmware | No public binary |
| `G-LIC-02` Espressif binary codec | Written decision covering GPLv3 corresponding source and field-of-use restriction | Exclude `esp_audio_codec` from public binary |
| `G-LIC-03` Helix/RPSL | Written RPSL/GPL compatibility analysis, complete RPSL notices and external-deployment process | Exclude Helix AAC from public source and binary |
| `G-PAT-01` AAC family | Jurisdiction/distribution-specific patent review or documented licensed implementation route | No AAC/HE-AAC public binary |
| `G-NOTICE-01` attribution | Generated SBOM, third-party notices, license texts and modification ledger | No release candidate |
| `G-SRC-01` GPL source | Rebuildable corresponding source and installation information matching the binary hash | No binary distribution |
| `G-BT-01` Bluetooth release claims | Separate Bluetooth qualification/marks review and tested A2DP compatibility matrix | No universal compatibility claim |

## Approved experiment lanes

### Lane A — recommended public architecture candidate

- M5Unified `0.2.18`
- ESP32-A2DP `1.8.11`
- Arduino Audio Tools `1.2.5` where its abstractions are needed
- ESP8266Audio `2.4.1`, **MP3/libmad subset only**
- Project firmware under `GPL-3.0-or-later`

This lane is not automatically release-ready, but its known copyright licenses
can be satisfied within a GPLv3 source-and-notice workflow.

### Lane B — private stability and performance spike

- ESP-ADF `v2.8` from `release/v2.x`
- exact `esp-adf-libs` submodule revision
- `esp_audio_codec` `2.6.0`
- Core2/ESP32 hardware only

This lane may prove HTTP/HLS/AAC-to-A2DP feasibility. Keep resulting firmware
images private, retain all notices and do not merge its binary codec into the
public release lane until `G-LIC-02` and `G-PAT-01` pass.

## Recommended project decision

Run both hardware spikes when Core2 arrives, but preserve a hard architectural
boundary:

- **public baseline:** MP3 + GPL/Apache/MIT source stack;
- **evaluation adapter:** Espressif ADF/codec behind a replaceable decoder
  interface;
- **AAC release:** disabled by default and impossible to include accidentally
  unless all AAC stop-gates are explicitly satisfied.

This avoids reinventing the transport and Bluetooth pipeline while preventing a
successful private demo from being mistaken for a legally distributable open-
source firmware image.

## Evidence limitations

- No dependency was cloned, installed, built or linked during this audit.
- No legal opinion or jurisdiction-specific patent search was performed.
- Optional/transitive dependencies outside the named repositories were not
  cleared because the final build graph does not yet exist.
- Release dates and versions are a 2026-07-13 snapshot and must be refreshed at
  the dependency-lock milestone.
