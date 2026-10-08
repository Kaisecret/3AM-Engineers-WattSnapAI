import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WattSnap AI - Your Home Electricity Assistant",
    short_name: "WattSnap",
    description: "Understand your bills. Save energy. Be ready for brownouts.",
    id: "/",
    start_url: "/welcome",
    scope: "/",
    display: "standalone",
    background_color: "#f8fbff",
    theme_color: "#0284c7",
    icons: [
      {
        src: "/assets/branding/wattsnap-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/assets/branding/wattsnap-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/assets/branding/wattsnap-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
