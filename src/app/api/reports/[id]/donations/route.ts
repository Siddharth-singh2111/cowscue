import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { donationSchema } from "@/lib/validations";
import { listDonations, recordDonation } from "@/server/services/donations";

export const GET = route<{ id: string }>({ rateLimit: RateLimits.publicRead, rateLimitBy: "ip" }, async ({ params }) => ({
  donations: await listDonations(params.id),
}));

/** Demo-mode pledge (no money moves). Idempotent via the Idempotency-Key header. */
export const POST = route<{ id: string }>({ rateLimit: RateLimits.donate, rateLimitBy: "ip" }, async (ctx) => {
  const input = await ctx.body(donationSchema);
  const result = await recordDonation(ctx.params.id, {
    ...input,
    donorUserId: ctx.identity?.userId,
    idempotencyKey: ctx.req.headers.get("idempotency-key")?.slice(0, 100) || undefined,
  });
  return Response.json(result, { status: result.replayed ? 200 : 201 });
});
