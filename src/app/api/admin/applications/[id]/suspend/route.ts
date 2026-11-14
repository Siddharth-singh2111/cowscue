import { route } from "@/server/http/route";
import { adminDecisionSchema } from "@/lib/validations";
import { decideApplication } from "@/server/services/ngos";

export const POST = route<{ id: string }>({ access: "superadmin" }, async (ctx) => {
  const { reason } = await ctx.body(adminDecisionSchema.optional().default({}));
  return { application: await decideApplication(ctx.params.id, ctx.identity, "suspended", reason) };
});
