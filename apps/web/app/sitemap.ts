import type { MetadataRoute } from "next";

const SITE_URL = "https://cortex-vault-web.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/sign-in", "/sign-up"];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }));
}
