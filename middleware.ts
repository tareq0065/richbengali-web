// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// IMPORTANT: make sure this is actually set in your deployment env (Edge envs too)
const JWT_SECRET_STR = process.env.JWT_SECRET || "";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STR);

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/forgot"]);
const COOKIE_NAME = "token";

async function isValid(token?: string) {
  if (!token || !JWT_SECRET_STR) return false;
  try {
    await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // 1) Ignore assets, api, and SW/metadata files up front
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets") ||
    pathname === "/firebase-messaging-sw.js" ||
    pathname === "/site.webmanifest" ||
    pathname === "/manifest.json" ||
    pathname === "/robots.txt" ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf|map)$/)
  ) {
    return NextResponse.next();
  }

  const isPublic =
    PUBLIC_PATHS.has(pathname) ||
    // also treat nested public pages like /login/xyz as public
    [...PUBLIC_PATHS].some((p) => p !== "/" && pathname.startsWith(p + "/"));

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const authed = await isValid(token);

  // 2) If not authed and not public → send to /
  if (!authed && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    // preserve intended destination so we can bounce back after login
    url.searchParams.set("next", pathname + (req.nextUrl.search || ""));
    return NextResponse.redirect(url);
  }

  // 3) If authed and currently on a public page → go to next or /home
  if (authed && isPublic) {
    const nextParam = searchParams.get("next");
    const dest = nextParam && nextParam.startsWith("/") ? nextParam : "/home";
    // avoid redirect churn if we’re already at dest
    if (pathname !== dest) {
      const url = req.nextUrl.clone();
      url.search = ""; // clear ?next
      url.pathname = dest;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // run on everything except static files (extra guard already in code)
  matcher: ["/((?!_next|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf|map)$).*)"],
};
