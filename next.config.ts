import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // เพิ่มขีดจำกัดขนาดข้อมูลเป็น 10MB (รองรับรูปสลิปขนาดใหญ่)
    },
  },
};

export default nextConfig;