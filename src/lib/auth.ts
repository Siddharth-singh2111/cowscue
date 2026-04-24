import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type Role = "ngo" | "superadmin";

interface AuthResult {
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>;
  role: string | undefined;
}

/**
 * List of superadmin emails.
 * Set SUPERADMIN_EMAILS in .env.local as a comma-separated list.
 * Example: SUPERADMIN_EMAILS=sahil@gmail.com,admin@cowscue.com
 */
function getSuperadminEmails(): string[] {
  const raw = process.env.SUPERADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks if a user is a superadmin by email match.
 */
function isSuperadmin(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>): boolean {
  const adminEmails = getSuperadminEmails();
  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  return adminEmails.includes(userEmail || "");
}

/**
 * Authenticates and optionally authorizes a user by role.
 * Returns { user, role } on success, or a NextResponse error on failure.
 *
 * Superadmin is determined by email match against SUPERADMIN_EMAILS env var.
 * NGO role is determined by Clerk publicMetadata.role === "ngo".
 */
export async function requireAuth(
  requiredRole?: Role | Role[]
): Promise<AuthResult | NextResponse> {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  // Determine the user's effective role
  let role = user.publicMetadata?.role as string | undefined;

  // Override: check if user is a superadmin by email
  if (isSuperadmin(user)) {
    role = "superadmin";
  }

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!role || !allowedRoles.includes(role as Role)) {
      return NextResponse.json(
        { error: "Forbidden. You do not have permission to perform this action." },
        { status: 403 }
      );
    }
  }

  return { user, role };
}

/**
 * Type guard to check if the auth result is an error response.
 */
export function isAuthError(
  result: AuthResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Utility to check superadmin status (for client-side use via API).
 */
export { isSuperadmin };
