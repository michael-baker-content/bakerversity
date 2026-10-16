import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Routes that do NOT require authentication
const isPublicRoute = createRouteMatcher([
  '/about',
  '/help',
  '/contact',
  '/privacy',
  '/materials',
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
