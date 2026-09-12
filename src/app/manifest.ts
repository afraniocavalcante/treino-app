import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Treino A/B",
    short_name: "Treino A/B",
    start_url: "/",
    display: "standalone",
    background_color: "#08080A",
    theme_color: "#08080A",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
    ],
  };
}
