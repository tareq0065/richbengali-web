import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "k53dating.s3.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
