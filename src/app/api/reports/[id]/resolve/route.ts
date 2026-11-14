import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { resolveSchema } from "@/lib/validations";
import { resolveReport } from "@/server/services/reports";

export const POST = route<{ id: string }>({ access: "ngo", rateLimit: RateLimits.mutation }, async (ctx) => ({
  report: await resolveReport(ctx.params.id, { kind: "ngo", identity: ctx.identity }, await ctx.body(resolveSchema)),
}));
