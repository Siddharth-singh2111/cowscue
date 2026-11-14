import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { ngoDirectory } from "@/server/services/ngos";

export const GET = route({ rateLimit: RateLimits.publicRead, rateLimitBy: "ip" }, async () => ({ ngos: await ngoDirectory() }));
