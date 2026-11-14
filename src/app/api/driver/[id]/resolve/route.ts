import { route } from "@/server/http/route";
import { requireDriverToken } from "@/server/http/driverAuth";
import { RateLimits } from "@/server/lib/rateLimit";
import { resolveSchema } from "@/lib/validations";
import { resolveReport } from "@/server/services/reports";

export const POST = route<{ id: string }>({ rateLimit: RateLimits.mutation, rateLimitBy: "ip" }, async (ctx) => {
  requireDriverToken(ctx.req, ctx.params.id);
  return { report: await resolveReport(ctx.params.id, { kind: "driver" }, await ctx.body(resolveSchema)) };
});
