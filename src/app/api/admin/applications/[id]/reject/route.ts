import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import NgoApplication from "@/models/NgoApplication";
import { requireAuth, isAuthError } from "@/lib/auth";

/**
 * POST /api/admin/applications/[id]/reject
 * Rejects an NGO application:
 * Updates the application status in MongoDB to "rejected"
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

    const application = await NgoApplication.findById(params.id);
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (application.status === "rejected") {
      return NextResponse.json({ error: "Already rejected." }, { status: 400 });
    }

    application.status = "rejected";
    await application.save();

    return NextResponse.json(
      { success: true, message: `${application.ngoName} has been rejected.` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reject Error:", error);
    return NextResponse.json({ error: "Failed to reject application." }, { status: 500 });
  }
}
