import { route } from "@/server/http/route";
import { adminOverview } from "@/server/services/stats";

export const GET = route({ access: "superadmin" }, async () => ({ overview: await adminOverview() }));
