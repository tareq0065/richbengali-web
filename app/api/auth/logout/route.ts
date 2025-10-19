import { NextResponse } from "next/server";

const COOKIE_NAME = "token";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // Remove cookie by expiring it
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0), // <-- expire in the past
    maxAge: 0, // <-- double-guarantee
  });
  res.headers.set("x-redirect-to", "/");

  return res;
}
