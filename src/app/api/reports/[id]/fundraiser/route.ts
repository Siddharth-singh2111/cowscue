import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { fundraiserSchema } from "@/lib/validations";
import { updateFundraiser } from "@/server/services/reports";

export const PUT = route<{ id: string }>({ access: "ngo", rateLimit: RateLimits.mutation }, async (ctx) => ({
  report: await updateFundraiser(ctx.params.id, ctx.identity, await ctx.body(fundraiserSchema)),
}));
