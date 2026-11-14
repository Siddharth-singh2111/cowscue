import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { ngoProfileSchema } from "@/lib/validations";
import { getMyNgo, updateMyNgo } from "@/server/services/ngos";

export const GET = route({ access: "ngo" }, async ({ identity }) => ({ ngo: await getMyNgo(identity) }));

export const PATCH = route({ access: "ngo", rateLimit: RateLimits.mutation }, async (ctx) => ({
  ngo: await updateMyNgo(ctx.identity, await ctx.body(ngoProfileSchema)),
}));
