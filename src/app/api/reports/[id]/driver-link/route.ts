import { route } from "@/server/http/route";
import { Errors } from "@/server/lib/errors";
import { driverLink, getOpsReport } from "@/server/services/reports";

/** Re-issue the signed driver portal link (only for the NGO handling the case). */
export const GET = route<{ id: string }>({ access: "ngo" }, async ({ params, identity }) => {
  const report = await getOpsReport(params.id, { userId: identity.userId });
  if (!report.isMine && identity.role !== "superadmin") throw Errors.forbidden("Only the assigned team can share the driver link.");
  if (report.status !== "assigned" && report.status !== "en_route") throw Errors.conflict("This rescue is not active.");
  return { driverLink: driverLink(params.id) };
});
