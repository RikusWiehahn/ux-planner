import type { NextConfig } from "next";

const nextConfig: NextConfig = {
\toutput: "export",
\ttrailingSlash: true,
\tbasePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
\tassetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
\timages: { unoptimized: true },
};

export default nextConfig;
