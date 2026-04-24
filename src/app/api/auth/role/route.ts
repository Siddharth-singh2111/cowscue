import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

/**
 * GET /api/auth/role
 * Returns the current user's effective role.
 * Used by the frontend to determine navigation and access.
 */
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ role: null }, { status: 401 });
    }

    // Check superadmin by email
    const adminEmails = (process.env.SUPERADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase() || "";

    if (adminEmails.includes(userEmail)) {
      return NextResponse.json({ role: "superadmin" }, { status: 200 });
    }

    // Check NGO role from Clerk metadata
    const role = user.publicMetadata?.role || null;
    return NextResponse.json({ role }, { status: 200 });
  } catch (error) {
    console.error("Role check error:", error);
    return NextResponse.json({ role: null }, { status: 500 });
  }
}
