import { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://your-domain.vercel.app';
  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/compare`, lastModified: new Date() },
    { url: `${base}/u/190150`, lastModified: new Date() },
    { url: `${base}/u/199120`, lastModified: new Date() },
    { url: `${base}/u/166027`, lastModified: new Date() },
  ];
}
