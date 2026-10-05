import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
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
