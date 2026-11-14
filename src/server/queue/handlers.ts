import { Channels, Events, MAX_ESCALATION_LEVEL } from "@/types";
import { connectDB } from "../db/connect";
import { Report } from "../models/Report";
import { logger } from "../lib/logger";
import { env } from "../config/env";
import { enqueue } from "./index";
import { findDispatchTargets, formatDispatchAlert, slaDelayMs } from "../services/dispatch";
import { sendWhatsApp } from "../services/whatsappClient";
import { publish } from "../services/realtime";
import { toOpsReport, toPublicReport } from "../services/serializers";
import { processInboundWhatsApp } from "../services/whatsappBot";
import type { JobName, JobPayloads } from "./jobs";

type Handlers = { [N in JobName]: (data: JobPayloads[N]) => Promise<void> };

/**
 * Job handlers. Every handler is idempotent (re-reads state and checks preconditions) because
 * BullMQ guarantees at-least-once delivery — a retried job must never double-notify or
 * double-escalate.
 */
export const handlers: Handlers = {
  async "dispatch.notify"({ reportId, level }) {
    await connectDB();
    const report = await Report.findById(reportId).lean();
    if (!report || report.status !== "pending") return;

    const [lng, lat] = report.location.coordinates as [number, number];
    const targets = await findDispatchTargets(lat, lng, level);
    const alreadyNotified = new Set(report.notifiedNgoIds.map(String));
    const fresh = targets.filter((t) => !alreadyNotified.has(String(t.id)));

    const recipients: { id?: (typeof targets)[number]["id"]; phone: string; distanceKm?: number }[] = fresh.map((t) => ({
      id: t.id,
      phone: t.phone,
      distanceKm: t.distanceKm,
    }));
    // No NGO covers this spot: fall back to the platform's on-call number (first dispatch only).
    const fallback = env().NGO_WHATSAPP_NUMBER;
    if (targets.length === 0 && fallback && level === 0) recipients.push({ phone: fallback });

    const appUrl = env().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    const results = await Promise.allSettled(
      recipients.map((r) =>
        sendWhatsApp(
          r.phone,
          formatDispatchAlert({
            severity: report.severity,
            injuryType: report.injuryType,
            description: report.description,
            lat,
            lng,
            distanceKm: r.distanceKm,
            level,
            appUrl,
          })
        )
      )
    );
    const failed = results.filter((r) => r.status === "rejected").length;

    const notifiedIds = recipients.map((r) => r.id).filter(Boolean);
    const message =
      targets.length === 0
        ? level === 0
          ? "No partner NGO covers this exact spot yet — the case is visible to every responder in the command center."
          : `Escalation level ${level}: still searching for a team in range.`
        : `Alerted ${fresh.length} partner NGO${fresh.length === 1 ? "" : "s"} nearby on WhatsApp.`;

    await Report.updateOne(
      { _id: reportId },
      {
        $addToSet: { notifiedNgoIds: { $each: notifiedIds } },
        $push: { timeline: { type: "ngos_notified", at: new Date(), message } },
      }
    );
    logger.info({ reportId, level, targets: targets.length, notified: fresh.length, failed }, "dispatch complete");

    // Surface partial provider failures to BullMQ so the job retries (already-notified NGOs are skipped).
    if (failed > 0 && failed === recipients.length) throw new Error(`all ${failed} WhatsApp alerts failed`);
  },

  async "sla.check"({ reportId, level }) {
    await connectDB();
    const nextLevel = level + 1;
    const updated = await Report.findOneAndUpdate(
      { _id: reportId, status: "pending", escalationLevel: level },
      {
        $set: { escalationLevel: nextLevel, lastEscalatedAt: new Date() },
        $push: {
          timeline: {
            type: "escalated",
            at: new Date(),
            message:
              nextLevel >= MAX_ESCALATION_LEVEL
                ? "No team accepted in time — broadcasting to every partner within 100 km."
                : `No team accepted within the SLA — widening the search radius (level ${nextLevel}).`,
          },
        },
      },
      { returnDocument: "after", lean: true }
    );
    if (!updated) return; // accepted, closed, or already escalated by another worker

    logger.warn({ reportId, level: nextLevel, severity: updated.severity }, "report escalated");
    await Promise.all([
      publish(Channels.ngoFeed, Events.reportUpdated, toOpsReport(updated)),
      publish(Channels.report(reportId), Events.reportUpdated, toPublicReport(updated)),
    ]);
    await enqueue("dispatch.notify", { reportId, level: nextLevel }, { jobId: `dispatch:${reportId}:${nextLevel}` });
    if (nextLevel < MAX_ESCALATION_LEVEL) {
      await enqueue(
        "sla.check",
        { reportId, level: nextLevel },
        { delayMs: slaDelayMs(updated.severity, nextLevel), jobId: `sla:${reportId}:${nextLevel}` }
      );
    }
  },

  async "citizen.notify"({ reportId, kind }) {
    await connectDB();
    const report = await Report.findById(reportId).lean();
    if (!report || report.channel !== "whatsapp" || !report.reporterPhone) return;
    const trackUrl = `${env().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/track/${reportId}`;

    const body =
      kind === "assigned"
        ? `🚑 *Rescue update*\n\n${report.ngoName ?? "A partner NGO"} accepted your report. ${report.driverName ?? "Their team"} is on the way.\n\n📍 Track live: ${trackUrl}`
        : kind === "resolved"
          ? `✅ *Rescued!*\n\nThe animal you reported is safe and in care. You've now helped with ${(report.reporterHistory ?? 0) + 1} rescue(s) — thank you. 🐄\n\n${trackUrl}`
          : `ℹ️ *Case update*\n\nYour report was closed by the responding team (${report.closeReason?.replace("_", " ") ?? "see details"}).\n\n${trackUrl}`;
    await sendWhatsApp(report.reporterPhone, body);
  },

  async "whatsapp.inbound"({ params }) {
    await processInboundWhatsApp(params);
  },
};
