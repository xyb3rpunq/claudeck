import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Dashboard berisi percakapan pribadi, dan endpoint API tidak ada
      // gunanya diindeks.
      disallow: ["/dashboard/", "/api/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
