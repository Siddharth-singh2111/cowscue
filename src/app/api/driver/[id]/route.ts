import { route } from "@/server/http/route";
import { requireDriverToken } from "@/server/http/driverAuth";
import { RateLimits } from "@/server/lib/rateLimit";
import { getOpsReport } from "@/server/services/reports";

/** Driver portal data. Authorised by the signed link, not a user session. */
export const GET = route<{ id: string }>({ rateLimit: RateLimits.publicRead, rateLimitBy: "ip" }, async ({ req, params }) => {
  requireDriverToken(req, params.id);
  return { report: await getOpsReport(params.id) };
});
