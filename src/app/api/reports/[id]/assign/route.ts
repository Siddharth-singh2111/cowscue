import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { assignSchema } from "@/lib/validations";
import { assignReport } from "@/server/services/reports";

/** Accept a rescue (atomic compare-and-set; concurrent accepts get 409). Returns a signed driver link. */
export const POST = route<{ id: string }>({ access: "ngo", rateLimit: RateLimits.mutation }, async (ctx) =>
  assignReport(ctx.params.id, ctx.identity, await ctx.body(assignSchema))
);
