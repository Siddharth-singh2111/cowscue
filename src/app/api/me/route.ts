import { route } from "@/server/http/route";

/** Current user's server-authoritative role, used by the UI for navigation and gating. */
export const GET = route({ access: "public" }, async ({ identity }) => {
  if (!identity) return { signedIn: false, role: null };
  return { signedIn: true, role: identity.role, name: identity.name, ngo: identity.ngo ?? null };
});
