import { driverLinkSecret } from "../config/env";
import { Errors } from "../lib/errors";
import { verifyDriverToken } from "../lib/tokens";

/** Verifies the signed capability token from a driver portal link (`?t=` or `x-driver-token`). */
export function requireDriverToken(req: Request, reportId: string) {
  const token = req.headers.get("x-driver-token") || new URL(req.url).searchParams.get("t");
  if (!verifyDriverToken(reportId, token, driverLinkSecret())) {
    throw Errors.unauthorized("This driver link is invalid or has expired. Ask the NGO coordinator for a new one.");
  }
}
