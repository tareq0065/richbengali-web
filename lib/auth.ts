export async function logout() {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include", // allows sending cookies
    });
  } catch (e) {
    console.error("Logout failed:", e);
  } finally {
    // Just in case any client copies exist
    if (typeof window !== "undefined") localStorage.removeItem("token");
  }
}

export function saveToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem("token", token);
}
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}
export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem("token");
}
export function getUserIdFromToken(token: string | null): string | null {
  try {
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id || null;
  } catch {
    return null;
  }
}
