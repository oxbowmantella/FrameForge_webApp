/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // This disables strict mode
  images: {
    domains: [
      "cdna.pcpartpicker.com",
      "m.media-amazon.com",
      "images-na.ssl-images-amazon.com",
      "images-eu.ssl-images-amazon.com",
      "images-fe.ssl-images-amazon.com",
    ], // Add the domain here
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
