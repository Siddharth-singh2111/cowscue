import { route } from "@/server/http/route";
import { ngoStats } from "@/server/services/stats";

export const GET = route({ access: "ngo" }, async ({ identity }) => ({ stats: await ngoStats(identity.userId) }));
