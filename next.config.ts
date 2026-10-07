import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: {
    // Fill gaps in Next's defaults so phone artwork does not jump to 640/1080px.
    deviceSizes: [480, 640, 750, 828, 960, 1080, 1200, 1920, 2048, 3840],
  },
  // Keep production builds from replacing assets served by a running dev server.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  webpack(config, { dev, isServer }) {
    if (!dev && !isServer) {
      // Next's client manifest skips concatenated module ID 0.
      // https://github.com/vercel/next.js/issues/97937
      config.optimization.concatenateModules = false;
    }
    return config;
  },
};

export default nextConfig;
