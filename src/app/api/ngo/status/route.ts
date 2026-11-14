import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { ngoStatusSchema } from "@/lib/validations";
import { setAccepting } from "@/server/services/ngos";

/** Toggle "accepting rescues". Dispatch skips NGOs that are on break. */
export const PATCH = route({ access: "ngo", rateLimit: RateLimits.mutation }, async (ctx) => {
  const { isAccepting } = await ctx.body(ngoStatusSchema);
  return setAccepting(ctx.identity, isAccepting);
});
