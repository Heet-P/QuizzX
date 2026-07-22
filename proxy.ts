import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16 renamed "middleware" to "proxy" (file + export name), see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
//
// This only establishes Clerk's auth context for the request (so `auth()`/
// `currentUser()` work in Server Components, Route Handlers, and Server
// Actions) — it does not enforce anything itself. Clerk's own
// `createRouteMatcher` + proxy-level `auth.protect()` pattern is deprecated
// in this SDK version in favor of resource-based checks (see
// node_modules/@clerk/nextjs/dist/types/server/routeMatcher.d.ts), which also
// matches Next's own auth guide recommendation to keep real authorization
// close to the data rather than centralized in path-matching middleware.
// Every protected layout/page/Route Handler/Server Action verifies its own
// session — see app/(protected)/layout.tsx for the "must be signed in" check
// that replaces the old client-side <ProtectedRoute>.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Run on everything except static assets and image optimization —
    // Route Handlers under /api need Clerk's context too, so they're not excluded.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
