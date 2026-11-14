import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { closeSchema } from "@/lib/validations";
import { closeReport } from "@/server/services/reports";

export const POST = route<{ id: string }>({ access: "ngo", rateLimit: RateLimits.mutation }, async (ctx) => ({
  report: await closeReport(ctx.params.id, ctx.identity, await ctx.body(closeSchema)),
}));
