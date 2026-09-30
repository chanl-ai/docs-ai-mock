import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // The dev-tools bubble sits over the bottom-left of every screenshot.
  devIndicators: false,
};

export default nextConfig;
