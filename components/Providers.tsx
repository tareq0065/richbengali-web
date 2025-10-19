"use client";
import { Provider } from "react-redux";
import { store } from "@/store";
import { HeroUIProvider } from "@heroui/react";
import { ToastProvider } from "@heroui/toast";
import { Suspense } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
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
