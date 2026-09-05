import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Not required for JS imports, but Vercel's serverless bundler only includes files
  // it can trace from code — this file is only ever touched via fs.copyFileSync, so
  // it must be listed explicitly to end up in the deployed function.
  outputFileTracingIncludes: {
    "/**": ["./prisma/seed-empty.db"],
  },
};

export default nextConfig;
