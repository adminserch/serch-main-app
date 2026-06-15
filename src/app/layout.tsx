import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Serch - Find. Book. Trust.",
  description: "Curated local services marketplace for cleaning, repair, and renovations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased">
        <head>
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossOrigin=""
          />
        </head>
        <body className="min-h-full flex flex-col bg-background text-foreground">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
