import type { NextConfig } from 'next'

const storage = process.env.NEXT_PUBLIC_SUPABASE_URL
const nextConfig: NextConfig = {
  transpilePackages: ['mafs'],
  images: {
    deviceSizes: [320, 640, 960, 1280, 1600, 2000, 2400],
    formats: ['image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: storage ? [{ protocol: 'https', hostname: new URL(storage).hostname, port: '', pathname: '/storage/v1/object/public/lesson-images/**' }] : [],
  },
}
export default nextConfig
