import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "access_token";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * Sliding sessions (with POST /auth/refresh on the API): once the cookie has
 * burned past half its life, renew it before rendering, so anyone using the app
 * more often than every ~3 days is never bounced to sign-in. Inactive sessions
 * still die 7 days (plus the API's 24h renewal grace) after the last visit.
 */
const RENEW_WHEN_LEFT_MS = 3.5 * 24 * 60 * 60 * 1000;

function lifetimeLeftMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const bytes = Uint8Array.from(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 - Date.now() : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.next();

  const left = lifetimeLeftMs(token);
  // Unreadable payload or plenty of life left: straight through, no API hop.
  if (left === null || left >= RENEW_WHEN_LEFT_MS) return NextResponse.next();

  // Middleware runs server-side, so it can reach the API directly instead of
  // hopping back through this app's own rewrite.
  const origin = process.env.API_ORIGIN?.replace(/\/+$/, "");
  const apiBase = origin
    ? `${origin}/api/v1`
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1");

  try {
    const res = await fetch(`${apiBase}/auth/refresh`, {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    if (!res.ok) return NextResponse.next();

    const fresh = /access_token=([^;]+)/.exec(res.headers.get("set-cookie") ?? "")?.[1];
    if (!fresh) return NextResponse.next();

    // Swap the token into the forwarded cookie header so this very render
    // already sees the renewed session, then hand the fresh cookie to the
    // browser on the way out.
    const parts = request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .filter((part) => part && part.split("=")[0].trim() !== SESSION_COOKIE);
    parts?.push(`${SESSION_COOKIE}=${fresh}`);
    const headers = new Headers(request.headers);
    headers.set("cookie", parts?.join("; ") ?? `${SESSION_COOKIE}=${fresh}`);

    const response = NextResponse.next({ request: { headers } });
    response.cookies.set(SESSION_COOKIE, fresh, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch {
    // A refresh hiccup must never take a page down; the old token still works
    // and the next navigation tries again.
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/create/:path*",
    "/calendar/:path*",
    "/library/:path*",
    "/credits/:path*",
    "/settings/:path*",
    "/verify/:path*",
    "/campaigns/:path*",
    "/notifications/:path*",
    "/admin/:path*",
  ],
};
