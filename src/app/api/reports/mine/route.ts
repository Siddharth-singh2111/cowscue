import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { listCitizenReports } from "@/server/services/reports";

export const GET = route({ access: "user", rateLimit: RateLimits.authedRead }, async ({ identity }) =>
  listCitizenReports(identity.userId)
);
