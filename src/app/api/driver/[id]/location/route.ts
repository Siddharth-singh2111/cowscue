import { route } from "@/server/http/route";
import { requireDriverToken } from "@/server/http/driverAuth";
import { RateLimits } from "@/server/lib/rateLimit";
import { driverLocationSchema } from "@/lib/validations";
import { updateDriverLocation } from "@/server/services/reports";

/** GPS heartbeat from the driver's phone; fans out to the citizen tracker and NGO map in realtime. */
export const POST = route<{ id: string }>({ rateLimit: RateLimits.driverLocation, rateLimitBy: "ip" }, async (ctx) => {
  requireDriverToken(ctx.req, ctx.params.id);
  return updateDriverLocation(ctx.params.id, await ctx.body(driverLocationSchema));
});
