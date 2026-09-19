/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  typescript: {
    // Allows production builds to successfully complete even if there are type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skips ESLint checks during production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;