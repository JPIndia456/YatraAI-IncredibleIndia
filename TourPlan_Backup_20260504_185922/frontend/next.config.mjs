/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fixes the "Next.js inferred your workspace root" warning
  // by explicitly setting the experimental root if needed, 
  // or just ensuring standard behavior.
  // Next.js 15+ handles this better when config is present.
  experimental: {
    // You can add experimental features here if needed
  },
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
    ],
  },
};

export default nextConfig;
