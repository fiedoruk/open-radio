#pragma once

#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFiClientSecure.h>

#include <cstddef>
#include <cstdint>
#include <algorithm>
#include <cstring>
#include <iterator>

#include "open_radio/runtime_service_bridge.hpp"
#include "public_audio_pipeline.hpp"
#include "station_catalog.hpp"
#include "station_slots.hpp"

namespace open_radio::public_candidate {

class StationRuntime {
 public:
  StationRuntime(Preferences& preferences, RuntimeServiceBridge& services,
                 Mp3StreamPipeline& pipeline, const StationSlots& slots)
      : preferences_(preferences), services_(services), pipeline_(pipeline),
        slots_(slots) {}

  void select(std::uint8_t stationIndex, std::uint32_t nowMs) {
    if (stationIndex != stationIndex_) pipeline_.stop();
    stationIndex_ = stationIndex;
    // Start from the locally proven endpoint. Live operator discovery remains
    // the recovery path if it has expired, so first sound does not depend on a
    // remote catalog/API.
    activeEndpoint_ = preferences_.getString(lastKnownGoodKey().c_str());
    activeEndpointAac_ = parseStoredEndpoint(activeEndpoint_);
#if defined(OPEN_RADIO_HAS_HLS)
    // ...unless the proven endpoint is an aacp mount: MP3 is the default
    // again (heavy HE-AAC+SBR decode audibly starved the A2DP TX side —
    // owner A/B 2026-07-17 evening), so a stored aacp endpoint from the
    // AAC-first era yields to a fresh MP3-deck resolution. Cached pools
    // make that instant, and the stored endpoint still backs up a failed
    // resolution inside start().
    if (stationUsesRmfonPools(stationIndex_) && activeEndpointAac_) {
      activeEndpoint_ = "";
      activeEndpointAac_ = false;
    }
#endif
    running_ = false;
    healthy_ = false;
    hlsActive_ = false;
    retryIndex_ = 0;
    rmfCandidateIndex_ = 0;
    exhaustedCycles_ = 0;
    // A reassigned slot counts its own alternates, so "everything failed" means
    // the same thing whichever list the station came from.
    const std::size_t chosenCount = slots_.endpointCount(stationIndex_);
    candidatesAtSelect_ =
        chosenCount > 0
            ? chosenCount
            : (stationIndex_ < open_radio::generated::kStationCount
                   ? open_radio::generated::kStations[stationIndex_].playbackCount
                   : 0);
    retryAtMs_ = nowMs;
  }

  void networkConnected(std::uint32_t nowMs) {
    networkAvailable_ = true;
    retryAtMs_ = nowMs;
  }

  void networkLost(std::uint32_t nowMs) {
    networkAvailable_ = false;
    if (running_) pipeline_.stop();
    running_ = false;
    healthy_ = false;
    hlsActive_ = false;
    activeEndpoint_ = "";
    services_.stream(false, 1, nextSequence(), nowMs);
  }

  // Local modes deliberately close the live stream through the same owned
  // pipeline path as a terminal source failure. Keeping this in StationRuntime
  // prevents a second, subtly different teardown sequence in main.cpp.
  void suspend(std::uint32_t nowMs) {
    if (running_) pipeline_.stop();
    running_ = false;
    healthy_ = false;
    hlsActive_ = false;
    activeEndpoint_ = "";
    activeEndpointAac_ = false;
    sourceDeadSinceMs_ = 0;
    lastProgressMs_ = 0;
    services_.stream(false, 1, nextSequence(), nowMs);
  }

  void loop(std::uint32_t nowMs, bool startAllowed = true) {
    if (!networkAvailable_) return;
    if (!running_ && startAllowed &&
        static_cast<std::int32_t>(nowMs - retryAtMs_) >= 0) {
      start(nowMs);
      return;
    }
    if (running_ && !pipeline_.loop()) {
      running_ = false;
      healthy_ = false;
      ++unexpectedStops_;
      ++rmfCandidateIndex_;
      // Without this, the next start() replays the exact endpoint that just
      // died and the candidate bump above never takes effect — hit live
      // 2026-07-17: an aacp URL stored as last-known-good by a newer build
      // kept the MP3 decoder in an open-die loop (81 starts in 3 minutes).
      // Clearing forces a fresh resolution; the stored endpoint remains
      // start()'s fallback when resolution fails, and the next healthy
      // stream overwrites it.
      activeEndpoint_ = "";
      services_.stream(false, 1, nextSequence(), nowMs);
      retryAtMs_ = nowMs + kFastReconnectDelayMs;
      return;
    }
    // Fast lane for an announced death: streamtheworld edges drop the TCP
    // connection outright (STATUS_DISCONNECTED; ~65 drops in a 12-minute soak
    // 2026-07-17) and with library-internal reconnects disabled every drop
    // otherwise silences playback until the generic 8 s watchdog below. Two
    // seconds without a drained frame after an announced drop is unambiguous.
    const std::uint32_t sourceEvents = pipeline_.sourceStatusEvents();
    if (sourceEvents != lastSourceEventCount_) {
      lastSourceEventCount_ = sourceEvents;
      const int status = pipeline_.lastSourceStatus();
      // AudioFileSourceHTTPStream: 3 = STATUS_DISCONNECTED, 6 = STATUS_NODATA.
      if ((status == 3 || status == 6) && sourceDeadSinceMs_ == 0) {
        sourceDeadSinceMs_ = nowMs;
      }
    }
    if (running_ && healthy_ && startAllowed && sourceDeadSinceMs_ != 0 &&
        nowMs - sourceDeadSinceMs_ >= kSourceDeadReopenMs) {
      Serial.printf("stream_stage stage=source-dead duration_ms=%lu\n",
                    static_cast<unsigned long>(nowMs - sourceDeadSinceMs_));
      sourceDeadSinceMs_ = 0;
      pipeline_.stop();
      running_ = false;
      healthy_ = false;
      ++unexpectedStops_;
      ++rmfCandidateIndex_;
      activeEndpoint_ = "";
      services_.stream(false, 1, nextSequence(), nowMs);
      retryAtMs_ = nowMs + kFastReconnectDelayMs;
      return;
    }
    if (running_ && healthy_ && startAllowed && lastProgressMs_ != 0 &&
        nowMs - lastProgressMs_ >= kStreamProgressStallMs) {
      Serial.printf("stream_stage stage=stall-watchdog duration_ms=%lu\n",
                    static_cast<unsigned long>(nowMs - lastProgressMs_));
      pipeline_.stop();
      running_ = false;
      healthy_ = false;
      ++unexpectedStops_;
      ++rmfCandidateIndex_;
      activeEndpoint_ = "";
      services_.stream(false, 1, nextSequence(), nowMs);
      retryAtMs_ = nowMs + kFastReconnectDelayMs;
    }
  }

  void decodedFrames(std::size_t count, std::uint32_t nowMs) {
    if (count > 0) {
      lastProgressMs_ = nowMs;
      sourceDeadSinceMs_ = 0;
    }
    if (running_ && !healthy_ && count > 0) {
      healthy_ = true;
      retryIndex_ = 0;
      exhaustedCycles_ = 0;
      if (activeEndpoint_.length() > 0) {
        const String storedValue =
            activeEndpointAac_ ? "aac|" + activeEndpoint_ : activeEndpoint_;
        preferences_.putString(lastKnownGoodKey().c_str(), storedValue);
      }
      services_.stream(true, 1, nextSequence(), nowMs);
    }
  }

  bool running() const { return running_; }
  bool healthy() const { return healthy_; }
  std::uint32_t startAttempts() const { return startAttempts_; }
  std::uint32_t startFailures() const { return startFailures_; }
  std::uint32_t unexpectedStops() const { return unexpectedStops_; }
  std::uint32_t lastStartDurationMs() const { return lastStartDurationMs_; }
  std::size_t exhaustedCycles() const { return exhaustedCycles_; }
  bool networkCritical() const {
    return networkAvailable_ && hlsActive_;
  }

 private:
  static constexpr const char* kRmfonRootCa = R"CERT(-----BEGIN CERTIFICATE-----
MIICjzCCAhWgAwIBAgIQXIuZxVqUxdJxVt7NiYDMJjAKBggqhkjOPQQDAzCBiDEL
MAkGA1UEBhMCVVMxEzARBgNVBAgTCk5ldyBKZXJzZXkxFDASBgNVBAcTC0plcnNl
eSBDaXR5MR4wHAYDVQQKExVUaGUgVVNFUlRSVVNUIE5ldHdvcmsxLjAsBgNVBAMT
JVVTRVJUcnVzdCBFQ0MgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkwHhcNMTAwMjAx
MDAwMDAwWhcNMzgwMTE4MjM1OTU5WjCBiDELMAkGA1UEBhMCVVMxEzARBgNVBAgT
Ck5ldyBKZXJzZXkxFDASBgNVBAcTC0plcnNleSBDaXR5MR4wHAYDVQQKExVUaGUg
VVNFUlRSVVNUIE5ldHdvcmsxLjAsBgNVBAMTJVVTRVJUcnVzdCBFQ0MgQ2VydGlm
aWNhdGlvbiBBdXRob3JpdHkwdjAQBgcqhkjOPQIBBgUrgQQAIgNiAAQarFRaqflo
I+d61SRvU8Za2EurxtW20eZzca7dnNYMYf3boIkDuAUU7FfO7l0/4iGzzvfUinng
o4N+LZfQYcTxmdwlkWOrfzCjtHDix6EznPO/LlxTsV+zfTJ/ijTjeXmjQjBAMB0G
A1UdDgQWBBQ64QmG1M8ZwpZ2dEl23OA1xmNjmjAOBgNVHQ8BAf8EBAMCAQYwDwYD
VR0TAQH/BAUwAwEB/zAKBggqhkjOPQQDAwNoADBlAjA2Z6EWCNzklwBBHU6+4WMB
zzuqQhFkoJ2UOQIReVx7Hfpkue4WQrO/isIJxOzksU0CMQDpKmFHjFJKS04YcPbW
RNZu9YO6bVi9JNlWSOrvxKJGgYhqOkbRqZtNyWHa0V1Xahg=
-----END CERTIFICATE-----)CERT";
  static constexpr std::uint32_t kDiscoveryTimeoutMs = 5000;
  static constexpr std::uint32_t kFastReconnectDelayMs = 250;
  // A stalled-but-open connection (server stops sending, socket stays up)
  // keeps AudioGeneratorMP3::loop() "running" forever, so unexpectedStops_
  // never fires and playback wedges silently (hit live 2026-07-17 on an
  // rmfstream edge minutes after the catalog swap). Eight seconds without a
  // single drained frame while healthy is unambiguous: local drain moves a
  // block at least every ~3 s and BT drain is continuous. The Bluetooth
  // standby window (drain paused) is excluded via startAllowed.
  static constexpr std::uint32_t kStreamProgressStallMs = 8000;
  static constexpr std::uint32_t kSourceDeadReopenMs = 2000;
  static constexpr std::size_t kRmfCandidateCount = 10;
  static constexpr std::uint32_t kRetryDelaysMs[] = {5000, 30000, 120000,
                                                      600000};

  static String decodeJsonString(const String& input, int start) {
    String output;
    output.reserve(127);
    bool escaped = false;
    for (int index = start; index < input.length() && output.length() < 127;
         ++index) {
      const char value = input[index];
      if (escaped) {
        if (value == '/' || value == '\\' || value == '"') output += value;
        escaped = false;
      } else if (value == '\\') {
        escaped = true;
      } else if (value == '"') {
        break;
      } else {
        output += value;
      }
    }
    return output;
  }

  static String extractArrayString(const String& input, const char* marker,
                                   std::size_t candidateIndex) {
    int cursor = input.indexOf(marker);
    if (cursor < 0) return {};
    cursor += std::strlen(marker);
    for (std::size_t index = 0; index <= candidateIndex; ++index) {
      const String candidate = decodeJsonString(input, cursor);
      if (candidate.length() == 0) return {};
      if (index == candidateIndex) return candidate;
      const int next = input.indexOf("\",\"", cursor);
      if (next < 0) return {};
      cursor = next + 3;
    }
    return {};
  }

  static String audioHttpUrl(String endpoint) {
    if (endpoint.startsWith("https://")) endpoint.remove(4, 1);
    return endpoint;
  }

  std::uint32_t nextSequence() { return sequence_++; }

  String fetchJson(const char* endpoint) {
    WiFiClientSecure client;
    client.setCACert(kRmfonRootCa);
    HTTPClient request;
    request.setConnectTimeout(kDiscoveryTimeoutMs);
    request.setTimeout(kDiscoveryTimeoutMs);
    if (!request.begin(client, endpoint)) return {};
    const int status = request.GET();
    const int length = request.getSize();
    if (status != HTTP_CODE_OK || length <= 0 ||
        length > static_cast<int>(kDiscoveryResponseBytes)) {
      request.end();
      return {};
    }
    String body = request.getString();
    request.end();
    if (body.length() == 0 || body.length() > kDiscoveryResponseBytes) return {};
    return body;
  }

  // TLS discovery needs ~40 KB of internal heap for the handshake; with the
  // Bluetooth stack active only ~25-30 KB is free, so a station switch during
  // playback fails discovery BY DESIGN. With last-known-good re-namespaced to
  // lkg2_ that stranded every rmfon station until reboot. Pinned plain-HTTP
  // edge mounts (live-probed 2026-07-17; mount names are long-lived, the
  // rotating part is only the rs-host pool) keep those stations startable in
  // any heap state; a later healthy TLS discovery refreshes LKG normally.
  static int rmfPoolSlot(int rmfonStationId) {
    if (rmfonStationId == 5) return 0;
    if (rmfonStationId == 6) return 1;
    if (rmfonStationId == 29) return 2;
    return -1;
  }

  // The operator's discovery API is keyed by its own station ids (5, 6, 29),
  // which have no relation to our catalog order. This is the only place that
  // knows the mapping, and it derives it from the catalog row rather than from
  // a second hand-maintained list that could drift out of lockstep.
  static int rmfonStationIdFor(std::uint8_t stationIndex) {
    if (stationIndex >= open_radio::generated::kStationCount) return -1;
    const auto& station = open_radio::generated::kStations[stationIndex];
    if (station.playbackCount == 0) return -1;
    const auto& first =
        open_radio::generated::kPlaybackEndpoints[station.playbackOffset];
    if (first.resolver != open_radio::generated::PlaybackResolver::RmfonPool) {
      return -1;
    }
    const String url(first.url);
    if (url.endsWith("/rmf_fm")) return 5;
    if (url.endsWith("/rmf_maxxx")) return 6;
    if (url.endsWith("/rmf_club")) return 29;
    return -1;
  }

  static bool stationUsesRmfonPools(std::uint8_t stationIndex) {
    return rmfonStationIdFor(stationIndex) > 0;
  }

 public:
  // Discovery over TLS needs ~40 KB of internal heap and is therefore only
  // reliable before the Bluetooth stack starts. Prefetching all three rmfon
  // pools right after Wi-Fi connects (heap-rich window) gives every later
  // in-session station switch a cached pool with real edge rotation and no
  // TLS at all; a stalled edge rotates to the next cached candidate instead
  // of stuttering forever (owner-reported on RMF FM 2026-07-17).
  void prefetchRmfPools() {
    static constexpr int kRmfIds[3] = {5, 6, 29};
    for (int index = 0; index < 3; ++index) {
      const String discovery = "https://api.rmfon.pl/stations/" +
                               String(kRmfIds[index]) + "/streams";
      const String body = fetchJson(discovery.c_str());
      if (body.length() > 0) rmfPoolBody_[index] = body;
    }
    Serial.printf("stream_stage stage=resolver duration_ms=0 result=%s\n",
                  rmfPoolBody_[0].length() > 0 ? "pools-cached"
                                               : "pools-missing");
  }

 private:
  // One candidate from a pool body. The wheel spans two decks: indices
  // 0..N-1 pick the 128 kb/s MP3 mounts — the DEFAULT, because the Helix
  // HE-AAC+SBR decode is heavy enough to starve the A2DP TX side on this
  // device (owner A/B 2026-07-17 evening, perfect Wi-Fi: aacp over BT cut
  // audibly with full queues and zero injected silence, MP3 played clean).
  // Indices N..2N-1 pick the 48-64 kb/s aacp mounts (~6-8 KB/s) as the
  // CONGESTION FALLBACK: sustained MP3 deaths under a starved 2.4 GHz band
  // advance the wheel into the aacp deck automatically. Lanes without the
  // AAC decoder never leave the MP3 deck. The deck is the codec authority —
  // mount NAMES are not (Club's aacp pool mounts plain "CLUB", no "48").
  String rmfCandidateFromBody(const String& body) {
    if (body.length() == 0) return {};
    resolvedAacStream_ = false;
#if defined(OPEN_RADIO_HAS_HLS)
    const std::size_t wheel = rmfCandidateIndex_ % (2U * kRmfCandidateCount);
    if (wheel < kRmfCandidateCount) {
      const String mp3Candidate = audioHttpUrl(
          extractArrayString(body, "\"item_mp3\":[\"", wheel));
      if (mp3Candidate.length() > 0) return mp3Candidate;
    }
    const String aacCandidate = audioHttpUrl(extractArrayString(
        body, "\"item\":[\"", wheel % kRmfCandidateCount));
    if (aacCandidate.length() > 0) {
      resolvedAacStream_ = true;
      return aacCandidate;
    }
    return {};
#else
    return audioHttpUrl(extractArrayString(
        body, "\"item_mp3\":[\"", rmfCandidateIndex_ % kRmfCandidateCount));
#endif
  }

  String resolveRmf(int rmfonStationId) {
    const int slot = rmfPoolSlot(rmfonStationId);
    if (slot >= 0 && rmfPoolBody_[slot].length() > 0) {
      const String cached = rmfCandidateFromBody(rmfPoolBody_[slot]);
      if (cached.length() > 0) return cached;
    }
    const String discovery = "https://api.rmfon.pl/stations/" +
                             String(rmfonStationId) + "/streams";
    const String body = fetchJson(discovery.c_str());
    if (slot >= 0 && body.length() > 0) rmfPoolBody_[slot] = body;
    // The operator returns a pool of transient edges. Rotate through the live
    // pool after failed opens/disconnects instead of pinning its first result.
    // An empty result is fine: resolveEndpoint() then falls back to the pinned
    // mount recorded in the catalog row, which is where that URL now lives.
    return rmfCandidateFromBody(body);
  }

  // Stored/session endpoints carry their codec explicitly: "aac|<url>" for
  // aacp streams, bare URL for MP3. Prefix-less values written before this
  // scheme fall back to the RMFFM48/RMFMAXXX48 suffix (the only aacp entries
  // that can exist from that era); a later healthy stream rewrites them with
  // the prefix.
  static bool parseStoredEndpoint(String& value) {
    if (value.startsWith("aac|")) {
      value = value.substring(4);
      return true;
    }
    return value.endsWith("48");
  }

  // Endpoints are catalog data, not code. The wheel walks this station's own
  // playback rows, so every station self-heals across its alternates. Before
  // 0.2 only the rmfon stations (through their pools) and ESKA (through a
  // hand-written ic1/ic2 flip) could do that, and the other six replayed one
  // dead URL forever no matter how often the rotation counter advanced.
  String resolveEndpoint() {
    resolvedAacStream_ = false;
    if (stationIndex_ >= open_radio::generated::kStationCount) return {};
    // A reassigned slot rotates through its own verified edges on the same
    // wheel the curated stations use, so a dead edge recovers identically.
    if (const char* chosen = slots_.url(stationIndex_, rmfCandidateIndex_);
        chosen != nullptr) {
      return String(chosen);
    }
    const auto& station = open_radio::generated::kStations[stationIndex_];
    if (station.playbackCount == 0) return {};
    const std::size_t slot = rmfCandidateIndex_ % station.playbackCount;
    const auto& endpoint =
        open_radio::generated::kPlaybackEndpoints[station.playbackOffset + slot];
    if (endpoint.resolver ==
        open_radio::generated::PlaybackResolver::RmfonPool) {
      const int rmfonStationId = rmfonStationIdFor(stationIndex_);
      if (rmfonStationId > 0) {
        const String resolved = resolveRmf(rmfonStationId);
        if (resolved.length() > 0) return resolved;
      }
    }
    return String(endpoint.url);
  }

  // lkg3: bumped with the 2026-07-21 owner nine. Keys are per-index, and index
  // 2 previously stored Jedynka's 192 kb/s endpoint — without the bump TOK FM
  // would resurrect it on first boot. One-time cost: fresh resolution each.
  String lastKnownGoodKey() const { return "lkg3_" + String(stationIndex_); }

  void start(std::uint32_t nowMs) {
    const std::uint32_t startedAtMs = millis();
    ++startAttempts_;
    String endpoint = activeEndpoint_;
    bool aacEndpoint = activeEndpointAac_;
    ResolverSelection selection = ResolverSelection::LastKnownGood;
    if (endpoint.length() == 0) {
      const std::uint32_t resolverStartedAtMs = millis();
      endpoint = resolveEndpoint();
      aacEndpoint = resolvedAacStream_;
      Serial.printf("stream_stage stage=resolver duration_ms=%lu result=%s\n",
                    static_cast<unsigned long>(millis() - resolverStartedAtMs),
                    endpoint.length() > 0 ? "ok" : "fail");
      selection = ResolverSelection::Primary;
    }
    if (endpoint.length() == 0 || endpoint.length() >= 128) {
      endpoint = preferences_.getString(lastKnownGoodKey().c_str());
      aacEndpoint = parseStoredEndpoint(endpoint);
      selection = ResolverSelection::LastKnownGood;
    }
    hlsActive_ = endpoint.endsWith(".m3u8");
    const bool aacActive = !hlsActive_ && aacEndpoint;
    bool started = false;
#if defined(OPEN_RADIO_HAS_HLS)
    if (hlsActive_) started = pipeline_.startHls(endpoint.c_str());
#endif
    if (!hlsActive_) started = pipeline_.start(endpoint.c_str(), aacActive);
    lastStartDurationMs_ = millis() - startedAtMs;
    if (endpoint.length() == 0 || endpoint.length() >= 128 || !started) {
      ++startFailures_;
      ++rmfCandidateIndex_;
      // A full lap through this station's alternates without a single healthy
      // stream is the difference between "the edge blinked" and "this station
      // is not broadcasting". Nothing acts on it yet; 0.2's failure screen
      // reads this counter, and the serial line makes it measurable now.
      if (candidatesAtSelect_ > 0 &&
          rmfCandidateIndex_ % candidatesAtSelect_ == 0) {
        ++exhaustedCycles_;
        Serial.printf(
            "station_health station=%u exhausted_cycles=%u candidates=%u\n",
            static_cast<unsigned>(stationIndex_),
            static_cast<unsigned>(exhaustedCycles_),
            static_cast<unsigned>(candidatesAtSelect_));
      }
      activeEndpoint_ = "";
      ResolverResultDto failed;
      failed.status = ResolverStatus::RetryScheduled;
      failed.retryAtMs = nowMs + kRetryDelaysMs[std::min<std::size_t>(
                                      retryIndex_, std::size(kRetryDelaysMs) - 1)];
      services_.resolver(failed, 1, nextSequence(), nowMs);
      scheduleRetry(nowMs);
      return;
    }
    running_ = true;
    healthy_ = false;
    lastProgressMs_ = nowMs;
    sourceDeadSinceMs_ = 0;
    lastSourceEventCount_ = pipeline_.sourceStatusEvents();
    activeEndpoint_ = endpoint;
    activeEndpointAac_ = aacActive;
    ResolverResultDto ready;
    ready.status = ResolverStatus::Playing;
    ready.selected = selection;
    services_.resolver(ready, 1, nextSequence(), nowMs);
  }

  void scheduleRetry(std::uint32_t nowMs) {
    retryAtMs_ = nowMs + kRetryDelaysMs[std::min<std::size_t>(
                                  retryIndex_, std::size(kRetryDelaysMs) - 1)];
    if (retryIndex_ + 1 < std::size(kRetryDelaysMs)) ++retryIndex_;
  }

  Preferences& preferences_;
  RuntimeServiceBridge& services_;
  Mp3StreamPipeline& pipeline_;
  const StationSlots& slots_;
  String activeEndpoint_;
  std::uint32_t sequence_ = 100;
  std::uint32_t retryAtMs_ = 0;
  std::uint32_t startAttempts_ = 0;
  std::uint32_t startFailures_ = 0;
  std::uint32_t unexpectedStops_ = 0;
  std::uint32_t lastStartDurationMs_ = 0;
  std::uint32_t lastProgressMs_ = 0;
  std::uint32_t sourceDeadSinceMs_ = 0;
  std::uint32_t lastSourceEventCount_ = 0;
  bool activeEndpointAac_ = false;
  bool resolvedAacStream_ = false;
  std::size_t retryIndex_ = 0;
  std::size_t rmfCandidateIndex_ = 0;
  std::size_t exhaustedCycles_ = 0;
  std::size_t candidatesAtSelect_ = 0;
  String rmfPoolBody_[3];
  std::uint8_t stationIndex_ = 0;
  bool networkAvailable_ = false;
  bool hlsActive_ = false;
  bool running_ = false;
  bool healthy_ = false;
};

}  // namespace open_radio::public_candidate
