/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["country-state-city"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [
      "localhost",
      "centre-research.com",
      "images.unsplash.com",
      "kosmetista.in",
      "via.placeholder.com",
      "peptide.stmin.dev",
      "peptide-bucket.s3.ap-south-1.amazonaws.com"
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api",
  },
  output: "standalone", // Enable standalone builds for Docker
};

module.exports = nextConfig;
