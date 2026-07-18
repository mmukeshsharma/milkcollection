import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  ...(process.env.STATIC_EXPORT === 'true' ? {
    output: 'export',
    images: { unoptimized: true }
  } : {})
};

export default nextConfig;
