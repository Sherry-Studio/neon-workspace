import type { NextConfig } from "next";

const backendHost = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api",
    );
  } catch {
    return new URL("http://localhost:4000/api");
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: backendHost.protocol.replace(":", "") as "http" | "https",
        hostname: backendHost.hostname,
        port: backendHost.port || undefined,
        pathname: "/uploads/**",
      },
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "**.amazonaws.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
