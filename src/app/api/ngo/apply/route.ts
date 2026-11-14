import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { ngoApplicationSchema } from "@/lib/validations";
import { applyAsNgo, getApplicationStatus } from "@/server/services/ngos";

export const GET = route({ access: "user" }, async ({ identity }) => ({
  application: await getApplicationStatus(identity.userId),
}));

export const POST = route({ access: "user", rateLimit: RateLimits.mutation }, async (ctx) => {
  const application = await applyAsNgo(ctx.identity, await ctx.body(ngoApplicationSchema));
  return Response.json({ application }, { status: 201 });
});
