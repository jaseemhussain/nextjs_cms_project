import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Allow network IP access in development (same machine, different browser source)
  allowedDevOrigins: ["192.168.6.137"],
};

export default nextConfig;
