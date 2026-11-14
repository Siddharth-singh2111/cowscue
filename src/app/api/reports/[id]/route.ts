import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { getPublicReport } from "@/server/services/reports";

/** Public tracking view — PII-free by construction (see serializers.toPublicReport). */
export const GET = route<{ id: string }>({ rateLimit: RateLimits.publicRead, rateLimitBy: "ip" }, async ({ params }) => ({
  report: await getPublicReport(params.id),
}));
