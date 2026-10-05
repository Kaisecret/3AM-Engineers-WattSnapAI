import type { Viewport } from "next";

// Phone keyboards should shrink the page instead of covering the form, so every
// field and button can still be scrolled into view while typing (Android Chrome).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0284c7",
  interactiveWidget: "resizes-content",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
