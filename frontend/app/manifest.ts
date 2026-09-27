import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Moneyfi | Your money, in bloom",
    short_name: "Moneyfi",
    description: "A calm, clear view of your personal finances.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fdfbf7",
    theme_color: "#5d8768",
    icons: [
      { src: "/icons/moneyfi-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/moneyfi-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/moneyfi-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}