import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Treino A/B",
    short_name: "Treino A/B",
    start_url: "/",
    display: "standalone",
    background_color: "#101024",
    theme_color: "#101024",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
    ],
  };
}
