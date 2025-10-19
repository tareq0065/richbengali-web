import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
const COOKIE_NAME = "token";

export async function POST(req: NextRequest) {
  const { email, password, next } = await req.json();

  // call your backend to authenticate
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    return NextResponse.json(err || { message: "Login failed" }, { status: resp.status });
  }

  const data = await resp.json(); // must include { token }
  const token: string = data?.token;
  if (!token) {
    return NextResponse.json({ message: "No token returned" }, { status: 500 });
  }

  // set HttpOnly cookie on SAME origin
  const res = NextResponse.json({ ok: true, token });
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // optional: send where to go next (client can redirect)
  res.headers.set("x-redirect-to", next || "/home");
  return res;
}
