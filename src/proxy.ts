import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic check on the cookie only; requireSession() does the real validation.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) return NextResponse.redirect(new URL("/sign-in", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|sign-in|_next|favicon.ico).*)"],
};
