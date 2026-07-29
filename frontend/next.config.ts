import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin(
  "./src/i18n/request.ts",
);

function parseAllowedDevOrigins(value: string | undefined) {
  return (
    value
      ?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []
  );
}

const nextConfig: NextConfig = {
  allowedDevOrigins: parseAllowedDevOrigins(
    process.env.TEED_ALLOWED_DEV_ORIGINS,
  ),
};

export default withNextIntl(nextConfig);