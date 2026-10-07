import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // The public landing page is searchable. Account and household previews are noindex.
  return [{ url: `${siteUrl}/` }];
}
