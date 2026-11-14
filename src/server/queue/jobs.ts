/** Job contracts shared by producers (web tier) and consumers (worker tier). */

export interface JobPayloads {
  /** Find NGOs whose geofence covers the report (radius scaled by escalation level) and alert them. */
  "dispatch.notify": { reportId: string; level: number };
  /** SLA timer: if the case is still unaccepted when it fires, escalate and re-dispatch. */
  "sla.check": { reportId: string; level: number };
  /** Status notifications to citizens who reported over WhatsApp. */
  "citizen.notify": { reportId: string; kind: "assigned" | "resolved" | "closed" };
  /** Process an inbound Twilio WhatsApp message asynchronously (download → upload → AI → reply). */
  "whatsapp.inbound": { params: Record<string, string> };
}

export type JobName = keyof JobPayloads;

export const QUEUE_NAME = "cowscue-jobs";

export const JOB_DEFAULTS = {
  attempts: 4,
  backoff: { type: "exponential" as const, delay: 2_000 },
  removeOnComplete: { age: 24 * 3600, count: 5_000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};
