import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { leaderboard } from "@/server/services/stats";

export const GET = route({ rateLimit: RateLimits.publicRead, rateLimitBy: "ip" }, async () => {
  const leaders = await leaderboard();
  return Response.json({ leaders }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
});
