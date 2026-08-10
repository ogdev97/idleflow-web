import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray package-lock.json in a parent dir would
  // otherwise make Turbopack guess the wrong root (and warn on Vercel).
  turbopack: { root: __dirname },
};

export default nextConfig;
