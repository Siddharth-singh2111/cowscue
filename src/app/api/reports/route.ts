import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { createReportSchema, feedQuerySchema } from "@/lib/validations";
import { createReport, listNgoFeed } from "@/server/services/reports";

/** Citizen submits an emergency. AI triage + duplicate detection run here; dispatch is queued. */
export const POST = route({ access: "user", rateLimit: RateLimits.createReport }, async (ctx) => {
  const input = await ctx.body(createReportSchema);
  const result = await createReport({
    reporterId: ctx.identity.userId,
    reporterName: ctx.identity.name,
    reporterPhone: input.reporterPhone,
    channel: "web",
    imageUrl: input.imageUrl,
    description: input.description,
    latitude: input.latitude,
    longitude: input.longitude,
  });
  return Response.json(result, { status: 201 });
});

/** NGO command-center feed for an area (defaults to the NGO's own geofence when lat/lng omitted). */
export const GET = route({ access: "ngo", rateLimit: RateLimits.authedRead }, async (ctx) => {
  const q = ctx.query(feedQuerySchema);
  const reports = await listNgoFeed(ctx.identity, { lat: q.lat, lng: q.lng, radiusKm: q.radius });
  return { reports };
});
