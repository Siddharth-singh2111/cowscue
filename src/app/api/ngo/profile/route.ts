import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import NgoApplication from "@/models/NgoApplication";
import { requireAuth, isAuthError } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * GET /api/ngo/profile
 * Retrieves the profile of the currently logged-in NGO.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAuth("ngo");
    if (isAuthError(auth)) return auth;
    const { user } = auth;

    await connectDB();

    const ngo = await NgoApplication.findOne({
      userId: user.id,
      status: "approved",
    });

    if (!ngo) {
      return NextResponse.json(
        { error: "Approved NGO profile not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ngo }, { status: 200 });
  } catch (error) {
    console.error("GET NGO Profile Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ngo/profile
 * Updates the approved NGO's details (branding name, phone, address, and geofencing configurations).
 */
export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth("ngo");
    if (isAuthError(auth)) return auth;
    const { user } = auth;

    const body = await req.json();
    const { ngoName, phone, address, operatingLatitude, operatingLongitude, operatingRadius } = body;

    // Validation
    if (!ngoName || typeof ngoName !== "string" || ngoName.trim().length === 0) {
      return NextResponse.json({ error: "NGO Name is required." }, { status: 400 });
    }
    if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
      return NextResponse.json({ error: "Contact phone number is required." }, { status: 400 });
    }
    if (!address || typeof address !== "string" || address.trim().length === 0) {
      return NextResponse.json({ error: "Office address is required." }, { status: 400 });
    }
    if (operatingLatitude != null && typeof operatingLatitude !== "number") {
      return NextResponse.json({ error: "Latitude must be a valid number." }, { status: 400 });
    }
    if (operatingLongitude != null && typeof operatingLongitude !== "number") {
      return NextResponse.json({ error: "Longitude must be a valid number." }, { status: 400 });
    }
    if (operatingRadius != null && (typeof operatingRadius !== "number" || operatingRadius <= 0)) {
      return NextResponse.json({ error: "Operating radius must be a positive number." }, { status: 400 });
    }

    await connectDB();

    const updatedNgo = await NgoApplication.findOneAndUpdate(
      { userId: user.id, status: "approved" },
      {
        ngoName: ngoName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        operatingLatitude,
        operatingLongitude,
        operatingRadius,
      },
      { new: true }
    );

    if (!updatedNgo) {
      return NextResponse.json(
        { error: "Approved NGO profile not found." },
        { status: 404 }
      );
    }

    // Sync the updated NGO name to Clerk public metadata
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ngoName: updatedNgo.ngoName,
        },
      });
    } catch (clerkError) {
      console.error("Failed to sync NGO Name to Clerk metadata:", clerkError);
    }

    return NextResponse.json(
      { message: "NGO profile updated successfully.", ngo: updatedNgo },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH NGO Profile Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
