import {ingressLimits} from "../runtime/generated/ingress-limits.mjs";
import {runIngressTrace} from "../runtime/ingress-replay.mjs";
import {runtimeLimits} from "../runtime/generated/runtime-limits.mjs";
import {CommunityReportTypes, CommunityValidationCodes, validateCommunityEvidence} from "./evidence.mjs";

export function replayCommunityPacket(packet, {expectedFirmwareSha256} = {}) {
  const validation = validateCommunityEvidence(packet, {expectedFirmwareSha256});
  if (!validation.ok) return validation;
  if (packet.reportType !== CommunityReportTypes.REPLAY) {
    return Object.freeze({ok: false, code: CommunityValidationCodes.UNSUPPORTED_REPORT, errors: Object.freeze(["$: callback replay report required"])});
  }
  const summary = runIngressTrace({
    trace: {id: packet.traceId, facts: packet.facts},
    ingressLimits,
    runtimeLimits
  });
  return Object.freeze({
    ok: true,
    code: CommunityValidationCodes.PASS,
    traceId: packet.traceId,
    firmwareSha256: packet.firmwareSha256,
    summary
  });
}
