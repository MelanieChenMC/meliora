import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: [
    "/api/health",
    "/api/webhooks/clerk",
  ],
  // Add debug logging
  debug: false,
  // Make sure it handles Bearer tokens properly
  afterAuth(auth, req, evt) {
    // Log auth status for debugging
    console.log('Auth status:', {
      userId: auth.userId,
      sessionId: auth.sessionId,
    //   path: req.nextUrl.pathname,
    //   hasAuth: !!auth.userId
    });
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 