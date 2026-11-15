/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Next.js application configuration with standalone output enabled for Docker and Railway deployments.
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
