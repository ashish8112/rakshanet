/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // When running locally without a real MongoDB URI, proxy /api to the live Vercel backend
    if (!process.env.VERCEL && (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes("USER:PASSWORD@CLUSTER"))) {
      return {
        beforeFiles: [
          {
            source: "/api/:path*",
            destination: "https://rakshanet-three.vercel.app/api/:path*",
          },
        ],
      };
    }
    return [];
  },
};

export default nextConfig;
