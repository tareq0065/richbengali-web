"use client";

import { ReactNode, Suspense, useEffect, useRef, useState } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { HeroUIProvider } from "@heroui/react";
import { ToastProvider } from "@heroui/toast";

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return null;

      const reg =
        (await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js")) ||
        (await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" }));
    })();
  }, []);

  return (
    <Suspense>
      <Provider store={store}>
        <ToastProvider
          toastProps={{
            color: "primary",
            variant: "flat",
            timeout: 4000,
          }}
        />
        <HeroUIProvider>{children}</HeroUIProvider>
      </Provider>
    </Suspense>
  );
}
