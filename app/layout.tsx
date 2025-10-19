import "@/app/globals.css";

import type { Metadata } from "next";
import Header from "@/components/Header";
import Providers from "@/components/Providers";

export const metadata: Metadata = { title: "RichBengali", description: "Discover Your Best Match" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light" suppressHydrationWarning={true}>
      <body className={`antialiased min-h-screen flex flex-col`}>
        <Providers>
          <Header />
          <main className="container mx-auto max-w-5xl min-h-[700px] flex-1 p-4 pb-[100px]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
