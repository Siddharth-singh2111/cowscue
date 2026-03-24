import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import NgoApplication from "@/models/NgoApplication";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();

    // Prevent duplicate applications
    const existingApp = await NgoApplication.findOne({ userId: user.id });
    if (existingApp) {
      return NextResponse.json(
        { error: "You have already submitted an application. It is currently under review." },
        { status: 400 }
      );
    }

    // Create the application
    const newApplication = await NgoApplication.create({
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress || "No email provided",
      ...body,
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