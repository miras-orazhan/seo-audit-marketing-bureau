import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone убран — next start сам раздаёт public/ и static/
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
