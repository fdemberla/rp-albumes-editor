import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  eslint: {
    // Pre-existing lint issues in legacy components — run `npm run lint` separately
    ignoreDuringBuilds: true,
  },
  // Ensure static export for Electron
  distDir: ".next",
};

export default nextConfig;
