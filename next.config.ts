import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["pdf-parse", "mammoth"],
};
export default nextConfig;
