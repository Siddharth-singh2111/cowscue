import { describe, expect, it } from "vitest";
import { signDriverToken, verifyDriverToken } from "@/server/lib/tokens";

const SECRET = "test-secret";
const REPORT = "65f0c0ffee0000000000abcd";

describe("driver capability tokens", () => {
  it("verifies a freshly signed token for the same report", () => {
    expect(verifyDriverToken(REPORT, signDriverToken(REPORT, SECRET), SECRET)).toBe(true);
  });

  it("rejects a token issued for a different report", () => {
    const token = signDriverToken("65f0c0ffee0000000000ffff", SECRET);
    expect(verifyDriverToken(REPORT, token, SECRET)).toBe(false);
  });

  it("rejects a token signed with another secret", () => {
    expect(verifyDriverToken(REPORT, signDriverToken(REPORT, "other"), SECRET)).toBe(false);
  });

  it("rejects expired tokens", () => {
    const issued = Date.now() - 10_000;
    const token = signDriverToken(REPORT, SECRET, 5, issued);
    expect(verifyDriverToken(REPORT, token, SECRET)).toBe(false);
  });

  it("rejects tampered expiry (cannot extend a link)", () => {
    const [, sig] = signDriverToken(REPORT, SECRET, 60).split(".");
    const forged = `${Math.floor(Date.now() / 1000) + 999_999}.${sig}`;
    expect(verifyDriverToken(REPORT, forged, SECRET)).toBe(false);
  });

  it.each([null, undefined, "", "garbage", "123", "abc.def"])("rejects malformed token %s", (t) => {
    expect(verifyDriverToken(REPORT, t as string, SECRET)).toBe(false);
  });
});
