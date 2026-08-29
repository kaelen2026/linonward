import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  async rewrites() {
    const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(
      /\/+$/,
      "",
    );
    return [
      { source: "/api/auth/:path*", destination: `${apiOrigin}/api/auth/:path*` },
      { source: "/api/content/:path*", destination: `${apiOrigin}/api/content/:path*` },
    ];
  },
};

export default nextConfig;
