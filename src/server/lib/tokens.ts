import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless signed capability tokens for the driver portal.
 *
 * Drivers are not platform users — they receive a link over WhatsApp. The link carries an HMAC
 * that binds it to a single report and an expiry, so it can't be reused for another rescue,
 * forged, or used after the mission window closes. No database lookup is required to verify it.
 *
 * Format: `<expiryEpochSec>.<base64url(hmac_sha256(secret, "driver:<reportId>:<expiry>"))>`
 */
const DEFAULT_TTL_SEC = 48 * 60 * 60;

export function signDriverToken(reportId: string, secret: string, ttlSec = DEFAULT_TTL_SEC, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + ttlSec;
  return `${exp}.${sign(reportId, exp, secret)}`;
}

export function verifyDriverToken(
  reportId: string,
  token: string | null | undefined,
  secret: string,
  now = Date.now()
): boolean {
  if (!token) return false;
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || !sig) return false;
  if (exp * 1000 < now) return false;
  const expected = Buffer.from(sign(reportId, exp, secret));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function sign(reportId: string, exp: number, secret: string) {
  return createHmac("sha256", secret).update(`driver:${reportId}:${exp}`).digest("base64url");
}
