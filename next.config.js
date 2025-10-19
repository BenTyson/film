/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure allowed image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '/**',
      },
    ],
  },
  // Ensure proper module resolution for Clerk and Svix
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('svix');
    }
    return config;
  },
  // Allow experimental features for better compatibility
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
