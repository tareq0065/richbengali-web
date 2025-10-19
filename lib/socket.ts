import { io, Socket } from "socket.io-client";
import { getToken, getUserIdFromToken } from "./auth";
let socket: Socket | null = null;
export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  if (socket) return socket;
  const token = getToken();
  const userId = getUserIdFromToken(token);
  if (!userId) return null;
  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL as string, { auth: { userId } });
  return socket;
}
export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
