import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import NgoApplication from "@/models/NgoApplication";
import { requireAuth, isAuthError } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * POST /api/admin/applications/[id]/approve
 * Approves an NGO application:
 * 1. Sets the applicant's Clerk role to "ngo"
 * 2. Updates the application status in MongoDB to "approved"
 */
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth("superadmin");
    if (isAuthError(auth)) return auth;

    const params = await props.params;
    await connectDB();

    // Find the application
    const application = await NgoApplication.findById(params.id);
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (application.status === "approved") {
      return NextResponse.json({ error: "Already approved." }, { status: 400 });
    }

    // Set the user's Clerk role to "ngo"
    const client = await clerkClient();
    await client.users.updateUserMetadata(application.userId, {
      publicMetadata: {
        role: "ngo",
        ngoName: application.ngoName,
      },
    });

    // Update application status in MongoDB
    application.status = "approved";
    await application.save();

    return NextResponse.json(
      { success: true, message: `${application.ngoName} has been approved as an NGO partner.` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Approve Error:", error);
    return NextResponse.json({ error: "Failed to approve application." }, { status: 500 });
  }
}
