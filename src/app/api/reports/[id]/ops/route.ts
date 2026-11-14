import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { getOpsReport } from "@/server/services/reports";

export const GET = route<{ id: string }>({ access: "ngo", rateLimit: RateLimits.authedRead }, async ({ params, identity }) => ({
  report: await getOpsReport(params.id, { userId: identity.userId }),
}));
