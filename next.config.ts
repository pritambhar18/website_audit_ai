import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright", "playwright-core", "sharp", "@sparticuz/chromium-min"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    outputFileTracingIncludes: {
      "/api/audit": ["./node_modules/@sparticuz/chromium-min/**/*"],
    },
  } as any,
};

export default nextConfig;
