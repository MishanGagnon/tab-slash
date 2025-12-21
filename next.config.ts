import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "knowing-cormorant-599.convex.cloud",
      },
      {
        protocol: "https",
        hostname: "laudable-beagle-915.convex.cloud",
      },
    ],
  },
};

export default nextConfig;
