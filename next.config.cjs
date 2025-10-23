const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ['*'] } },
  webpack: (config) => {
    // Hard alias '@' to project root to ensure consistent resolution on Vercel
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
    }
    return config
  },
}

module.exports = nextConfig
