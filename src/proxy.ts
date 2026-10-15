import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// This file is named proxy.ts — required by Next.js 16+
// (previously middleware.ts — same API, just renamed)

// Routes that do NOT require authentication
const isPublicRoute = createRouteMatcher([
  '/about',
  '/',                    // marketing homepage
  '/courses(.*)',         // course catalogue and preview pages
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',   // Clerk + Stripe webhooks must be reachable without auth
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Run middleware on all routes except Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
