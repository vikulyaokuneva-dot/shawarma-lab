import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Placeholder files in /public/images may be SVG until real photos land.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy:
      "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
