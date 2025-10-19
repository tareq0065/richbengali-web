"use client";

import { useEffect, useRef } from "react";
import { currentPermission } from "@/lib/firebase";

export function useFcmCheckOnly() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      if (currentPermission() !== "granted") return; // check-only (no request)
    })();
  }, []);
}
