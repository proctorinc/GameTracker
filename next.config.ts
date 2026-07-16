import type { NextConfig } from "next";
import { resolveAppEnv, validateEnv } from "./src/lib/env-config";

const appEnv = resolveAppEnv();

/** Dev/test: validate early. Production: validated at server runtime (instrumentation). */
const validated = appEnv !== "production" ? validateEnv(true) : null;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  env: {
    NEXT_PUBLIC_APP_ENV:
      validated && "NEXT_PUBLIC_APP_ENV" in validated
        ? validated.NEXT_PUBLIC_APP_ENV
        : (process.env.NEXT_PUBLIC_APP_ENV ?? appEnv),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
