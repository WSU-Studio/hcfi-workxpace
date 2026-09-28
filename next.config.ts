import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default clone limit is 10MB. Supporting-document uploads allow 50MB.
    middlewareClientMaxBodySize: '50mb',
  },
};

export default nextConfig;
