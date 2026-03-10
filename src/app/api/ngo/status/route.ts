// src/app/api/ngo/status/route.ts
import { NextResponse } from "next/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";

export async function PATCH(req: Request) {
  try {
    const user = await currentUser();
    
    if (!user || user.publicMetadata?.role !== "ngo") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isAccepting } = await req.json();


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