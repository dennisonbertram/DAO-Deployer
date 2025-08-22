/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  webpack: (config) => {
    // Necessary fallbacks for wagmi/viem compatibility
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  // Enable SWC minification for better performance
  swcMinify: true,
}

module.exports = nextConfig