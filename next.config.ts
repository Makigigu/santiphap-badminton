import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ตั้งค่าเดิม (รองรับรูปสลิปขนาดใหญ่)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', 
    },
  },

  eslint: {
    ignoreDuringBuilds: true, // ปิดการเช็ค ESLint
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;