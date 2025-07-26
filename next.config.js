/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // disabling strict mode since the examples use
  // useEffect with no dependencies to ensure the function
  // is only run once and only run on the client.
  reactStrictMode: false,
  swcMinify: true,
  images: {
    dangerouslyAllowSVG: true,
    domains: ['static.ably.dev'],
  },
  experimental: {
    serverComponentsExternalPackages: ['ably'],
  },
  webpack: (config) => {
    // This ensures that path aliases from tsconfig.json are respected
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/components': path.resolve(__dirname, 'components'),
      '@/app': path.resolve(__dirname, 'app'),
      '@/styles': path.resolve(__dirname, 'styles'),
    };
    return config;
  },
};

module.exports = nextConfig;
