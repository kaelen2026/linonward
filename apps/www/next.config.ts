import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Every page lives under /[locale]; send the bare root at the default one.
  // 307 rather than 308 so the default locale can change without a cached
  // redirect following visitors around.
  redirects() {
    return [{ source: "/", destination: "/zh", permanent: false }];
  },
};

export default nextConfig;
