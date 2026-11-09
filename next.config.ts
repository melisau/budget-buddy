import type { NextConfig } from "next";

// Security headers for every response. The CSP below only restricts what is
// safe to restrict without a nonce setup: the site cannot be framed, plugins
// are off, and <base> cannot be changed. Microphone and camera stay allowed
// for this site only (voice input, receipt photos).
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; upgrade-insecure-requests" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
