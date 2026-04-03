import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许最大 10MB 请求体，用于处理用户上传的大图
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
