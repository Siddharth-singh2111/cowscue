import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { publicStats } from "@/server/services/stats";

export const GET = route({ rateLimit: RateLimits.publicRead, rateLimitBy: "ip" }, async () => {
  const stats = await publicStats();
  return Response.json({ stats }, { headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=60" } });
});
