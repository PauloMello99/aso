import { withBetterStack } from "@logtail/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
};

export default withBetterStack(nextConfig);
