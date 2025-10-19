import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot"];
const COOKIE_NAME = "token";
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

async function isValid(token?: string) {
  if (!token) return false;
  try {
    await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const authed = await isValid(token);

  // static & next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  if (!authed && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    // set ?next only when redirecting to login
    url.searchParams.set("next", pathname + (req.nextUrl.search || ""));
    return NextResponse.redirect(url);
  }

  if (authed && isPublic) {
    // redirect away from public pages after login
    const nextParam = searchParams.get("next");
    const dest = nextParam && nextParam.startsWith("/") ? nextParam : "/home";
    const url = req.nextUrl.clone();
    url.search = ""; // strip ?next=
    url.pathname = dest;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};
