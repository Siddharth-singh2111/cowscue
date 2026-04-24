import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import NgoApplication from "@/models/NgoApplication";
import { requireAuth, isAuthError } from "@/lib/auth";
import { ngoApplicationSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { user } = auth;

    // Validate request body
    const body = await req.json();
    const parsed = ngoApplicationSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    await connectDB();

    // Prevent duplicate applications
    const existingApp = await NgoApplication.findOne({ userId: user.id });
    if (existingApp) {
      return NextResponse.json(
        { error: "You have already submitted an application. It is currently under review." },
        { status: 400 }
      );
    }

    // Create the application with validated, whitelisted fields only
    const newApplication = await NgoApplication.create({
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress || "No email provided",
      ...parsed.data,
    });

    return NextResponse.json(
      { success: true, message: "Application submitted successfully!" },
      { status: 201 }
    );
  } catch (error) {
    console.error("NGO Application Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}