import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      /* tighten later if needed */
    },
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'

    const baseHeaders = [
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '0' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ]

    const scriptSrcDev = ["'self'", "'unsafe-eval'", "'unsafe-inline'", 'blob:', 'data:']
    const scriptSrcProd = ["'self'", "'unsafe-eval'"]
    const connectSrcDev = ["'self'", 'ws:', 'wss:']
    const connectSrcProd = ["'self'"]

    // Default site headers (no embedding allowed)
    const siteHeaders = [
      ...baseHeaders,
      { key: 'X-Frame-Options', value: 'DENY' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          `script-src ${isProd ? scriptSrcProd.join(' ') : scriptSrcDev.join(' ')}`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "font-src 'self' data:",
          `connect-src ${(isProd ? connectSrcProd : connectSrcDev).join(' ')}`,
          "worker-src 'self' blob:",
          'object-src none',
          'base-uri none',
          'frame-ancestors none',
        ].join('; '),
      },
    ]

    // Embed headers (allow framing from anywhere; remove XFO)
    const embedHeaders = [
      ...baseHeaders,
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          `script-src ${isProd ? scriptSrcProd.join(' ') : scriptSrcDev.join(' ')}`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "font-src 'self' data:",
          `connect-src ${(isProd ? connectSrcProd : connectSrcDev).join(' ')}`,
          "worker-src 'self' blob:",
          'object-src none',
          'base-uri none',
          'frame-ancestors *',
        ].join('; '),
      },
    ]

    return [
      { source: '/embed/(.*)', headers: embedHeaders },
      { source: '/(.*)', headers: siteHeaders },
    ]
  },
  // Use Turbopack configuration instead of webpack
  turbopack: {
    resolveAlias: {
      '@': path.resolve(__dirname),
    },
  },
}

export default nextConfig
