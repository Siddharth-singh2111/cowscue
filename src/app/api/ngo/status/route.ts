// src/app/api/ngo/status/route.ts
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { ngoStatusSchema } from "@/lib/validations";

export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth("ngo");
    if (isAuthError(auth)) return auth;
    const { user } = auth;

    const body = await req.json();
    const parsed = ngoStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { isAccepting } = parsed.data;

    const client = await clerkClient();
    await client.users.updateUserMetadata(user.id, {
      publicMetadata: {
        isAcceptingRescues: isAccepting,
      },
    });

    return NextResponse.json({ success: true, isAccepting }, { status: 200 });
  } catch (error) {
    console.error("Error updating NGO status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}