import { randomUUID } from "crypto";

type EnvelopeType = "command" | "detection" | "status" | "telemetry" | "alert" | "mobile_message";

type BuildEnvelopeArgs = {
  type: EnvelopeType;
  payload: Record<string, unknown>;
  deviceId?: string;
  opId?: string;
  action?: string;
  step?: string;
  source?: string;
};

export function buildV2Envelope(args: BuildEnvelopeArgs): Record<string, unknown> {
  const now = new Date().toISOString();
  const deviceId = args.deviceId ?? String(args.payload.device_id ?? "");
  const opId = args.opId ?? String(args.payload.op_id ?? "");
  const action = args.action ?? String(args.payload.action ?? "");
  const step = args.step ?? String(args.payload.step ?? "");

  // Transitional format: keep payload nested for v2 and mirrored root keys for legacy consumers.
  return {
    schema_version: 2,
    message_id: randomUUID(),
    event_type: args.type,
    source: args.source ?? "next_api",
    timestamp: now,
    device_id: deviceId,
    op_id: opId,
    action,
    step,
    payload: args.payload,
    ...args.payload,
  };
}
