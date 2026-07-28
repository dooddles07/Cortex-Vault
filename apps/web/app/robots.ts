import type { MetadataRoute } from "next";

const SITE_URL = "https://cortex-vault-web.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/chat", "/dashboard", "/search", "/settings", "/vault"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
