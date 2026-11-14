import { z } from "zod";
import { route } from "@/server/http/route";
import { listApplications } from "@/server/services/ngos";

const query = z.object({ status: z.enum(["pending", "approved", "rejected", "suspended"]).optional() });

export const GET = route({ access: "superadmin" }, async (ctx) => ({
  applications: await listApplications(ctx.query(query).status),
}));
