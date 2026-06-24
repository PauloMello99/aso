/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16.2.7 + Turbopack dev: the static-route indicator's HMR handler
  // (handleStaticIndicator) throws on every `isrManifest` websocket message,
  // which breaks client hydration of dynamic routes (pages stuck on loaders).
  // Disabling the dev indicator removes that crashing code path.
  devIndicators: false,
};

export default nextConfig;
