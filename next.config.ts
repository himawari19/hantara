import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Fix for Monaco Editor chunk loading
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
  // Ensure Monaco chunks are properly served
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
