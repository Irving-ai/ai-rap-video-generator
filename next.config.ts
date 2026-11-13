import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Keep this package independent even when its directory is inside another repo.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
