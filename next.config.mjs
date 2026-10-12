/**
 * Next.js 14 config.
 * NOTE: next.config.ts is only supported from Next 15 onward, so this
 * project uses next.config.mjs — same options, same behavior.
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
