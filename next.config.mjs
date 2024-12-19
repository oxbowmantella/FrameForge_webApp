/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // This disables strict mode
  images: {
    domains: ["cdna.pcpartpicker.com", "m.media-amazon.com"], // Add the domain here
  },
};

export default nextConfig;
