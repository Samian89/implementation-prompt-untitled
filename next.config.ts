import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Parent /app lockfiles otherwise make Next pick the wrong workspace root.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname)
  },
  experimental: {
    // Enables forbidden() / unauthorized() so role gates can return a real 403
    // instead of throwing into the generic error boundary. app/forbidden.tsx
    // renders the response. Required by lib/roles.ts when the auth pack is
    // composed; inert when it is not.
    authInterrupts: true
  }
};

export default nextConfig;
