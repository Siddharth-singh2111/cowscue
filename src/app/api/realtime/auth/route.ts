import { Channels } from "@/types";
import { route } from "@/server/http/route";
import { Errors } from "@/server/lib/errors";
import { authorizeChannel } from "@/server/services/realtime";

/**
 * Pusher private-channel authorisation. Only NGO responders (and admins) may join the ops feed,
 * because it carries reporter contact details.
 */
export const POST = route({ access: "ngo" }, async ({ req }) => {
  const form = await req.formData();
  const socketId = String(form.get("socket_id") || "");
  const channel = String(form.get("channel_name") || "");
  if (channel !== Channels.ngoFeed) throw Errors.forbidden("Unknown channel.");
  const auth = authorizeChannel(socketId, channel);
  if (!auth) throw Errors.unavailable("Realtime is not configured.");
  return auth;
});
