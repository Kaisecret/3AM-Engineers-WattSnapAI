import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { siteDescription, siteTitle, siteUrl } from "@/lib/site";
import "./globals.css";
import "@/features/onboarding/theme.css";
import { ThemeSupport } from "@/features/onboarding/components/ThemeSupport";
import OfflineSupport from "@/components/OfflineSupport";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteTitle, template: "%s | WattSnap AI" },
  applicationName: "WattSnap",
  manifest: "/manifest.webmanifest",
  description: siteDescription,
  icons: {
    icon: { url: "/assets/branding/wattsnap-favicon-32.png", sizes: "32x32", type: "image/png" },
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
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <body><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('wattsnap-theme-v1')==='dark'?'dark':'light'}catch{}" }} /><ThemeSupport /><OfflineSupport />{children}</body>
    </html>
  );
}
