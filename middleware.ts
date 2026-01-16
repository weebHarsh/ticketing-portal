import { type NextRequest, NextResponse } from "next/server"

// Security headers for OWASP compliance
const securityHeaders = {
  // Prevent clickjacking attacks
  "X-Frame-Options": "DENY",
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  // Enable XSS protection
  "X-XSS-Protection": "1; mode=block",
  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Permissions policy (formerly Feature-Policy)
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // Content Security Policy - balanced for functionality
  "Content-Security-Policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' https://*.r2.dev https://*.cloudflarestorage.com https://*.neon.tech; " +
    "frame-ancestors 'none';",
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const user = request.cookies.get("user")?.value

  // Create response
  let response: NextResponse

  // If user is logged in and trying to access login/signup, redirect to dashboard
  if (user && (pathname === "/" || pathname === "/login" || pathname === "/signup")) {
    response = NextResponse.redirect(new URL("/dashboard", request.url))
  }
  // If user is not logged in and trying to access protected routes, redirect to login
  else if (
    !user &&
    ["/dashboard", "/tickets", "/analytics", "/teams", "/masters", "/settings", "/master-data", "/admin"].some((route) =>
      pathname.startsWith(route),
    )
  ) {
    response = NextResponse.redirect(new URL("/login", request.url))
  }
  // Continue to the requested page
  else {
    response = NextResponse.next()
  }

  // Apply security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes that don't need auth (but apply security headers)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/cleanup).*)",
  ],
}
