import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
    "127.0.0.1",
    "localhost",
  ],
  // @adgenie/core ships raw TypeScript — Turbopack transpiles it in place.
  transpilePackages: ["@adgenie/core", "framer-motion"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
    qualities: [75, 85],
    minimumCacheTTL: 60 * 60,
  },
  // The API lives on another host (Render) but the session cookie must stay
  // first-party, so the browser only ever calls /api/v1 on this origin and the
  // proxy forwards it. API_ORIGIN is server-only and never ships to the client.
  async rewrites() {
    const origin = process.env.API_ORIGIN?.replace(/\/+$/, "");
    return origin
      ? [{ source: "/api/v1/:path*", destination: `${origin}/api/v1/:path*` }]
      : [];
  },
};

export default withNextIntl(nextConfig);
