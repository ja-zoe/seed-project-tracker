/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma's generated client must stay external to the server bundle.
  serverExternalPackages: ["@prisma/client", "@auth/prisma-adapter"],
};

export default nextConfig;
