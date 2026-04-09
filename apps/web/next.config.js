/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '83.136.254.152'],
    },
  },
  images: {
    remotePatterns: [],
  },
};

module.exports = nextConfig;
