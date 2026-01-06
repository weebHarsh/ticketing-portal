import { type NextRequest, NextResponse } from "next/server"

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const user = request.cookies.get("user")?.value

  // If user is logged in and trying to access login/signup, redirect to dashboard
  if (user && (pathname === "/" || pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // If user is not logged in and trying to access protected routes, redirect to login
  if (
    !user &&
    ["/dashboard", "/tickets", "/analytics", "/teams", "/masters", "/settings", "/master-data", "/admin"].some((route) =>
      pathname.startsWith(route),
    )
  ) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/dashboard/:path*",
    "/tickets/:path*",
    "/analytics/:path*",
    "/teams/:path*",
    "/masters/:path*",
    "/settings/:path*",
    "/master-data/:path*",
    "/admin/:path*",
  ],
}
