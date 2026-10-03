import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WattSnap AI - Your Home Electricity Assistant",
    short_name: "WattSnap",
    description: "Understand your bills. Save energy. Be ready for brownouts.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fbff",
    theme_color: "#0284c7",
    icons: [
      {
        src: "/assets/branding/wattsnap-logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/assets/branding/wattsnap-mascot.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
