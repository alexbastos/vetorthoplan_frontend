import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { appVersion } from "./src/lib/app-version";

import {
  copySecurityHeaders,
  createGlobalSecurityHeaders,
  GOOGLE_POPUP_SECURITY_HEADERS,
  SENSITIVE_ROUTE_HEADERS,
} from "./security-headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const isStandaloneBuild = process.env.NEXT_STANDALONE === "true";
const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: isStandaloneBuild ? "standalone" : undefined,
  transpilePackages: ["@vetorthoplan/api-client"],
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...createGlobalSecurityHeaders(isProduction), { key: "X-App-Version", value: appVersion }],
      },
      {
        source: "/login",
        headers: copySecurityHeaders(GOOGLE_POPUP_SECURITY_HEADERS),
      },
      {
        source: "/register",
        headers: copySecurityHeaders(GOOGLE_POPUP_SECURITY_HEADERS),
      },
      {
        source: "/api/:path*",
        headers: copySecurityHeaders(SENSITIVE_ROUTE_HEADERS),
      },
      {
        source: "/app/:path*",
        headers: copySecurityHeaders(SENSITIVE_ROUTE_HEADERS),
      },
      {
        source: "/oauth/:path*",
        headers: copySecurityHeaders(SENSITIVE_ROUTE_HEADERS),
      },
      {
        source: "/reset-password",
        headers: copySecurityHeaders(SENSITIVE_ROUTE_HEADERS),
      },
      {
        source: "/verify-email",
        headers: copySecurityHeaders(SENSITIVE_ROUTE_HEADERS),
      },
    ];
  },
};

export default withNextIntl(nextConfig);
