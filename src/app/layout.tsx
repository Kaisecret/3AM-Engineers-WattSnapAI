import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WattSnap - Your Home Electricity Assistant",
  applicationName: "WattSnap",
  manifest: "/manifest.webmanifest",
  description: "Understand your bills. Save energy. Be ready for brownouts. WattSnap brings bill scanning, appliance estimation, and provider outage advisories into one friendly app.",
  icons: {
    icon: { url: "/assets/branding/wattsnap-logo9.png", type: "image/png" },
    shortcut: "/assets/branding/wattsnap-icon-192.png",
    apple: { url: "/assets/branding/wattsnap-apple-icon-180.png", sizes: "180x180", type: "image/png" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0284c7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
