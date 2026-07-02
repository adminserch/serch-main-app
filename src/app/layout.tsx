import Providers from "@/components/Providers";
import ConsentBanner from "@/components/ConsentBanner";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Serch - Find Trusted Services Near You — Fast",
  description: "Curated local services marketplace for cleaning, repair, and renovations.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased" suppressHydrationWarning>
        <head>
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossOrigin=""
          />
        </head>
        <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
          <Providers>{children}</Providers>
          <ConsentBanner />
        </body>
      </html>
    </ClerkProvider>
  );
}

