import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static build: no server needed, so the same output works both as the
  // Vercel-hosted PWA and as the locally bundled app Capacitor loads offline.
  output: "export",
};

export default nextConfig;
