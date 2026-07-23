import {RuntimeEvents} from "../runtime/orchestrator.mjs";
import {RuntimeProducers} from "../runtime/ingress.mjs";

export const CommunityReportTypes = Object.freeze({
  BLUETOOTH: "BLUETOOTH_COMPATIBILITY",
  STATION: "STATION_PLAYBACK",
  REPLAY: "CALLBACK_REPLAY"
});

export const CommunityValidationCodes = Object.freeze({
  PASS: "PASS",
  SCHEMA_REJECTED: "SCHEMA_REJECTED",
  PRIVACY_REJECTED: "PRIVACY_REJECTED",
  STALE_FIRMWARE: "STALE_FIRMWARE",
  UNSUPPORTED_REPORT: "UNSUPPORTED_REPORT"
});

const firmwareHashPattern = /^[0-9a-f]{64}$/;
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const macPattern = /(?:^|[^0-9a-f])(?:[0-9a-f]{2}:){5}[0-9a-f]{2}(?:$|[^0-9a-f])/i;
const credentialPattern = /(?:ssid|password|passphrase|credential)\s*[=:]/i;
const forbiddenKeyPattern = /(?:ssid|password|passphrase|credential|endpoint|url|mac|bssid|serial|owner|listener|location|pcm|artwork|notes|comment|description|message)/i;
const bluetoothKeys = new Set(["schemaVersion", "reportType", "firmwareSha256", "speakerClass", "profile", "a2dpSink", "sbc", "avrcpObserved", "outcome", "reconnectBucket", "localFallback"]);
const stationKeys = new Set(["schemaVersion", "reportType", "firmwareSha256", "stationId", "declaredCodec", "outcome", "durationBucket"]);
const replayKeys = new Set(["schemaVersion", "reportType", "firmwareSha256", "traceId", "facts"]);
const factKeys = new Set(["producer", "epoch", "producerSequence", "rawTick", "type"]);
const speakerClasses = new Set(["MAINS_SPEAKER", "BATTERY_SPEAKER", "HEADPHONES", "OLDER_SBC", "MODERN_MULTIPROFILE"]);
const profiles = new Set(["CLASSIC_A2DP", "LE_AUDIO_ONLY", "UNKNOWN"]);
const supportStates = new Set(["SUPPORTED", "UNSUPPORTED", "UNKNOWN"]);
const avrcpStates = new Set(["PRESENT", "ABSENT", "UNKNOWN"]);
const bluetoothOutcomes = new Set(["PASS", "FAIL", "OUT_OF_SCOPE", "NOT_MEASURED"]);
const reconnectBuckets = new Set(["LT_5S", "S5_TO_15", "S16_TO_60", "GT_60S", "NOT_MEASURED"]);
const fallbackOutcomes = new Set(["PASS", "FAIL", "NOT_MEASURED"]);
const stationOutcomes = new Set(["PLAYING", "RECOVERED", "BOUNDED_RETRY", "UNSUPPORTED", "FAILED", "NOT_MEASURED"]);
const durationBuckets = new Set(["LT_5M", "M5_TO_15", "M16_TO_60", "GT_60M", "NOT_APPLICABLE"]);
const stationCodecs = new Map([
  ["rmf-fm", "MP3_ICY"],
  ["radio-zet", "MP3_ICY"],
  ["antyradio", "MP3_ICY"],
  ["meloradio", "MP3_ICY"],
  ["zlote-przeboje", "MP3_ICY"],
  ["chillizet", "MP3_ICY"],
  ["rmf-maxx", "MP3_ICY"],
  ["radio-eska", "MP3_ICY"],
  ["radio-pogoda", "MP3_ICY"]
]);
const producerEvents = new Map([
  [RuntimeProducers.STORAGE, new Set([RuntimeEvents.CONFIG_MISSING, RuntimeEvents.CONFIG_CORRUPT, RuntimeEvents.CONFIG_READY])],
  [RuntimeProducers.WIFI, new Set([RuntimeEvents.WIFI_CONNECTED, RuntimeEvents.WIFI_LOST])],
  [RuntimeProducers.RESOLVER, new Set([RuntimeEvents.RESOLVER_READY, RuntimeEvents.RESOLVER_UNSUPPORTED, RuntimeEvents.STREAM_STALLED])],
  [RuntimeProducers.STREAM, new Set([RuntimeEvents.STREAM_HEALTHY, RuntimeEvents.STREAM_STALLED])],
  [RuntimeProducers.BLUETOOTH, new Set([RuntimeEvents.BLUETOOTH_REMEMBERED, RuntimeEvents.BLUETOOTH_CONNECTED, RuntimeEvents.BLUETOOTH_LOST])],
  [RuntimeProducers.LOCAL_OUTPUT, new Set([RuntimeEvents.LOCAL_OUTPUT_AVAILABLE, RuntimeEvents.LOCAL_OUTPUT_LOST])],
  [RuntimeProducers.POWER, new Set([RuntimeEvents.POWER_INTERRUPTED])]
]);

function result(code, errors = []) {
  return Object.freeze({ok: code === CommunityValidationCodes.PASS, code, errors: Object.freeze([...errors])});
}

function hasExactKeys(value, allowed) {
  const keys = Object.keys(value);
  return keys.length === allowed.size && keys.every(key => allowed.has(key));
}

function privacyErrors(value, path = "$") {
  const errors = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => errors.push(...privacyErrors(item, `${path}[${index}]`)));
    return errors;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (forbiddenKeyPattern.test(key)) errors.push(`${path}.${key}: forbidden privacy field`);
      errors.push(...privacyErrors(item, `${path}.${key}`));
    }
    return errors;
  }
  if (typeof value === "string" && (/https?:\/\//i.test(value) || macPattern.test(value) || credentialPattern.test(value))) {
    errors.push(`${path}: forbidden identity or endpoint value`);
  }
  return errors;
}

function validUint32(value, minimum = 0) {
  return Number.isInteger(value) && value >= minimum && value <= 0xffffffff;
}

function validateBase(report, expectedFirmwareSha256) {
  if (!report || typeof report !== "object" || Array.isArray(report)) return result(CommunityValidationCodes.SCHEMA_REJECTED, ["$: object required"]);
  const privacy = privacyErrors(report);
  if (privacy.length) return result(CommunityValidationCodes.PRIVACY_REJECTED, privacy);
  if (report.schemaVersion !== 1 || !firmwareHashPattern.test(report.firmwareSha256 ?? "")) {
    return result(CommunityValidationCodes.SCHEMA_REJECTED, ["$: invalid schema version or firmware hash"]);
  }
  if (expectedFirmwareSha256 && report.firmwareSha256 !== expectedFirmwareSha256) {
    return result(CommunityValidationCodes.STALE_FIRMWARE, ["$.firmwareSha256: candidate mismatch"]);
  }
  return null;
}

function validateBluetooth(report) {
  if (!hasExactKeys(report, bluetoothKeys) || !speakerClasses.has(report.speakerClass) || !profiles.has(report.profile) ||
      !supportStates.has(report.a2dpSink) || !supportStates.has(report.sbc) || !avrcpStates.has(report.avrcpObserved) ||
      !bluetoothOutcomes.has(report.outcome) || !reconnectBuckets.has(report.reconnectBucket) || !fallbackOutcomes.has(report.localFallback)) {
    return result(CommunityValidationCodes.SCHEMA_REJECTED, ["$: invalid Bluetooth compatibility fields"]);
  }
  if (report.profile === "LE_AUDIO_ONLY" && (report.outcome !== "OUT_OF_SCOPE" || report.a2dpSink !== "UNSUPPORTED" || report.sbc !== "UNSUPPORTED")) {
    return result(CommunityValidationCodes.SCHEMA_REJECTED, ["$: LE Audio-only result must be out of scope"]);
  }
  if (report.outcome === "PASS" && (report.profile !== "CLASSIC_A2DP" || report.a2dpSink !== "SUPPORTED" || report.sbc !== "SUPPORTED")) {
    return result(CommunityValidationCodes.SCHEMA_REJECTED, ["$: passing result requires Classic A2DP Sink with SBC"]);
  }
  return result(CommunityValidationCodes.PASS);
}

function validateStation(report) {
  if (!hasExactKeys(report, stationKeys) || stationCodecs.get(report.stationId) !== report.declaredCodec ||
      !stationOutcomes.has(report.outcome) || !durationBuckets.has(report.durationBucket)) {
    return result(CommunityValidationCodes.SCHEMA_REJECTED, ["$: invalid station playback fields"]);
  }
  if (report.outcome === "UNSUPPORTED" && report.durationBucket !== "NOT_APPLICABLE") {
    return result(CommunityValidationCodes.SCHEMA_REJECTED, ["$: unsupported result cannot claim playback duration"]);
  }
  if (report.declaredCodec === "HLS_HE_AAC" && !["UNSUPPORTED", "NOT_MEASURED"].includes(report.outcome)) {
    return result(CommunityValidationCodes.SCHEMA_REJECTED, ["$: current candidate cannot claim HLS/HE-AAC playback"]);
  }
  if (["PLAYING", "RECOVERED"].includes(report.outcome) && report.durationBucket === "NOT_APPLICABLE") {
    return result(CommunityValidationCodes.SCHEMA_REJECTED, ["$: playback result requires a duration bucket"]);
  }
  return result(CommunityValidationCodes.PASS);
}

function validateReplay(report) {
  if (!hasExactKeys(report, replayKeys) || !slugPattern.test(report.traceId ?? "") ||
      !Array.isArray(report.facts) || report.facts.length < 1 || report.facts.length > 64) {
    return result(CommunityValidationCodes.SCHEMA_REJECTED, ["$: invalid callback replay envelope"]);
  }
  for (const [index, fact] of report.facts.entries()) {
    if (!fact || typeof fact !== "object" || Array.isArray(fact) || !hasExactKeys(fact, factKeys) ||
        !producerEvents.get(fact.producer)?.has(fact.type) || !validUint32(fact.epoch, 1) ||
        !validUint32(fact.producerSequence, 1) || !validUint32(fact.rawTick)) {
      return result(CommunityValidationCodes.SCHEMA_REJECTED, [`$.facts[${index}]: invalid callback fact`]);
    }
  }
  return result(CommunityValidationCodes.PASS);
}

export function validateCommunityEvidence(report, {expectedFirmwareSha256} = {}) {
  const base = validateBase(report, expectedFirmwareSha256);
  if (base) return base;
  if (report.reportType === CommunityReportTypes.BLUETOOTH) return validateBluetooth(report);
  if (report.reportType === CommunityReportTypes.STATION) return validateStation(report);
  if (report.reportType === CommunityReportTypes.REPLAY) return validateReplay(report);
  return result(CommunityValidationCodes.UNSUPPORTED_REPORT, ["$.reportType: unsupported report"]);
}
