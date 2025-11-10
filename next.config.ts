import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/t/p/**',
      },
    ],
  },

  // Development server optimizations for stability
  experimental: {
    // Reduce memory usage and improve performance
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },

  // Server-side optimizations
  poweredByHeader: false,
  compress: true,

  // File watching optimizations are handled by webpack config

  // Webpack optimizations for development
  webpack: (config, { dev }) => {
    if (dev) {
      // Reduce memory usage in development
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };

      // Limit the number of parallel processes
      config.parallelism = 1;

      // Reduce cache size and improve stability
      config.cache = {
        type: 'filesystem',
        maxMemoryGenerations: 1,
      };
    }

    return config;
  },

  // Runtime configuration for better error handling
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
};

export default nextConfig;
