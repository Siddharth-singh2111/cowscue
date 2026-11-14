import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk session handling at the edge. Authorisation itself happens in each route handler
 * (src/server/http/route.ts) against server-side roles, so this stays deliberately thin.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
