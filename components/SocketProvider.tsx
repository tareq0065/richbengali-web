"use client";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

export function SocketNotifications() {
  useEffect(() => {
    const s = getSocket() as Socket | null;
    if (!s) return;

    const handler = (evt: any) => {
      if (evt?.type === "message") {
        // TODO: toast/badge/dispatch here
      }
    };

    s.on("notification:new", handler);

    // IMPORTANT: return void, not the Socket
    return () => {
      s.off("notification:new", handler);
    };
  }, []);

  return null;
}
