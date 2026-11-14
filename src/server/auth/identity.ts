import { auth, clerkClient } from "@clerk/nextjs/server";
import { connectDB } from "../db/connect";
import { Ngo } from "../models/Ngo";
import { cached, invalidate } from "../lib/cache";
import { superadminEmails } from "../config/env";

export type Role = "citizen" | "ngo" | "superadmin";

export interface Identity {
  userId: string;
  name: string;
  email: string;
  role: Role;
  ngo?: { id: string; ngoName: string; isAccepting: boolean };
}

/**
 * Resolves the caller's identity.
 *
 * The session (userId) is verified locally from the Clerk JWT — no network call. Profile and role
 * resolution need Clerk's Backend API + Mongo, so that part is cached for 60s per user to stay
 * well inside Clerk's rate limits when many replicas serve dashboard polling traffic.
 *
 * Roles are authoritative on the server: superadmin comes from SUPERADMIN_EMAILS and NGO access
 * from an *approved* NGO record in Mongo (so suspending an NGO takes effect within the cache TTL).
 */
export async function getIdentity(): Promise<Identity | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return cached(identityKey(userId), 60, () => loadIdentity(userId));
}

async function loadIdentity(userId: string): Promise<Identity> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = (user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || "").toLowerCase();
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "Citizen";

  if (email && superadminEmails().includes(email)) {
    return { userId, name, email, role: "superadmin" };
  }

  await connectDB();
  const ngo = await Ngo.findOne({ userId, status: "approved" }, { ngoName: 1, isAccepting: 1 }).lean();
  if (ngo) {
    return {
      userId,
      name,
      email,
      role: "ngo",
      ngo: { id: String(ngo._id), ngoName: ngo.ngoName, isAccepting: ngo.isAccepting !== false },
    };
  }
  return { userId, name, email, role: "citizen" };
}

export const identityKey = (userId: string) => `identity:${userId}`;

export async function invalidateIdentity(userId: string) {
  await invalidate(identityKey(userId));
}
