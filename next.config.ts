import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright", "playwright-core", "sharp", "@sparticuz/chromium-min"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    outputFileTracingIncludes: {
      "/**": [
        "./node_modules/@sparticuz/chromium-min/**",
        "./node_modules/playwright-core/**",
      ],
    },
  } as any,
};

export default nextConfig;
